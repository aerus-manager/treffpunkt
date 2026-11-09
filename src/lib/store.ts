import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import type { Drill, Power, Run } from "@/lib/ipsc/types";
import type { RingSession } from "@/lib/treffpunkt/session";

export type Profile = { id: string; name: string };

export const DEFAULT_PROFILE_ID = "default";
const DEFAULT_PROFILE: Profile = { id: DEFAULT_PROFILE_ID, name: "Meg" };

export type DiaryData = {
  profiles: Profile[];
  customDrills: Drill[];
  runs: Run[];
  ringSessions: RingSession[];
};

type DagbokState = DiaryData & {
  activeProfileId: string;
  lastPower: Power;
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
};

function upsert<T extends { id: string }>(list: T[], item: T, prepend = true): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return prepend ? [item, ...list] : [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

function mergeById<T extends { id: string }>(
  current: T[],
  incoming: T[],
): { list: T[]; added: number } {
  const byId = new Map(current.map((item) => [item.id, item]));
  let added = 0;
  for (const item of incoming) {
    if (!byId.has(item.id)) added += 1;
    byId.set(item.id, item);
  }
  return { list: [...byId.values()], added };
}

const owner = <T extends { profileId?: string }>(item: T) => item.profileId ?? DEFAULT_PROFILE_ID;

export const useFaktor = create<DagbokState>()(
  persist(
    (set, get) => ({
      profiles: [DEFAULT_PROFILE],
      activeProfileId: DEFAULT_PROFILE_ID,
      lastPower: "minor",
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
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        lastPower: state.lastPower,
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

export const BACKUP_APP = "treffpunkt";

export function exportBackup(): string {
  const { profiles, customDrills, runs, ringSessions } = useFaktor.getState();
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: 2,
      exportedAt: new Date().toISOString(),
      profiles,
      customDrills,
      runs,
      ringSessions,
    },
    null,
    0,
  );
}

export function parseBackup(text: string): DiaryData {
  const data = JSON.parse(text) as Partial<DiaryData> & { app?: string };
  if (data.app !== BACKUP_APP && !Array.isArray(data.runs) && !Array.isArray(data.ringSessions)) {
    throw new Error("Filen er ikke en Treffpunkt-sikkerhetskopi.");
  }
  const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    profiles: arr<Profile>(data.profiles).filter((p) => p && typeof p.id === "string"),
    customDrills: arr<Drill>(data.customDrills).filter((d) => d && typeof d.id === "string"),
    runs: arr<Run>(data.runs).filter(
      (r) => r && typeof r.id === "string" && Array.isArray(r.shots),
    ),
    ringSessions: arr<RingSession>(data.ringSessions).filter(
      (s) => s && typeof s.id === "string" && Array.isArray(s.sealed),
    ),
  };
}
