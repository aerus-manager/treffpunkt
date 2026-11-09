import type { Drill, StartPosition } from "./types.ts";

export const START_LABEL: Record<StartPosition, string> = {
  hylster: "Fra hylster",
  lav: "Lav klar",
  vendt: "Vendt bort",
  valgfritt: "Valgfri start",
};

export const BUILTIN_DRILLS: Drill[] = [
  {
    id: "bill-drill",
    name: "Bill Drill",
    blurb: "Seks skudd på én skive så fort du kan holde A.",
    builtin: true,
    distanceM: 7,
    start: "hylster",
    countMode: "all",
    papers: [{ id: "bill-1", label: "Skive", requiredHits: 6 }],
    steel: 0,
  },
  {
    id: "el-presidente",
    name: "El Presidente",
    blurb: "Tre skiver, to på hver, magasinbytte, to på hver igjen.",
    builtin: true,
    distanceM: 10,
    start: "vendt",
    countMode: "all",
    papers: [
      { id: "elp-1", label: "Venstre", requiredHits: 4 },
      { id: "elp-2", label: "Midten", requiredHits: 4 },
      { id: "elp-3", label: "Høyre", requiredHits: 4 },
    ],
    steel: 0,
  },
  {
    id: "blake-drill",
    name: "Blake Drill",
    blurb: "Tre skiver, to skudd på hver. Overganger.",
    builtin: true,
    distanceM: 7,
    start: "hylster",
    countMode: "all",
    papers: [
      { id: "blake-1", label: "Venstre", requiredHits: 2 },
      { id: "blake-2", label: "Midten", requiredHits: 2 },
      { id: "blake-3", label: "Høyre", requiredHits: 2 },
    ],
    steel: 0,
  },
  {
    id: "doubles",
    name: "Dobbel",
    blurb: "To raske skudd fra hylster på én skive.",
    builtin: true,
    distanceM: 7,
    start: "hylster",
    countMode: "all",
    papers: [{ id: "doubles-1", label: "Skive", requiredHits: 2 }],
    steel: 0,
  },
  {
    id: "comstock-steel",
    name: "To skiver og stål",
    blurb: "Comstock: to beste på hver skive, så to stål.",
    builtin: true,
    distanceM: 10,
    start: "lav",
    countMode: "best",
    papers: [
      { id: "cs-1", label: "Venstre", requiredHits: 2 },
      { id: "cs-2", label: "Høyre", requiredHits: 2 },
    ],
    steel: 2,
  },
];

export function allDrills(custom: Drill[]): Drill[] {
  return [...BUILTIN_DRILLS, ...custom];
}

export function drillById(id: string, custom: Drill[]): Drill | undefined {
  return allDrills(custom).find((drill) => drill.id === id);
}
