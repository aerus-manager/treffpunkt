import type { Power, Run, ScoreBreakdown, Shot, Zone } from "./types.ts";

export const ZONE_POINTS: Record<Power, Record<Zone, number>> = {
  minor: { A: 5, C: 3, D: 1 },
  major: { A: 5, C: 4, D: 2 },
};

export const STEEL_POINTS = 5;
export const PENALTY = 10;

type Scorable = Pick<
  Run,
  | "countMode"
  | "papers"
  | "steelDown"
  | "power"
  | "timeSec"
  | "shots"
  | "noShootHits"
  | "procedurals"
>;

/**
 * IPSC score for one run.
 * - "all": every hit counts; hits short of the requirement are misses.
 * - "best" (Comstock): only the best N hits per paper count, extras are discarded.
 * Stage points never go below zero, and hit factor is points per second.
 */
export function scoreRun(run: Scorable): ScoreBreakdown {
  const worth = ZONE_POINTS[run.power];
  const counted: Shot[] = [];
  let misses = 0;
  let discarded = 0;

  for (const paper of run.papers) {
    const hits = run.shots.filter((shot) => shot.targetId === paper.id);
    if (run.countMode === "best") {
      const sorted = [...hits].sort((a, b) => worth[b.zone] - worth[a.zone]);
      counted.push(...sorted.slice(0, paper.requiredHits));
      discarded += Math.max(0, sorted.length - paper.requiredHits);
    } else {
      counted.push(...hits);
    }
    misses += Math.max(0, paper.requiredHits - hits.length);
  }

  const steel = run.steelDown.filter(Boolean).length;
  misses += run.steelDown.length - steel;

  const A = counted.filter((shot) => shot.zone === "A").length;
  const C = counted.filter((shot) => shot.zone === "C").length;
  const D = counted.filter((shot) => shot.zone === "D").length;
  const noShoots = Math.max(0, run.noShootHits);
  const procedurals = Math.max(0, run.procedurals);

  const raw =
    A * worth.A +
    C * worth.C +
    D * worth.D +
    steel * STEEL_POINTS -
    (misses + noShoots + procedurals) * PENALTY;
  const points = Math.max(0, raw);
  const hitFactor = run.timeSec > 0 ? points / run.timeSec : 0;

  return { A, C, D, steel, misses, noShoots, procedurals, discarded, points, hitFactor };
}
