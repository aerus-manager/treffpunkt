/**
 * On-device reading of a photographed ring target. No network, no model:
 * 1. `findBull` locates the black aiming mark (a dark disc of known diameter),
 *    which gives the centre and the scale in pixels per millimetre.
 * 2. `detectHoles` looks, inside the known ring geometry, for spots that have
 *    the "wrong" brightness: dark spots on the white part, light spots on the
 *    black part. Thin printed lines and digits are removed with a morphological
 *    opening sized to the pellet; touching holes are split with k-means.
 * The result is a set of suggestions the shooter reviews before saving.
 */

export type Gray = { width: number; height: number; data: Uint8Array };
export type Circle = { cx: number; cy: number; r: number };
export type HolePoint = { x: number; y: number };

export function toGray(rgba: Uint8ClampedArray, width: number, height: number): Gray {
  const data = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
    data[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
  return { width, height, data };
}

export function otsu(data: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const value of data) hist[value] += 1;
  const total = data.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0;
  let weightB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t += 1) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const between = weightB * weightF * (meanB - meanF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/* ----------------------------- binary morphology ----------------------------- */

/** Square-free disc offsets for a radius, used by erode/dilate. */
function discRows(radius: number): number[] {
  const rows: number[] = [];
  for (let dy = -radius; dy <= radius; dy += 1)
    rows.push(Math.floor(Math.sqrt(radius * radius - dy * dy)));
  return rows;
}

/**
 * Erosion/dilation with a disc, done as a 1-D run per row using prefix sums,
 * so cost is O(pixels × diameter) rather than O(pixels × area).
 */
function morph(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
  erode: boolean,
): Uint8Array {
  if (radius <= 0) return mask.slice();
  const rows = discRows(radius);
  // Row prefix sums of the mask.
  const prefix = new Int32Array((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    let acc = 0;
    const base = y * (width + 1);
    for (let x = 0; x < width; x += 1) {
      acc += mask[y * width + x];
      prefix[base + x + 1] = acc;
    }
  }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let result = erode ? 1 : 0;
      for (let k = 0; k < rows.length; k += 1) {
        const yy = y + k - radius;
        const half = rows[k];
        const x0 = x - half;
        const x1 = x + half;
        if (yy < 0 || yy >= height) {
          if (erode) {
            result = 0;
            break;
          }
          continue;
        }
        const a = Math.max(0, x0);
        const b = Math.min(width - 1, x1);
        const base = yy * (width + 1);
        const count = prefix[base + b + 1] - prefix[base + a];
        if (erode) {
          if (x0 < 0 || x1 >= width || count < x1 - x0 + 1) {
            result = 0;
            break;
          }
        } else if (count > 0) {
          result = 1;
          break;
        }
      }
      out[y * width + x] = result;
    }
  }
  return out;
}

export const erode = (m: Uint8Array, w: number, h: number, r: number) => morph(m, w, h, r, true);
export const dilate = (m: Uint8Array, w: number, h: number, r: number) => morph(m, w, h, r, false);

/* ---------------------------- connected components --------------------------- */

export type Component = {
  area: number;
  sumX: number;
  sumY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pixels: number[];
};

export function components(
  mask: Uint8Array,
  width: number,
  height: number,
  keepPixels = false,
): Component[] {
  const seen = new Uint8Array(mask.length);
  const stack: number[] = [];
  const list: Component[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    const comp: Component = {
      area: 0,
      sumX: 0,
      sumY: 0,
      minX: width,
      maxX: 0,
      minY: height,
      maxY: 0,
      pixels: [],
    };
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;
      comp.area += 1;
      comp.sumX += x;
      comp.sumY += y;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      if (keepPixels) comp.pixels.push(index);
      if (x > 0 && mask[index - 1] && !seen[index - 1]) {
        seen[index - 1] = 1;
        stack.push(index - 1);
      }
      if (x < width - 1 && mask[index + 1] && !seen[index + 1]) {
        seen[index + 1] = 1;
        stack.push(index + 1);
      }
      if (y > 0 && mask[index - width] && !seen[index - width]) {
        seen[index - width] = 1;
        stack.push(index - width);
      }
      if (y < height - 1 && mask[index + width] && !seen[index + width]) {
        seen[index + width] = 1;
        stack.push(index + width);
      }
    }
    list.push(comp);
  }
  return list;
}

/* --------------------------------- the bull --------------------------------- */

