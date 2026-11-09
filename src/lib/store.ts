import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBatchedStorage } from "@/lib/idb-storage";
import type { Drill, Power, Run } from "@/lib/ipsc/types";
import type { RingSession } from "@/lib/treffpunkt/session";

import { mergeById, serializeBackup, type DiaryData, type Profile } from "@/lib/backup";

export type { DiaryData, Profile };
export { parseBackup } from "@/lib/backup";

export const DEFAULT_PROFILE_ID = "default";
const DEFAULT_PROFILE: Profile = { id: DEFAULT_PROFILE_ID, name: "Meg" };

type DagbokState = DiaryData & {
  activeProfileId: string;
  lastPower: Power;
  /** When the shooter last downloaded or shared a backup. */
  lastBackupAt: string | null;
  markBackedUp: () => void;
  saveDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
  saveRun: (run: Run) => void;
  deleteRun: (id: string) => void;
  saveRingSession: (session: RingSession) => void;
  deleteRingSession: (id: string) => void;
  setLastPower: (power: Power) => void;
  addProfile: (name: string) => string;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  importBackup: (data: DiaryData) => { added: number };
  pruneEmptySessions: () => void;
};

/** Sessions started but never shot in, left behind when someone backs out of the setup. */
const EMPTY_SESSION_GRACE_MS = 30 * 60 * 1000;

function upsert<T extends { id: string }>(list: T[], item: T, prepend = true): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return prepend ? [item, ...list] : [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

const owner = <T extends { profileId?: string }>(item: T) => item.profileId ?? DEFAULT_PROFILE_ID;

export const useFaktor = create<DagbokState>()(
  persist(
    (set, get) => ({
      profiles: [DEFAULT_PROFILE],
      activeProfileId: DEFAULT_PROFILE_ID,
      lastPower: "minor",
      lastBackupAt: null,
      markBackedUp: () => set({ lastBackupAt: new Date().toISOString() }),
      customDrills: [],
      runs: [],
      ringSessions: [],
      saveDrill: (drill) =>
        set((state) => ({
          customDrills: upsert(
            state.customDrills,
            { ...drill, profileId: drill.profileId ?? state.activeProfileId },
            false,
          ),
        })),
      deleteDrill: (id) =>
        set((state) => ({ customDrills: state.customDrills.filter((drill) => drill.id !== id) })),
      saveRun: (run) =>
        set((state) => ({
          runs: upsert(state.runs, { ...run, profileId: run.profileId ?? state.activeProfileId }),
          lastPower: run.power,
        })),
      deleteRun: (id) => set((state) => ({ runs: state.runs.filter((run) => run.id !== id) })),
      saveRingSession: (session) =>
        set((state) => ({
          ringSessions: upsert(state.ringSessions, {
            ...session,
            profileId: session.profileId ?? state.activeProfileId,
          }),
        })),
      deleteRingSession: (id) =>
        set((state) => ({
          ringSessions: state.ringSessions.filter((session) => session.id !== id),
        })),
      setLastPower: (power) => set({ lastPower: power }),
      addProfile: (name) => {
        const profile = { id: crypto.randomUUID(), name: name.trim().slice(0, 32) || "Skytter" };
        set((state) => ({ profiles: [...state.profiles, profile], activeProfileId: profile.id }));
        return profile.id;
      },
      renameProfile: (id, name) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? { ...profile, name: name.trim().slice(0, 32) || profile.name }
              : profile,
          ),
        })),
      deleteProfile: (id) => {
        const state = get();
        if (state.profiles.length <= 1) return;
        const profiles = state.profiles.filter((profile) => profile.id !== id);
        set({
          profiles,
          activeProfileId: state.activeProfileId === id ? profiles[0].id : state.activeProfileId,
          customDrills: state.customDrills.filter((item) => owner(item) !== id),
          runs: state.runs.filter((item) => owner(item) !== id),
          ringSessions: state.ringSessions.filter((item) => owner(item) !== id),
        });
      },
      setActiveProfile: (id) => {
        if (get().profiles.some((profile) => profile.id === id)) set({ activeProfileId: id });
      },
      pruneEmptySessions: () => {
        const cutoff = new Date(Date.now() - EMPTY_SESSION_GRACE_MS).toISOString();
        const sessions = get().ringSessions;
        const kept = sessions.filter(
          (session) =>
            session.status !== "open" ||
            session.sealed.length > 0 ||
            session.current.length > 0 ||
            session.touched > cutoff,
        );
        if (kept.length !== sessions.length) set({ ringSessions: kept });
      },
      importBackup: (data) => {
        const state = get();
        const profiles = mergeById(state.profiles, data.profiles ?? []);
        const known = new Set(profiles.list.map((profile) => profile.id));
        // Records from old single-user backups have no owner: give them to the active shooter.
        const adopt = <T extends { profileId?: string }>(items: T[]) =>
          items.map((item) =>
            known.has(owner(item)) ? item : { ...item, profileId: state.activeProfileId },
          );
        const drills = mergeById(state.customDrills, adopt(data.customDrills ?? []));
        const runs = mergeById(state.runs, adopt(data.runs ?? []));
        const sessions = mergeById(state.ringSessions, adopt(data.ringSessions ?? []));
        set({
          profiles: profiles.list,
          customDrills: drills.list,
          runs: runs.list.sort((a, b) => b.at.localeCompare(a.at)),
          ringSessions: sessions.list.sort((a, b) => b.at.localeCompare(a.at)),
        });
        return { added: drills.added + runs.added + sessions.added };
      },
    }),
    {
      name: "treffpunkt-dagbok",
      version: 2,
      storage: createBatchedStorage(),
      skipHydration: true,
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        lastPower: state.lastPower,
        lastBackupAt: state.lastBackupAt,
        customDrills: state.customDrills,
        runs: state.runs,
        ringSessions: state.ringSessions,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<DagbokState>;
        if (version < 2) {
          state.profiles = state.profiles?.length ? state.profiles : [DEFAULT_PROFILE];
          state.activeProfileId = state.activeProfileId ?? DEFAULT_PROFILE_ID;
          state.lastPower = state.lastPower ?? "minor";
          state.customDrills = state.customDrills ?? [];
          state.runs = state.runs ?? [];
          state.ringSessions = state.ringSessions ?? [];
        }
        return state as DagbokState;
      },
    },
  ),
);

/** Data for the active shooter only. */
function useOwned<T extends { profileId?: string }>(list: T[]): T[] {
  const active = useFaktor((state) => state.activeProfileId);
  return useMemo(() => list.filter((item) => owner(item) === active), [list, active]);
}

export const useRuns = () => useOwned(useFaktor((state) => state.runs));
export const useRingSessions = () => useOwned(useFaktor((state) => state.ringSessions));
export const useCustomDrills = () => useOwned(useFaktor((state) => state.customDrills));

export function useActiveProfile(): Profile {
  const profiles = useFaktor((state) => state.profiles);
  const active = useFaktor((state) => state.activeProfileId);
  return profiles.find((profile) => profile.id === active) ?? profiles[0] ?? DEFAULT_PROFILE;
}

export function exportBackup(): string {
  const { profiles, customDrills, runs, ringSessions } = useFaktor.getState();
  return serializeBackup({ profiles, customDrills, runs, ringSessions });
}
