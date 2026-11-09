import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Drill, Run } from "@/lib/ipsc/types";
import type { RingSession } from "@/lib/treffpunkt/session";

type DagbokState = {
  customDrills: Drill[];
  runs: Run[];
  ringSessions: RingSession[];
  saveDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
  saveRun: (run: Run) => void;
  deleteRun: (id: string) => void;
  saveRingSession: (session: RingSession) => void;
  deleteRingSession: (id: string) => void;
};

export const useFaktor = create<DagbokState>()(
  persist(
    (set) => ({
      customDrills: [],
      runs: [],
      ringSessions: [],
      saveDrill: (drill) =>
        set((state) => {
          const exists = state.customDrills.some((item) => item.id === drill.id);
          return {
            customDrills: exists
              ? state.customDrills.map((item) => (item.id === drill.id ? drill : item))
              : [...state.customDrills, drill],
          };
        }),
      deleteDrill: (id) =>
        set((state) => ({
          customDrills: state.customDrills.filter((drill) => drill.id !== id),
        })),
      saveRun: (run) =>
        set((state) => {
          const exists = state.runs.some((item) => item.id === run.id);
          return {
            runs: exists ? state.runs.map((item) => (item.id === run.id ? run : item)) : [run, ...state.runs],
          };
        }),
      deleteRun: (id) => set((state) => ({ runs: state.runs.filter((run) => run.id !== id) })),
      saveRingSession: (session) =>
        set((state) => {
          const exists = state.ringSessions.some((item) => item.id === session.id);
          return {
            ringSessions: exists
              ? state.ringSessions.map((item) => (item.id === session.id ? session : item))
              : [session, ...state.ringSessions],
          };
        }),
      deleteRingSession: (id) =>
        set((state) => ({ ringSessions: state.ringSessions.filter((session) => session.id !== id) })),
    }),
    { name: "treffpunkt-dagbok", skipHydration: true },
  ),
);