/** Least-squares circle through points (Kåsa fit). */
export function fitCircle(points: HolePoint[]): Circle | null {
  if (points.length < 3) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / points.length;
  const my = sy / points.length;
  let suu = 0;
  let svv = 0;
  let suv = 0;
  let suuu = 0;
  let svvv = 0;
  let suvv = 0;
  let svuu = 0;
  for (const p of points) {
    const u = p.x - mx;
    const v = p.y - my;
    suu += u * u;
    svv += v * v;
    suv += u * v;
    suuu += u * u * u;
    svvv += v * v * v;
    suvv += u * v * v;
    svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-9) return null;
  const a = (suuu + suvv) / 2;
  const b = (svvv + svuu) / 2;
  const uc = (a * svv - b * suv) / det;
  const vc = (b * suu - a * suv) / det;
  const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / points.length);
  return { cx: uc + mx, cy: vc + my, r };
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Find the black aiming mark: the largest roughly round dark region that does not
 * touch the image border, preferring ones near the middle. The rough circle is
 * then refined from radial dark-to-light edges.
 */
export function findBull(gray: Gray): Circle | null {
  const { width, height, data } = gray;
  const threshold = otsu(data);
  let mask: Uint8Array = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) mask[i] = data[i] < threshold ? 1 : 0;
  // Bridge white ring lines and holes inside the black so it reads as one blob.
  const bridge = Math.max(1, Math.round(Math.min(width, height) / 250));
  mask = erode(dilate(mask, width, height, bridge), width, height, bridge);

  let best: { comp: Component; score: number } | null = null;
  const minSide = Math.min(width, height);
  for (const comp of components(mask, width, height)) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    if (bw < minSide * 0.04 || bh < minSide * 0.04) continue;
    // The closing erodes against the image edge, so "touching the border" needs a margin.
    const margin = bridge + 2;
    if (
      comp.minX <= margin ||
      comp.minY <= margin ||
      comp.maxX >= width - 1 - margin ||
      comp.maxY >= height - 1 - margin
    )
      continue;
    const aspect = Math.min(bw, bh) / Math.max(bw, bh);
    if (aspect < 0.7) continue;
    const radius = (bw + bh) / 4;
    const fill = comp.area / (Math.PI * radius * radius);
    if (fill < 0.5 || fill > 1.15) continue;
    const bx = (comp.minX + comp.maxX) / 2;
    const by = (comp.minY + comp.maxY) / 2;
    const offCentre = Math.hypot(bx - width / 2, by - height / 2) / minSide;
    const score = comp.area * aspect * fill * (1 - Math.min(0.8, offCentre));
    if (!best || score > best.score) best = { comp, score };
  }
  if (!best) return null;

  const { comp } = best;
  const rough: Circle = {
    cx: (comp.minX + comp.maxX) / 2,
    cy: (comp.minY + comp.maxY) / 2,
    r: (comp.maxX - comp.minX + comp.maxY - comp.minY + 2) / 4,
  };
  return refineEdge(gray, rough, threshold) ?? rough;
}

/** Walk outward along rays and fit a circle through the dark→light transitions. */
export function refineEdge(gray: Gray, rough: Circle, threshold: number): Circle | null {
  const { width, height, data } = gray;
  const edges: HolePoint[] = [];
  for (let step = 0; step < 72; step += 1) {
    const angle = (step / 72) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let found = -1;
    // From well inside the black outwards: first run of light pixels marks the edge.
    for (let d = rough.r * 0.75; d <= rough.r * 1.3; d += 0.5) {
      const x = Math.round(rough.cx + dx * d);
      const y = Math.round(rough.cy + dy * d);
      if (x < 0 || y < 0 || x >= width || y >= height) break;
      if (data[y * width + x] >= threshold) {
        // Require it to stay light for a moment, so white ring lines inside the black do not count.
        let light = true;
        for (let k = 1; k <= 3; k += 1) {
          const xx = Math.round(rough.cx + dx * (d + k));
          const yy = Math.round(rough.cy + dy * (d + k));
          if (
            xx < 0 ||
            yy < 0 ||
            xx >= width ||
            yy >= height ||
            data[yy * width + xx] < threshold
          ) {
            light = false;
            break;
          }
        }
        if (light) {
          found = d;
          break;
        }
      }
    }
    if (found > 0) edges.push({ x: rough.cx + dx * found, y: rough.cy + dy * found });
  }
  if (edges.length < 24) return null;
  // Drop rays that hit a hole on the edge: keep distances near the median.
  const fit1 = fitCircle(edges);
  if (!fit1) return null;
  const dists = edges.map((p) => Math.hypot(p.x - fit1.cx, p.y - fit1.cy));
  const mid = median(dists);
  const kept = edges.filter((_, i) => Math.abs(dists[i] - mid) < mid * 0.04 + 1);
  return fitCircle(kept.length >= 12 ? kept : edges);
}

