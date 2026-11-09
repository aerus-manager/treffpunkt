import type {
  CountMode,
  Drill,
  PaperTarget,
  Power,
  Run,
  Shot,
  StartPosition,
  Zone,
} from "./ipsc/types.ts";
import type { RingSession, RingShot, SealedSeries } from "./treffpunkt/session.ts";

/**
 * Validation for anything that enters the diary from outside (backup files).
 * A malformed record would otherwise be persisted and crash every screen that
 * renders it, locking the shooter out of the app. Invalid records are dropped,
 * recoverable fields are repaired.
 */

export type Profile = { id: string; name: string };

export type DiaryData = {
  profiles: Profile[];
  customDrills: Drill[];
  runs: Run[];
  ringSessions: RingSession[];
};

export const BACKUP_APP = "treffpunkt";

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown, max = 200): string | null =>
  typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
const text = (value: unknown, max = 280): string =>
  typeof value === "string" ? value.slice(0, max) : "";
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const int = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = num(value);
  return n == null ? fallback : Math.min(max, Math.max(min, Math.round(n)));
};
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const iso = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
function compact<T>(items: unknown[], parse: (item: unknown) => T | null): T[] {
  const out: T[] = [];
  for (const item of items) {
    const parsed = parse(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

const STARTS: StartPosition[] = ["hylster", "lav", "vendt", "valgfritt"];
const MODES: CountMode[] = ["all", "best"];
const POWERS: Power[] = ["minor", "major"];
const ZONES: Zone[] = ["A", "C", "D"];

function profile(value: unknown): Profile | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  return id ? { id, name: str(value.name, 32) ?? "Skytter" } : null;
}

function paper(value: unknown): PaperTarget | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  return id
    ? {
        id,
        label: text(value.label, 48) || "Skive",
        requiredHits: int(value.requiredHits, 1, 12, 2),
      }
    : null;
}

function drill(value: unknown): Drill | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  const name = str(value.name, 48);
  if (!id || !name) return null;
  const distance = num(value.distanceM);
  return {
    id,
    name,
    blurb: text(value.blurb, 140),
    builtin: false,
    distanceM: distance != null && distance > 0 && distance <= 300 ? distance : null,
    start: oneOf(value.start, STARTS, "hylster"),
    countMode: oneOf(value.countMode, MODES, "all"),
    papers: compact(list(value.papers), paper).slice(0, 6),
    steel: int(value.steel, 0, 8, 0),
    ...(str(value.profileId) ? { profileId: str(value.profileId)! } : {}),
  };
}

function shot(value: unknown): Shot | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  const targetId = str(value.targetId);
  if (!id || !targetId || !ZONES.includes(value.zone as Zone)) return null;
  return { id, targetId, zone: value.zone as Zone, x: num(value.x) ?? 0, y: num(value.y) ?? 0 };
}

function run(value: unknown): Run | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  const drillId = str(value.drillId);
  const at = iso(value.at);
  if (!id || !drillId || !at) return null;
  const time = num(value.timeSec);
  return {
    id,
    drillId,
    drillName: str(value.drillName, 48) ?? "Drill",
    blurb: text(value.blurb, 140),
    countMode: oneOf(value.countMode, MODES, "all"),
    papers: compact(list(value.papers), paper),
    steelDown: list(value.steelDown).map(Boolean).slice(0, 8),
    distanceM: num(value.distanceM),
    start: oneOf(value.start, STARTS, "hylster"),
    at,
    power: oneOf(value.power, POWERS, "minor"),
    timeSec: time != null && time > 0 ? time : 0,
    shots: compact(list(value.shots), shot),
    noShootHits: int(value.noShootHits, 0, 99, 0),
    procedurals: int(value.procedurals, 0, 99, 0),
    note: text(value.note),
    ...(str(value.profileId) ? { profileId: str(value.profileId)! } : {}),
  };
}

function ringShot(value: unknown): RingShot | null {
  if (!isObj(value)) return null;
  const score = num(value.score);
  if (score == null || score < 0 || score > 10.9) return null;
  return {
    xMm: num(value.xMm) ?? 0,
    yMm: num(value.yMm) ?? 0,
    score,
    innerTen: value.innerTen === true,
    targetIndex: int(value.targetIndex, 0, 20, 0),
    ...(value.manual === true ? { manual: true } : {}),
  };
}

function series(value: unknown): SealedSeries | null {
  if (!isObj(value)) return null;
  const stageIndex = num(value.stageIndex);
  if (stageIndex == null || stageIndex < 0) return null;
  return { stageIndex: Math.round(stageIndex), shots: compact(list(value.shots), ringShot) };
}

function ringSession(value: unknown): RingSession | null {
  if (!isObj(value)) return null;
  const id = str(value.id);
  const programId = str(value.programId);
  const at = iso(value.at);
  if (!id || !programId || !at) return null;
  return {
    id,
    programId,
    programName: str(value.programName, 80) ?? programId,
    place: text(value.place, 60),
    status: oneOf(value.status, ["open", "done"] as const, "open"),
    stageIndex: int(value.stageIndex, 0, 20, 0),
    seriesDoneInStage: int(value.seriesDoneInStage, 0, 50, 0),
    current: compact(list(value.current), ringShot),
    sealed: compact(list(value.sealed), series),
    at,
    touched: iso(value.touched) ?? at,
    ...(str(value.profileId) ? { profileId: str(value.profileId)! } : {}),
  };
}

export function parseBackup(raw: string): DiaryData {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Filen er ikke gyldig JSON.");
  }
  if (
    !isObj(data) ||
    (data.app !== BACKUP_APP && !Array.isArray(data.runs) && !Array.isArray(data.ringSessions))
  ) {
    throw new Error("Filen er ikke en Treffpunkt-sikkerhetskopi.");
  }
  return {
    profiles: compact(list(data.profiles), profile),
    customDrills: compact(list(data.customDrills), drill),
    runs: compact(list(data.runs), run),
    ringSessions: compact(list(data.ringSessions), ringSession),
  };
}

/**
 * Merge two lists by id. When both sides have a record, the one touched most
 * recently wins (sessions carry `touched`); otherwise the incoming copy wins.
 */
export function mergeById<T extends { id: string; touched?: string }>(
  current: T[],
  incoming: T[],
): { list: T[]; added: number } {
  const byId = new Map(current.map((item) => [item.id, item]));
  let added = 0;
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) {
      added += 1;
      byId.set(item.id, item);
    } else if (!existing.touched || !item.touched || item.touched >= existing.touched) {
      byId.set(item.id, item);
    }
  }
  return { list: [...byId.values()], added };
}

export function serializeBackup(data: DiaryData, now = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, version: 2, exportedAt: now.toISOString(), ...data });
}
