import type { Zone } from "./types";

/** Millimetres. Classic IPSC paper, scoring area 450 × 570. */
export const TARGET_W = 450;
export const TARGET_H = 570;

type Pt = readonly [number, number];

/**
 * Outer octagon: 15 cm top and bottom edges, 19 cm corner drops,
 * straight sides from 19 cm to 38 cm.
 * A-zone: 15 × 32.5 cm, from 2.5 cm to 35 cm down, 5 cm top and bottom edges,
 * full width between 19 cm and 27.5 cm.
 * C boundary: 30 cm wide, down to 45 cm, 10 cm bottom edge.
 */
export const OUTER: Pt[] = [
  [150, 0],
  [300, 0],
  [450, 190],
  [450, 380],
  [300, 570],
  [150, 570],
  [0, 380],
  [0, 190],
];

export const CHARLIE: Pt[] = [
  [150, 0],
  [300, 0],
  [375, 95],
  [375, 330],
  [275, 450],
  [175, 450],
  [75, 330],
  [75, 95],
];

export const ALPHA: Pt[] = [
  [200, 25],
  [250, 25],
  [300, 190],
  [300, 275],
  [250, 350],
  [200, 350],
  [150, 275],
  [150, 190],
];

export function polyPoints(poly: readonly Pt[]): string {
  return poly.map(([x, y]) => `${x},${y}`).join(" ");
}

function onEdge(x: number, y: number, poly: readonly Pt[]): boolean {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const dx = xj - xi;
    const dy = yj - yi;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : ((x - xi) * dx + (y - yi) * dy) / len2;
    const tc = Math.max(0, Math.min(1, t));
    const px = xi + tc * dx;
    const py = yi + tc * dy;
    const dist2 = (x - px) ** 2 + (y - py) ** 2;
    if (dist2 <= 0.36) return true;
  }
  return false;
}

export function pointInPoly(x: number, y: number, poly: readonly Pt[]): boolean {
  if (onEdge(x, y, poly)) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** A line that shares two zones scores the better one. Outside the cardboard is null. */
export function zoneAt(x: number, y: number): Zone | null {
  if (pointInPoly(x, y, ALPHA)) return "A";
  if (pointInPoly(x, y, CHARLIE)) return "C";
  if (pointInPoly(x, y, OUTER)) return "D";
  return null;
}