/* --------------------------------- the holes -------------------------------- */

export type HoleParams = {
  /** Bull centre and black radius in this image's pixels. */
  cx: number;
  cy: number;
  pxPerMm: number;
  blackRadiusMm: number;
  outerRadiusMm: number;
  pelletRadiusMm: number;
};

export type HoleResult = {
  /** Hole centres in mm relative to the target centre. */
  holes: HolePoint[];
  /** Brightness difference between paper and black; low means a poor photo. */
  contrast: number;
};

export function detectHoles(gray: Gray, params: HoleParams): HoleResult {
  const { width, height, data } = gray;
  const ppm = params.pxPerMm;
  const blackR = params.blackRadiusMm * ppm;
  const outerR = (params.outerRadiusMm + params.pelletRadiusMm * 2) * ppm;
  const pelletR = params.pelletRadiusMm * ppm;

  const dark: number[] = [];
  const light: number[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const d = Math.hypot(x - params.cx, y - params.cy);
      const value = data[y * width + x];
      if (d < blackR * 0.92) dark.push(value);
      else if (d > blackR * 1.08 && d < outerR * 0.95) light.push(value);
    }
  }
  const lb = median(dark);
  const lw = light.length > 50 ? median(light) : 235;
  const contrast = lw - lb;
  const delta = Math.max(18, contrast * 0.3);

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = Math.hypot(x - params.cx, y - params.cy);
      if (d > outerR) continue;
      const value = data[y * width + x];
      if (d < blackR - 1) {
        if (value > lb + delta) mask[y * width + x] = 1;
      } else if (d > blackR + 1) {
        if (value < lw - delta) mask[y * width + x] = 1;
      } else if (value > lb + delta && value < lw - delta) {
        // On the edge of the black: a hole shows as neither paper nor black.
        mask[y * width + x] = 1;
      }
    }
  }

  // Remove printed ring lines and digits: thinner than half a pellet.
  const openR = Math.max(1, Math.round(pelletR * 0.45));
  const opened = dilate(erode(mask, width, height, openR), width, height, openR);
  // Merge the two halves of a hole cut by the black edge.
  const merged = erode(dilate(opened, width, height, 1), width, height, 1);

  const expected = Math.PI * pelletR * pelletR;
  const holes: HolePoint[] = [];
  const minSide = pelletR * 1.6;
  for (const comp of components(merged, width, height, true)) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    // A hole is a round blob about one pellet wide. Remains of printed digits
    // survive the opening only as narrower, smaller pieces.
    if (comp.area < expected * 0.6 || Math.min(bw, bh) < minSide) continue;
    const centres = splitBlob(comp, width, pelletR, expected);
    for (const centre of centres) {
      holes.push({ x: (centre.x - params.cx) / ppm, y: (centre.y - params.cy) / ppm });
    }
  }
  return { holes, contrast };
}

/**
 * How many pellet-sized discs best explain a blob? Overlapping holes cover
 * less than k × one hole, so area alone undercounts. Try k discs placed by
 * k-means and keep the k whose union matches the blob best (IoU).
 */
export function splitBlob(
  comp: Component,
  width: number,
  pelletR: number,
  expected: number,
): HolePoint[] {
  const single = [{ x: comp.sumX / comp.area, y: comp.sumY / comp.area }];
  if (comp.area < expected * 1.25) return single;
  const blob = new Set(comp.pixels);
  const maxK = Math.min(8, Math.ceil(comp.area / (expected * 0.45)));
  let best = { centres: single, iou: discIoU(single, blob, comp, width, pelletR) };
  for (let k = 2; k <= maxK; k += 1) {
    const centres = kmeans(comp.pixels, width, k);
    const iou = discIoU(centres, blob, comp, width, pelletR);
    // A more complex explanation has to be clearly better.
    if (iou > best.iou + 0.03) best = { centres, iou };
  }
  return best.centres;
}

