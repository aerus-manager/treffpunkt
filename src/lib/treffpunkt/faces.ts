export type FaceId = "air-pistol" | "air-duel" | "precision" | "rapid";

export type Face = {
  id: FaceId;
  caliberMm: number;
  /** Outer diameters in mm, index 0 = lowest ring. */
  diametersMm: number[];
  lowestRing: number;
  innerTenDiameterMm: number | null;
  blackBullDiameterMm: number;
};

const AIR_PISTOL = [155.5, 139.5, 123.5, 107.5, 91.5, 75.5, 59.5, 43.5, 27.5, 11.5];
const AIR_DUEL = [155.5, 129, 102.5, 76, 49.5, 23];
const PRECISION = [500, 450, 400, 350, 300, 250, 200, 150, 100, 50];
const RAPID = [500, 420, 340, 260, 180, 100];

export function makeFace(id: FaceId, caliberMm: number): Face {
  if (id === "air-pistol") {
    return {
      id,
      caliberMm,
      diametersMm: AIR_PISTOL,
      lowestRing: 1,
      innerTenDiameterMm: 5,
      blackBullDiameterMm: 59.5,
    };
  }
  if (id === "air-duel") {
    return {
      id,
      caliberMm,
      diametersMm: AIR_DUEL,
      lowestRing: 5,
      innerTenDiameterMm: 11.5,
      blackBullDiameterMm: 76,
    };
  }
  if (id === "precision") {
    return {
      id,
      caliberMm,
      diametersMm: PRECISION,
      lowestRing: 1,
      innerTenDiameterMm: 25,
      blackBullDiameterMm: 200,
    };
  }
  return {
    id,
    caliberMm,
    diametersMm: RAPID,
    lowestRing: 5,
    innerTenDiameterMm: 50,
    blackBullDiameterMm: 500,
  };
}

export function highestRing(face: Face): number {
  return face.lowestRing + face.diametersMm.length - 1;
}

/** Whole-ring score with the gauge counted outward, same rule as the diary. */
export function scoreShot(face: Face, xMm: number, yMm: number): { score: number; innerTen: boolean } {
  const distance = Math.hypot(xMm, yMm);
  const pellet = face.caliberMm / 2;
  let score = 0;
  for (let ring = highestRing(face); ring >= face.lowestRing; ring -= 1) {
    const diameter = face.diametersMm[ring - face.lowestRing];
    if (diameter != null && distance <= diameter / 2 + pellet) {
      score = ring;
      break;
    }
  }
  const inner =
    score > 0 &&
    face.innerTenDiameterMm != null &&
    distance <= face.innerTenDiameterMm / 2 + pellet;
  return { score, innerTen: inner };
}
