import { sessionPoints, type RingSession } from "./session.ts";

export type ProgramBest = { points: number; inner: number; sessionId: string; at: string };

export function bestByProgram(sessions: RingSession[]): Map<string, ProgramBest> {
  const best = new Map<string, ProgramBest>();
  for (const session of sessions) {
    if (session.status !== "done") continue;
    const totals = sessionPoints(session);
    const current = best.get(session.programId);
    if (
      !current ||
      totals.points > current.points ||
      (totals.points === current.points && totals.inner > current.inner)
    ) {
      best.set(session.programId, {
        points: totals.points,
        inner: totals.inner,
        sessionId: session.id,
        at: session.at,
      });
    }
  }
  return best;
}
