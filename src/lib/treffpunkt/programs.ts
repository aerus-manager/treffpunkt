import { makeFace, type Face, type FaceId } from "./faces.ts";
import type { CategoryId } from "../nav.ts";

export type StageDef = {
  name: string;
  face: FaceId;
  caliberMm: number;
  shotsPerSeries: number;
  seriesCount: number;
  secondsPerSeries?: number;
  targetsPerSeries?: number;
};

export type ProgramDef = {
  id: string;
  name: string;
  category: "luft" | "fin-grov";
  stages: StageDef[];
};

const air = (
  name: string,
  shotsPerSeries: number,
  seriesCount: number,
  face: FaceId,
): StageDef => ({
  name,
  face,
  caliberMm: 4.5,
  shotsPerSeries,
  seriesCount,
});

const pistol = (
  name: string,
  shotsPerSeries: number,
  seriesCount: number,
  face: FaceId,
  caliberMm: number,
  extra?: Pick<StageDef, "secondsPerSeries" | "targetsPerSeries">,
): StageDef => ({
  name,
  face,
  caliberMm,
  shotsPerSeries,
  seriesCount,
  ...extra,
});

const fin = 5.6;
const grov = 9.65;

export const PROGRAMS: ProgramDef[] = [
  {
    id: "luftpistol-60",
    name: "10 m Luftpistol 60 skudd",
    category: "luft",
    stages: [air("Match", 10, 6, "air-pistol")],
  },
  {
    id: "luftpistol-40",
    name: "10 m Luftpistol 40 skudd",
    category: "luft",
    stages: [air("Match", 10, 4, "air-pistol")],
  },
  {
    id: "sprintluft",
    name: "Sprintluft",
    category: "luft",
    stages: [air("Match", 5, 6, "air-duel")],
  },
  {
    id: "storluft-duell",
    name: "Storluft (luftduell-skive)",
    category: "luft",
    stages: [air("Match", 10, 4, "air-duel")],
  },
  {
    id: "storluft-55",
    name: "Storluft (5,5 m)",
    category: "luft",
    stages: [air("Match", 10, 4, "air-pistol")],
  },
  {
    id: "standard-pistol",
    name: "25 m Standard Pistol",
    category: "fin-grov",
    stages: [
      pistol("150 s", 5, 4, "precision", fin, { secondsPerSeries: 150 }),
      pistol("20 s", 5, 4, "precision", fin, { secondsPerSeries: 20 }),
      pistol("10 s", 5, 4, "precision", fin, { secondsPerSeries: 10 }),
    ],
  },
  {
    id: "finpistol",
    name: "25 m Finpistol",
    category: "fin-grov",
    stages: [pistol("Presisjon", 5, 6, "precision", fin), pistol("Duell", 5, 6, "rapid", fin)],
  },
  {
    id: "grovpistol",
    name: "25 m Grovpistol",
    category: "fin-grov",
    stages: [pistol("Presisjon", 5, 6, "precision", grov), pistol("Duell", 5, 6, "rapid", grov)],
  },
  {
    id: "hurtig-fin",
    name: "25 m Hurtigpistol fin",
    category: "fin-grov",
    stages: [
      pistol("10 s", 5, 4, "rapid", fin, { secondsPerSeries: 10 }),
      pistol("8 s", 5, 4, "rapid", fin, { secondsPerSeries: 8 }),
      pistol("6 s", 5, 4, "rapid", fin, { secondsPerSeries: 6 }),
    ],
  },
  {
    id: "hurtig-grov",
    name: "25 m Hurtigpistol grov",
    category: "fin-grov",
    stages: [
      pistol("10 s", 5, 4, "rapid", grov, { secondsPerSeries: 10 }),
      pistol("8 s", 5, 4, "rapid", grov, { secondsPerSeries: 8 }),
      pistol("6 s", 5, 4, "rapid", grov, { secondsPerSeries: 6 }),
    ],
  },
  {
    id: "silhuett",
    name: "25 m Silhuettpistol",
    category: "fin-grov",
    stages: [
      pistol("8 s", 5, 4, "rapid", fin, { secondsPerSeries: 8, targetsPerSeries: 5 }),
      pistol("6 s", 5, 4, "rapid", fin, { secondsPerSeries: 6, targetsPerSeries: 5 }),
      pistol("4 s", 5, 4, "rapid", fin, { secondsPerSeries: 4, targetsPerSeries: 5 }),
    ],
  },
  {
    id: "nais-fin",
    name: "25 m NAIS fin",
    category: "fin-grov",
    stages: [
      pistol("Presisjon 150 s", 5, 2, "rapid", fin, { secondsPerSeries: 150 }),
      pistol("Duell", 5, 2, "rapid", fin),
      pistol("20 s", 5, 1, "rapid", fin, { secondsPerSeries: 20 }),
      pistol("10 s", 5, 1, "rapid", fin, { secondsPerSeries: 10 }),
    ],
  },
  {
    id: "nais-grov",
    name: "25 m NAIS grov",
    category: "fin-grov",
    stages: [
      pistol("Presisjon 150 s", 5, 2, "rapid", grov, { secondsPerSeries: 150 }),
      pistol("Duell", 5, 2, "rapid", grov),
      pistol("20 s", 5, 1, "rapid", grov, { secondsPerSeries: 20 }),
      pistol("10 s", 5, 1, "rapid", grov, { secondsPerSeries: 10 }),
    ],
  },
  {
    id: "fripistol",
    name: "50 m Fripistol",
    category: "fin-grov",
    stages: [pistol("Match", 10, 6, "precision", fin)],
  },
];

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: "luft", name: "NSF Luft", blurb: "Luftpistol på 10 meter." },
  { id: "fin-grov", name: "NSF Fin/Grov", blurb: "Patronprogrammene på 25 og 50 meter." },
  { id: "mil", name: "MIL", blurb: "Ingen programmer i denne kategorien ennå." },
  { id: "felt", name: "Felt", blurb: "Feltløypa er ikke med i denne utgaven." },
  { id: "ipsc", name: "IPSC", blurb: "Driller med tid, soner og hit factor." },
];

export function programById(id: string): ProgramDef | undefined {
  return PROGRAMS.find((program) => program.id === id);
}

export function programsIn(category: ProgramDef["category"]): ProgramDef[] {
  return PROGRAMS.filter((program) => program.category === category);
}

export function totalShots(program: ProgramDef): number {
  return program.stages.reduce((sum, stage) => sum + stage.shotsPerSeries * stage.seriesCount, 0);
}

export function faceFor(stage: StageDef): Face {
  return makeFace(stage.face, stage.caliberMm);
}
