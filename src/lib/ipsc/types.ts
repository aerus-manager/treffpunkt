export type Power = "minor" | "major";

export type Zone = "A" | "C" | "D";

export type CountMode = "all" | "best";

export type StartPosition = "hylster" | "lav" | "vendt" | "valgfritt";

export type PaperTarget = {
  id: string;
  label: string;
  requiredHits: number;
};

export type Drill = {
  id: string;
  name: string;
  blurb: string;
  builtin: boolean;
  distanceM: number | null;
  start: StartPosition;
  countMode: CountMode;
  papers: PaperTarget[];
  steel: number;
};

export type Shot = {
  id: string;
  targetId: string;
  zone: Zone;
  x: number;
  y: number;
};

export type Run = {
  id: string;
  drillId: string;
  drillName: string;
  blurb: string;
  countMode: CountMode;
  papers: PaperTarget[];
  steelDown: boolean[];
  distanceM: number | null;
  start: StartPosition;
  at: string;
  power: Power;
  timeSec: number;
  shots: Shot[];
  noShootHits: number;
  procedurals: number;
  note: string;
};

export type ScoreBreakdown = {
  A: number;
  C: number;
  D: number;
  steel: number;
  misses: number;
  noShoots: number;
  procedurals: number;
  discarded: number;
  points: number;
  hitFactor: number;
};
