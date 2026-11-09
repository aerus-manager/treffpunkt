import type { Power, ScoreBreakdown, Zone } from "./types";

export const ZONE_POINTS: Record<Power, Record<Zone, number>> = {
  minor: { A: 5, C: 3, D: 1 },
  major: { A: 5, C: 4, D: 2 },
};

const MISS = -10;
const STEEL = 5;

export type ScoreInput = {
  power: Power;
  timeSec: number;
  countMode: "all" | "best";
  papers: { id: string; requiredHits: number }[];
  shots: { targetId: string; zone: Zone }[];
  steelDown: boolean[];
  noShootHits: number;
  procedurals: number;
};

export function scoreRun(input: ScoreInput): ScoreBreakdown {
  const worth = ZONE_POINTS[input.power];
  let points = 0;
  let A = 0;
  let C = 0;
  let D = 0;
  let misses = 0;
  let discarded = 0;

  const take = (zone: Zone) => {
    points += worth[zone];
    if (zone === "A") A += 1;
    else if (zone === "C") C += 1;
    else D += 1;
  };

  for (const paper of input.papers) {
    const hits = input.shots.filter((shot) => shot.targetId === paper.id);
    if (input.countMode === "best") {
      const ranked = [...hits].sort((a, b) => worth[b.zone] - worth[a.zone]);
      const kept = ranked.slice(0, paper.requiredHits);
      discarded += Math.max(0, hits.length - kept.length);
      for (const hit of kept) take(hit.zone);
      const short = Math.max(0, paper.requiredHits - kept.length);
      misses += short;
      points += short * MISS;
    } else {
      for (const hit of hits) take(hit.zone);
      const short = Math.max(0, paper.requiredHits - hits.length);
      misses += short;
      points += short * MISS;
    }
  }

  let steel = 0;
  for (const down of input.steelDown) {
    if (down) {
      steel += 1;
      points += STEEL;
    } else {
      misses += 1;
      points += MISS;
    }
  }

  const noShoots = Math.max(0, input.noShootHits);
  const procedurals = Math.max(0, input.procedurals);
  points += noShoots * MISS;
  points += procedurals * MISS;

  const hitFactor = input.timeSec > 0 ? points / input.timeSec : 0;

  return {
    A,
    C,
    D,
    steel,
    misses,
    noShoots,
    procedurals,
    discarded,
    points,
    hitFactor,
  };
}
