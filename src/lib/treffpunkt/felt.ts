export type FeltGroup = "1" | "2";

export type FigureKind =
  | "circle"
  | "oval"
  | "egg"
  | "triangle"
  | "right-triangle"
  | "hexagon"
  | "stripe"
  | "pin"
  | "animal";

export type FeltFigure = {
  name: string;
  kind: FigureKind;
  widthCm: number;
  heightCm: number;
  hasInner: boolean;
};

export type FeltHold = {
  number: number;
  distance: string;
  position: string;
  colour: "black" | "green" | "red";
  figures: FeltFigure[];
};

export type FeltCourse = {
  id: string;
  name: string;
  seconds: number;
  note: string;
  holds: FeltHold[];
};

export type FeltShot = {
  xCm: number;
  yCm: number;
  figureIndex: number | null;
  inner: boolean;
};

export type FeltHoldResult = {
  shots: FeltShot[];
  overTime: boolean | null;
  elapsedMs: number | null;
};

export type FeltSession = {
  id: string;
  courseId: string;
  courseName: string;
  group: FeltGroup;
  place: string;
  weaponId: string | null;
  status: "open" | "done";
  holdIndex: number;
  current: FeltShot[];
  sealed: FeltHoldResult[];
  at: string;
  touched: string;
  profileId?: string;
};

const fig = (
  name: string,
  kind: FigureKind,
  widthCm: number,
  heightCm: number,
  hasInner = true,
): FeltFigure => ({ name, kind, widthCm, heightCm, hasInner });

const NORGES: FeltHold[] = [
  {
    number: 1,
    distance: "15 m",
    position: "Stående 1 hånd",
    colour: "black",
    figures: [fig("Hare", "animal", 31, 41), fig("Stor oval", "oval", 33, 22)],
  },
  {
    number: 2,
    distance: "25 / 15 m",
    position: "Stående fri",
    colour: "green",
    figures: [
      fig("Stor stripe", "stripe", 12, 37),
      fig("Stor stripe", "stripe", 12, 37),
      fig("Sekskant", "hexagon", 31, 22),
      fig("Kjegle", "pin", 38, 13),
      fig("Kjegle", "pin", 38, 13),
      fig("Kjegle", "pin", 38, 13),
    ],
  },
  {
    number: 3,
    distance: "25 / 15 m",
    position: "Stående 2 hender",
    colour: "red",
    figures: [
      fig("Trekant", "triangle", 21, 19),
      fig("Sirkel 13", "circle", 13, 13),
      fig("Sirkel 20", "circle", 20, 20),
      fig("Sirkel 25", "circle", 25, 25),
      fig("Egg liten", "egg", 18, 7),
    ],
  },
  {
    number: 4,
    distance: "25 m",
    position: "FG stående 1 hånd, andre fri",
    colour: "black",
    figures: [fig("Liten oval", "oval", 19, 14), fig("Ulvehode", "animal", 40, 35), fig("Rype", "animal", 25, 25)],
  },
  {
    number: 5,
    distance: "25 m",
    position: "Stående 2 hender",
    colour: "green",
    figures: [fig("Trekant stor", "right-triangle", 50, 50, false), fig("Oval liten", "oval", 19, 14)],
  },
  {
    number: 6,
    distance: "25 / 15 m",
    position: "Stående fri",
    colour: "red",
    figures: [
      fig("Sekskant", "hexagon", 31, 22),
      fig("Trekant", "triangle", 21, 19),
      fig("Sirkel 13", "circle", 13, 13),
      fig("Sirkel 25", "circle", 25, 25),
      fig("Egg stor", "egg", 20, 10),
    ],
  },
  {
    number: 7,
    distance: "25 m",
    position: "Sittende 2 hender",
    colour: "black",
    figures: [fig("Liten oval", "oval", 19, 14), fig("Sirkel 13", "circle", 13, 13), fig("1/6", "animal", 41, 27)],
  },
  {
    number: 8,
    distance: "25 / 15 m",
    position: "Stående fri",
    colour: "green",
    figures: [
      fig("Sekskant", "hexagon", 31, 22),
      fig("Stor stripe", "stripe", 12, 37),
      fig("Sekskant", "hexagon", 31, 22),
      fig("Liten stripe", "stripe", 8, 25),
      fig("Liten stripe", "stripe", 8, 25),
      fig("Liten stripe", "stripe", 8, 25),
    ],
  },
];

const ASKER_EXTRA: FeltHold[] = [
  {
    number: 9,
    distance: "25 m",
    position: "Stående fri",
    colour: "green",
    figures: [0, 1, 2, 3, 4].map((index) =>
      fig("Sekskant", "hexagon", index % 2 === 0 ? 31 : 22, index % 2 === 0 ? 22 : 31),
    ),
  },
  {
    number: 10,
    distance: "25 m",
    position: "Stående fri",
    colour: "green",
    figures: [
      fig("Sekskant", "hexagon", 31, 22),
      fig("Ugle", "animal", 23, 50),
      fig("Stolpe", "stripe", 37, 12),
      fig("Stolpe", "stripe", 37, 12),
      fig("Stolpe", "stripe", 37, 12),
      fig("Sekskant", "hexagon", 22, 31),
    ],
  },
];

