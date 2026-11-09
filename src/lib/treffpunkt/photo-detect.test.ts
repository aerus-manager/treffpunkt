import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeFace, scoreShot } from "./faces.ts";
import {
  detectHoles,
  dilate,
  erode,
  findBull,
  fitCircle,
  otsu,
  type Gray,
} from "./photo-detect.ts";

/** Air pistol target "photo": table, paper, black bull, ring lines, holes. */
function synthetic(
  holes: { x: number; y: number }[],
  ppm = 5,
): { gray: Gray; cx: number; cy: number } {
  const face = makeFace("air-pistol", 4.5);
  const width = 1000;
  const height = 1100;
  const cx = 520;
  const cy = 540;
  const data = new Uint8Array(width * height);
  const black = (face.blackBullDiameterMm / 2) * ppm;
  const paper = 95 * ppm;
  let seed = 3;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 16;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      let value = Math.abs(dx) < paper && Math.abs(dy) < paper ? 232 : 85;
      if (d <= black) value = 24;
      for (const diameter of face.diametersMm) {
        if (Math.abs(d - (diameter / 2) * ppm) < 0.6) value = d < black - 1 ? 225 : 24;
      }
      for (const hole of holes) {
        if (Math.hypot(dx - hole.x * ppm, dy - hole.y * ppm) <= 2.25 * ppm) value = 140;
      }
      data[y * width + x] = Math.max(0, Math.min(255, value + noise()));
    }
  }
  return { gray: { width, height, data }, cx, cy };
}

describe("photo detection helpers", () => {
  it("finds the Otsu threshold between two populations", () => {
    const data = new Uint8Array([...Array(500).fill(30), ...Array(500).fill(220)]);
    const t = otsu(data);
    assert.ok(t >= 30 && t < 220);
  });

  it("fits a circle through points", () => {
    const points = Array.from({ length: 36 }, (_, i) => ({
      x: 50 + 20 * Math.cos((i / 36) * Math.PI * 2),
      y: 40 + 20 * Math.sin((i / 36) * Math.PI * 2),
    }));
    const circle = fitCircle(points)!;
    assert.ok(
      Math.abs(circle.cx - 50) < 1e-6 &&
        Math.abs(circle.cy - 40) < 1e-6 &&
        Math.abs(circle.r - 20) < 1e-6,
    );
  });

  it("opening removes thin lines but keeps discs", () => {
    const w = 40;
    const h = 40;
    const mask = new Uint8Array(w * h);
    for (let x = 0; x < w; x += 1) mask[5 * w + x] = 1; // 1 px line
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) if ((x - 25) ** 2 + (y - 25) ** 2 <= 36) mask[y * w + x] = 1;
    const opened = dilate(erode(mask, w, h, 2), w, h, 2);
    assert.equal(opened[5 * w + 10], 0);
    assert.equal(opened[25 * w + 25], 1);
  });
});

describe("reading a target photo", () => {
  const face = makeFace("air-pistol", 4.5);
  const truth = [
    { x: 0.4, y: -0.6 },
    { x: 2.8, y: 0.6 },
    { x: -11, y: 4 },
    { x: 20, y: -18 },
    { x: -45, y: 30 },
  ];
  const photo = synthetic(truth);

  it("locates the black bull and the scale", () => {
    const bull = findBull(photo.gray)!;
    assert.ok(
      Math.hypot(bull.cx - photo.cx, bull.cy - photo.cy) < 2,
      `centre ${bull.cx},${bull.cy}`,
    );
    assert.ok(Math.abs(bull.r / 5 - face.blackBullDiameterMm / 2) < 0.6, `radius ${bull.r}`);
  });

  it("finds every hole, including two touching tens, and scores them right", () => {
    const result = detectHoles(photo.gray, {
      cx: photo.cx,
      cy: photo.cy,
      pxPerMm: 5,
      blackRadiusMm: face.blackBullDiameterMm / 2,
      outerRadiusMm: face.diametersMm[0] / 2,
      pelletRadiusMm: 2.25,
    });
    assert.equal(result.holes.length, truth.length);
    const sum = (list: { x: number; y: number }[]) =>
      list.reduce((total, hole) => total + scoreShot(face, hole.x, hole.y).score, 0);
    assert.equal(sum(result.holes), sum(truth));
    for (const hole of truth) {
      assert.ok(
        result.holes.some((found) => Math.hypot(found.x - hole.x, found.y - hole.y) < 1.2),
        `missing hole at ${hole.x},${hole.y}`,
      );
    }
  });
});

describe("snapping a manual alignment", () => {
  it("pulls a misplaced circle back onto the black", async () => {
    const { snapToBull } = await import("./photo-detect.ts");
    const photo = synthetic([{ x: 10, y: 5 }]);
    const black = 29.75 * 5;
    const snapped = snapToBull(photo.gray, {
      cx: photo.cx + 14,
      cy: photo.cy - 9,
      r: black * 1.08,
    })!;
    assert.ok(snapped, "no snap");
    assert.ok(Math.hypot(snapped.cx - photo.cx, snapped.cy - photo.cy) < 2);
    assert.ok(Math.abs(snapped.r - black) < 3);
  });
});