function discIoU(
  centres: HolePoint[],
  blob: Set<number>,
  comp: Component,
  width: number,
  r: number,
): number {
  const pad = Math.ceil(r) + 1;
  let inter = 0;
  let union = 0;
  const r2 = r * r;
  for (let y = comp.minY - pad; y <= comp.maxY + pad; y += 1) {
    for (let x = comp.minX - pad; x <= comp.maxX + pad; x += 1) {
      const inBlob = x >= 0 && x < width && blob.has(y * width + x);
      const inDisc = centres.some((c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= r2);
      if (inBlob && inDisc) inter += 1;
      if (inBlob || inDisc) union += 1;
    }
  }
  return union ? inter / union : 0;
}

/** Split a blob of touching holes into `k` centres. */
export function kmeans(pixels: number[], width: number, k: number): HolePoint[] {
  const points = pixels.map((index) => ({ x: index % width, y: Math.floor(index / width) }));
  // Seed along the blob's longest axis spread.
  const sorted = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  let centres = Array.from({ length: k }, (_, i) => ({
    ...sorted[Math.floor(((i + 0.5) / k) * sorted.length)],
  }));
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const sums = centres.map(() => ({ x: 0, y: 0, n: 0 }));
    for (const p of points) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centres.length; c += 1) {
        const d = (p.x - centres[c].x) ** 2 + (p.y - centres[c].y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      sums[best].x += p.x;
      sums[best].y += p.y;
      sums[best].n += 1;
    }
    centres = sums.map((s, i) => (s.n ? { x: s.x / s.n, y: s.y / s.n } : centres[i]));
  }
  return centres;
}

/**
 * Snap a roughly placed circle (from the shooter's manual alignment) onto the
 * real black. Looks for the dark disc of about the right size near the hint,
 * using a threshold from that neighbourhood only (a dark table elsewhere in the
 * photo does not skew it), then refines the edge. Null if nothing convincing.
 */
export function snapToBull(gray: Gray, rough: Circle): Circle | null {
  const reach = rough.r * 2;
  const x0 = Math.max(0, Math.floor(rough.cx - reach));
  const y0 = Math.max(0, Math.floor(rough.cy - reach));
  const x1 = Math.min(gray.width, Math.ceil(rough.cx + reach));
  const y1 = Math.min(gray.height, Math.ceil(rough.cy + reach));
  // Work on a downscaled crop so this stays fast on a full photo.
  const scale = Math.min(1, 300 / Math.max(1, x1 - x0, y1 - y0));
  const w = Math.max(1, Math.round((x1 - x0) * scale));
  const h = Math.max(1, Math.round((y1 - y0) * scale));
  const crop = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(gray.width - 1, Math.round(x0 + x / scale));
      const sy = Math.min(gray.height - 1, Math.round(y0 + y / scale));
      crop[y * w + x] = gray.data[sy * gray.width + sx];
    }
  }
  const threshold = otsu(crop);
  let mask: Uint8Array = new Uint8Array(w * h);
  for (let i = 0; i < crop.length; i += 1) mask[i] = crop[i] < threshold ? 1 : 0;
  mask = erode(dilate(mask, w, h, 2), w, h, 2);

  const hintX = (rough.cx - x0) * scale;
  const hintY = (rough.cy - y0) * scale;
  const hintR = rough.r * scale;
  let best: { circle: Circle; cost: number } | null = null;
  for (const comp of components(mask, w, h)) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    if (Math.min(bw, bh) / Math.max(bw, bh) < 0.7) continue;
    const r = (bw + bh) / 4;
    if (r < hintR * 0.6 || r > hintR * 1.5) continue;
    const cx = (comp.minX + comp.maxX) / 2;
    const cy = (comp.minY + comp.maxY) / 2;
    const cost = Math.hypot(cx - hintX, cy - hintY) / hintR + Math.abs(r / hintR - 1);
    if (cost < 1.2 && (!best || cost < best.cost)) best = { circle: { cx, cy, r }, cost };
  }
  if (!best) return null;
  const coarse: Circle = {
    cx: x0 + best.circle.cx / scale,
    cy: y0 + best.circle.cy / scale,
    r: best.circle.r / scale,
  };
  const refined = refineEdge(gray, coarse, threshold);
  return refined && Math.abs(refined.r / coarse.r - 1) < 0.2 ? refined : coarse;
}