export const FELT_COURSES: FeltCourse[] = [
  {
    id: "norgesfelt-2026",
    name: "Norgesfelt 2026",
    seconds: 10,
    note: "Åtte hold, 10 sekunder. Poeng er treff pluss ulike figurer. Innertreff er bare skilletegn.",
    holds: NORGES,
  },
  {
    id: "norgesfelt-asker-plus",
    name: "Norgesfelt Asker+",
    seconds: 10,
    note: "Norgesfelt 2026 pluss hold 9 og 10.",
    holds: [...NORGES, ...ASKER_EXTRA],
  },
];

export function feltCourse(id: string): FeltCourse | undefined {
  return FELT_COURSES.find((course) => course.id === id);
}

export function shotsForGroup(group: FeltGroup): number {
  return group === "1" ? 6 : 5;
}

export type PlacedFigure = FeltFigure & { index: number; x: number; y: number };

export function layoutHold(hold: FeltHold): { figures: PlacedFigure[]; width: number; height: number } {
  const gap = 3;
  const pad = 2;
  let x = pad;
  const figures = hold.figures.map((figure, index) => {
    const placed = { ...figure, index, x, y: pad };
    x += figure.widthCm + gap;
    return placed;
  });
  const height = pad * 2 + Math.max(...hold.figures.map((figure) => figure.heightCm));
  return { figures, width: x - gap + pad, height };
}

function pointInPoly(x: number, y: number, poly: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function hitsFigure(figure: PlacedFigure, x: number, y: number): boolean {
  const lx = x - figure.x;
  const ly = y - figure.y;
  if (lx < 0 || ly < 0 || lx > figure.widthCm || ly > figure.heightCm) return false;
  const w = figure.widthCm;
  const h = figure.heightCm;
  if (figure.kind === "circle" || figure.kind === "oval" || figure.kind === "egg" || figure.kind === "animal" || figure.kind === "pin") {
    const rx = w / 2;
    const ry = figure.kind === "egg" ? h / 2.2 : h / 2;
    const cy = figure.kind === "egg" ? h * 0.55 : h / 2;
    return ((lx - w / 2) / rx) ** 2 + ((ly - cy) / ry) ** 2 <= 1;
  }
  if (figure.kind === "stripe") return true;
  if (figure.kind === "triangle") return pointInPoly(lx, ly, [[w / 2, 0], [w, h], [0, h]]);
  if (figure.kind === "right-triangle") return pointInPoly(lx, ly, [[0, 0], [w, h], [0, h]]);
  const inset = Math.min(w, h) * 0.22;
  return pointInPoly(lx, ly, [
    [inset, 0],
    [w - inset, 0],
    [w, h / 2],
    [w - inset, h],
    [inset, h],
    [0, h / 2],
  ]);
}

function hitsInner(figure: PlacedFigure, x: number, y: number): boolean {
  if (!figure.hasInner) return false;
  const lx = x - figure.x - figure.widthCm / 2;
  const ly = y - figure.y - figure.heightCm / 2;
  const rx = figure.widthCm * 0.22;
  const ry = figure.heightCm * 0.22;
  return (lx / rx) ** 2 + (ly / ry) ** 2 <= 1;
}

export function shotOnHold(hold: FeltHold, xCm: number, yCm: number): Pick<FeltShot, "figureIndex" | "inner"> {
  const { figures } = layoutHold(hold);
  for (let index = figures.length - 1; index >= 0; index -= 1) {
    const figure = figures[index];
    if (!hitsFigure(figure, xCm, yCm)) continue;
    return { figureIndex: figure.index, inner: hitsInner(figure, xCm, yCm) };
  }
  return { figureIndex: null, inner: false };
}

export function holdTally(shots: FeltShot[]): { treff: number; figures: number; inner: number; points: number } {
  const hits = shots.filter((shot) => shot.figureIndex != null);
  const figures = new Set(hits.map((shot) => shot.figureIndex)).size;
  const inner = shots.filter((shot) => shot.inner).length;
  return { treff: hits.length, figures, inner, points: hits.length + figures };
}

export function sessionTally(session: FeltSession): { points: number; inner: number; late: number } {
  const holds = [...session.sealed.map((hold) => hold.shots), session.current];
  return holds.reduce(
    (sum, shots) => {
      const tally = holdTally(shots);
      return { points: sum.points + tally.points, inner: sum.inner + tally.inner, late: sum.late };
    },
    { points: 0, inner: 0, late: session.sealed.filter((hold) => hold.overTime === true).length },
  );
}

export function maxPoints(course: FeltCourse, group: FeltGroup): number {
  const shots = shotsForGroup(group);
  return course.holds.reduce((sum, hold) => sum + shots + Math.min(shots, hold.figures.length), 0);
}

export function createFeltSession(course: FeltCourse, group: FeltGroup, place: string, weaponId: string | null): FeltSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    courseId: course.id,
    courseName: course.name,
    group,
    place: place.trim(),
    weaponId,
    status: "open",
    holdIndex: 0,
    current: [],
    sealed: [],
    at: now,
    touched: now,
  };
}
