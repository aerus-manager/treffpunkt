import type { Zone } from "./types.ts";

/**
 * IPSC Classic target in SVG units (1 unit ≈ 1 mm): an octagonal 450 × 570
 * board with a centred C zone and an upper A box.
 */
export const TARGET_W = 450;
export const TARGET_H = 570;

export type Point = readonly [number, number];

function octagon(x0: number, y0: number, x1: number, y1: number, cut: number): Point[] {
  return [
    [x0 + cut, y0],
    [x1 - cut, y0],
    [x1, y0 + cut],
    [x1, y1 - cut],
    [x1 - cut, y1],
    [x0 + cut, y1],
    [x0, y1 - cut],
    [x0, y0 + cut],
  ];
}

export const OUTER: Point[] = octagon(0, 0, TARGET_W, TARGET_H, 95);
export const CHARLIE: Point[] = octagon(75, 50, 375, 500, 55);
export const ALPHA: Point[] = [
  [150, 110],
  [300, 110],
  [300, 390],
  [150, 390],
];

export function polyPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Ray-casting point-in-polygon; edges count as inside (the line is the higher zone). */
export function insidePolygon(x: number, y: number, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (onSegment(x, y, xi, yi, xj, yj)) return true;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): boolean {
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  if (Math.abs(cross) > 1e-6 * Math.hypot(x2 - x1, y2 - y1)) return false;
  return (
    x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)
  );
}

/** Scoring zone for a hit, or null when it is off the board. */
export function zoneAt(x: number, y: number): Zone | null {
  if (insidePolygon(x, y, ALPHA)) return "A";
  if (insidePolygon(x, y, CHARLIE)) return "C";
  if (insidePolygon(x, y, OUTER)) return "D";
  return null;
}
