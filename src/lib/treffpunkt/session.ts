import type { ProgramDef } from "./programs.ts";

export type RingShot = {
  xMm: number;
  yMm: number;
  score: number;
  innerTen: boolean;
  targetIndex: number;
};

export type SealedSeries = {
  stageIndex: number;
  shots: RingShot[];
};

export type RingSession = {
  id: string;
  programId: string;
  programName: string;
  place: string;
  status: "open" | "done";
  stageIndex: number;
  seriesDoneInStage: number;
  current: RingShot[];
  sealed: SealedSeries[];
  at: string;
  touched: string;
};

export function createSession(program: ProgramDef, place: string): RingSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    programId: program.id,
    programName: program.name,
    place: place.trim(),
    status: "open",
    stageIndex: 0,
    seriesDoneInStage: 0,
    current: [],
    sealed: [],
    at: now,
    touched: now,
  };
}

export function sessionPoints(session: RingSession): { points: number; inner: number; shots: number } {
  const shots = [...session.sealed.flatMap((series) => series.shots), ...session.current];
  return {
    points: shots.reduce((sum, shot) => sum + shot.score, 0),
    inner: shots.filter((shot) => shot.innerTen).length,
    shots: shots.length,
  };
}

export function seriesPoints(shots: RingShot[]): number {
  return shots.reduce((sum, shot) => sum + shot.score, 0);
}

export function sealSeries(session: RingSession, program: ProgramDef): RingSession {
  const stage = program.stages[session.stageIndex];
  if (!stage || session.current.length !== stage.shotsPerSeries) return session;
  const sealed = [...session.sealed, { stageIndex: session.stageIndex, shots: session.current }];
  let stageIndex = session.stageIndex;
  let seriesDoneInStage = session.seriesDoneInStage + 1;
  let status: RingSession["status"] = "open";
  if (seriesDoneInStage >= stage.seriesCount) {
    seriesDoneInStage = 0;
    stageIndex += 1;
    if (stageIndex >= program.stages.length) status = "done";
  }
  return {
    ...session,
    sealed,
    current: [],
    stageIndex,
    seriesDoneInStage,
    status,
    touched: new Date().toISOString(),
  };
}
