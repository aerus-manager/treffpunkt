import type { Drill, StartPosition } from "./types";

export const START_LABEL: Record<StartPosition, string> = {
  hylster: "Hylster",
  lav: "Lav beredskap",
  vendt: "Vendt",
  valgfritt: "Valgfri start",
};

function papers(drillId: string, count: number, hits: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${drillId}-p${index + 1}`,
    label: count === 1 ? "Skive" : `Skive ${index + 1}`,
    requiredHits: hits,
  }));
}

export const BUILTIN_DRILLS: Drill[] = [
  {
    id: "bill",
    name: "Bill Drill",
    blurb: "Seks skudd på én skive, fra hylster. Alle treff teller.",
    builtin: true,
    distanceM: 7,
    start: "hylster",
    countMode: "all",
    papers: papers("bill", 1, 6),
    steel: 0,
  },
  {
    id: "bill-lav",
    name: "Bill Drill, lav beredskap",
    blurb: "Samme seks skudd, men pistolen starter i lav beredskap.",
    builtin: true,
    distanceM: 7,
    start: "lav",
    countMode: "all",
    papers: papers("bill-lav", 1, 6),
    steel: 0,
  },
  {
    id: "presidente",
    name: "El Presidente",
    blurb: "Tolv skudd på tre skiver — to, magasinbytte, to til. Start vendt.",
    builtin: true,
    distanceM: 10,
    start: "vendt",
    countMode: "all",
    papers: papers("presidente", 3, 4),
    steel: 0,
  },
  {
    id: "overgang-2",
    name: "Overgang, to skiver",
    blurb: "To treff på hver skive. Alle treff teller.",
    builtin: true,
    distanceM: 10,
    start: "hylster",
    countMode: "all",
    papers: papers("overgang-2", 2, 2),
    steel: 0,
  },
  {
    id: "overgang-3",
    name: "Overgang, tre skiver",
    blurb: "Tre skiver, to treff på hver. Alle treff teller.",
    builtin: true,
    distanceM: 10,
    start: "hylster",
    countMode: "all",
    papers: papers("overgang-3", 3, 2),
    steel: 0,
  },
  {
    id: "to-beste",
    name: "To beste",
    blurb: "Comstock på én skive. Bare de to beste treffene teller.",
    builtin: true,
    distanceM: 7,
    start: "valgfritt",
    countMode: "best",
    papers: papers("to-beste", 1, 2),
    steel: 0,
  },
];

export function drillById(id: string, custom: Drill[]): Drill | undefined {
  return custom.find((drill) => drill.id === id) ?? BUILTIN_DRILLS.find((drill) => drill.id === id);
}

export function allDrills(custom: Drill[]): Drill[] {
  return [...BUILTIN_DRILLS, ...custom];
}
