import type { ProgramDef } from "./programs.ts";

export type RingShot = {
  xMm: number;
  yMm: number;
  score: number;
  innerTen: boolean;
  targetIndex: number;
  /** Entered as a ring value without a position; not drawn on the target. */
  manual?: boolean;
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
  profileId?: string;
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

export function sessionPoints(session: RingSession): {
  points: number;
  inner: number;
  shots: number;
} {
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

/** Where the session stands after `sealedCount` finished series. */
export function positionAfter(
  program: ProgramDef,
  sealedCount: number,
): { stageIndex: number; seriesDoneInStage: number; done: boolean } {
  let left = sealedCount;
  for (let index = 0; index < program.stages.length; index += 1) {
    const count = program.stages[index].seriesCount;
    if (left < count) return { stageIndex: index, seriesDoneInStage: left, done: false };
    left -= count;
  }
  return { stageIndex: program.stages.length, seriesDoneInStage: 0, done: true };
}

/** Undo "next series": move the last sealed series back into the open series. */
export function reopenLastSeries(session: RingSession, program: ProgramDef): RingSession {
  if (session.current.length > 0 || session.sealed.length === 0) return session;
  const sealed = session.sealed.slice(0, -1);
  const last = session.sealed[session.sealed.length - 1];
  const position = positionAfter(program, sealed.length);
  return {
    ...session,
    sealed,
    current: last.shots,
    stageIndex: position.stageIndex,
    seriesDoneInStage: position.seriesDoneInStage,
    status: "open",
    touched: new Date().toISOString(),
  };
}

/** Round a coordinate to 0.1 mm: plenty for scoring, and keeps the stored diary small. */
export function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}
