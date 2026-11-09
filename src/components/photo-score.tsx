import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Camera, Check, ImageUp, Move, ScanSearch, X } from "lucide-react";
import { highestRing, scoreShot, type Face } from "@/lib/treffpunkt/faces";
import {
  detectHoles,
  findBull,
  snapToBull,
  toGray,
  type Circle,
  type Gray,
  type HolePoint,
} from "@/lib/treffpunkt/photo-detect";

/** Longest side of the image kept for display and analysis. */
const MAX_SIDE = 1600;
/** Side used to find the black aiming mark (faster, and enough for that). */
const FIND_SIDE = 800;
/** Pellet radius in pixels for hole detection. */
const PELLET_PX = 6;

type Loaded = { url: string; canvas: HTMLCanvasElement; width: number; height: number };
type Status = { tone: "info" | "warn"; text: string } | null;

export function PhotoScore({
  face,
  room,
  onCancel,
  onUse,
}: {
  face: Face;
  /** Shots still open in the current series. */
  room: number;
  onCancel: () => void;
  onUse: (holes: HolePoint[]) => void;
}) {
  const [image, setImage] = useState<Loaded | null>(null);
  const [calib, setCalib] = useState<Circle | null>(null);
  /** Radius found (or guessed) for the black; the size slider works around it. */
  const [baseR, setBaseR] = useState(1);
  const [holes, setHoles] = useState<HolePoint[]>([]);
  const [adjust, setAdjust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  /** Grayscale of the whole photo, for snapping a manual alignment to the black's edge. */
  const fullGray = useRef<Gray | null>(null);

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  const blackMm = face.blackBullDiameterMm / 2;
  const outerMm = (face.diametersMm[0] ?? 100) / 2;
  const pelletMm = face.caliberMm / 2;

  const detect = useCallback(
    (loaded: Loaded, circle: Circle) => {
      const ppmImage = circle.r / blackMm;
      const ppm = PELLET_PX / pelletMm;
      const halfMm = outerMm + pelletMm * 3;
      const size = Math.round(halfMm * ppm * 2);
      const work = document.createElement("canvas");
      work.width = size;
      work.height = size;
      const ctx = work.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      const halfImage = halfMm * ppmImage;
      ctx.drawImage(
        loaded.canvas,
        circle.cx - halfImage,
        circle.cy - halfImage,
        halfImage * 2,
        halfImage * 2,
        0,
        0,
        size,
        size,
      );
      const gray = toGray(ctx.getImageData(0, 0, size, size).data, size, size);
      const result = detectHoles(gray, {
        cx: size / 2,
        cy: size / 2,
        pxPerMm: ppm,
        blackRadiusMm: blackMm,
        outerRadiusMm: outerMm,
        pelletRadiusMm: pelletMm,
      });
      setHoles(result.holes);
      if (result.holes.length > Math.max(6, room * 2)) {
        setStatus({
          tone: "warn",
          text: "Uvanlig mange treff. Ringene passer kanskje ikke: trykk «Juster ringene».",
        });
      } else if (result.contrast < 60) {
        setStatus({
          tone: "warn",
          text: "Lite kontrast i bildet. Sjekk hullene nøye, eller ta et nytt bilde i bedre lys.",
        });
      } else if (result.holes.length === 0) {
        setStatus({ tone: "warn", text: "Fant ingen hull. Trykk på bildet der skuddene satt." });
      } else {
        setStatus({
          tone: "info",
          text: "Sjekk hullene. Trykk på et merke for å fjerne det, eller på bildet for å legge til.",
        });
      }
    },
    [blackMm, outerMm, pelletMm, room],
  );

  const load = async (file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      const loaded: Loaded = {
        url: blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/jpeg", 0.85),
        canvas,
        width: canvas.width,
        height: canvas.height,
      };
      setImage(loaded);
      fullGray.current = toGray(
        canvas
          .getContext("2d", { willReadFrequently: true })!
          .getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );

      const small = Math.min(1, FIND_SIDE / Math.max(canvas.width, canvas.height));
      const findCanvas = document.createElement("canvas");
      findCanvas.width = Math.round(canvas.width * small);
      findCanvas.height = Math.round(canvas.height * small);
      const fctx = findCanvas.getContext("2d", { willReadFrequently: true })!;
      fctx.drawImage(canvas, 0, 0, findCanvas.width, findCanvas.height);
      const gray: Gray = toGray(
        fctx.getImageData(0, 0, findCanvas.width, findCanvas.height).data,
        findCanvas.width,
        findCanvas.height,
      );
      const found = findBull(gray);
      if (found) {
        const circle = { cx: found.cx / small, cy: found.cy / small, r: found.r / small };
        setCalib(circle);
        setBaseR(circle.r);
        setAdjust(false);
        detect(loaded, circle);
      } else {
        const guess = Math.min(canvas.width, canvas.height) * 0.2;
        setCalib({ cx: canvas.width / 2, cy: canvas.height / 2, r: guess });
        setBaseR(guess);
        setHoles([]);
        setAdjust(true);
        setStatus({
          tone: "warn",
          text: "Fant ikke det svarte feltet. Dra bildet og bruk glidebryteren til ringene passer.",
        });
      }
    } catch {
      setStatus({ tone: "warn", text: "Kunne ikke lese bildet." });
    } finally {
      setBusy(false);
    }
  };

  const pick = (input: HTMLInputElement | null) => {
    const file = input?.files?.[0];
    if (input) input.value = "";
    if (file) void load(file);
  };

  const scored = holes.map((hole) => scoreShot(face, hole.x, hole.y));
  const total = scored.reduce((sum, item) => sum + item.score, 0);
  const inner = scored.filter((item) => item.innerTen).length;
  const used = Math.min(holes.length, room);

  return (
    <section className="mt-3" aria-label="Tolk bilde av skiva">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => pick(event.currentTarget)}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => pick(event.currentTarget)}
      />

      {!image ? (
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="font-medium">Ta bilde av skiva</p>
          <p className="mt-1 text-sm text-muted">
            Hold telefonen rett over skiva, med hele skiva i bildet og jevnt lys. Bildet tolkes på
            telefonen og sendes ikke noe sted.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraInput.current?.click()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brass font-semibold text-brass-ink disabled:opacity-50"
            >
              <Camera className="size-4" aria-hidden="true" />
              Ta bilde
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryInput.current?.click()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium disabled:opacity-50"
            >
              <ImageUp className="size-4" aria-hidden="true" />
              Velg bilde
            </button>
          </div>
          {busy ? <p className="mt-3 text-sm text-muted">Leser bildet…</p> : null}
        </div>
      ) : null}

      {image && calib ? (
        <>
          <PhotoOverlay
            face={face}
            image={image}
            calib={calib}
            holes={holes}
            adjust={adjust}
            onMove={(dxMm, dyMm) =>
              setCalib((current) =>
                current
                  ? {
                      ...current,
                      cx: current.cx - dxMm * (current.r / blackMm),
                      cy: current.cy - dyMm * (current.r / blackMm),
                    }
                  : current,
              )
            }
            onToggleHole={(point) => {
              setHoles((current) => {
                const near = current.findIndex(
                  (hole) =>
                    Math.hypot(hole.x - point.x, hole.y - point.y) <
                    Math.max(pelletMm * 1.6, outerMm / 40),
                );
                return near >= 0
                  ? current.filter((_, index) => index !== near)
                  : [...current, point];
              });
            }}
          />
          {adjust ? (
            <label className="mt-3 block text-sm text-muted">
              Størrelse på ringene
              <input
                type="range"
                min={baseR * 0.7}
                max={baseR * 1.3}
                step={baseR / 1000}
                value={calib.r}
                onChange={(event) => {
                  const r = Number(event.currentTarget.value);
                  setCalib((current) => (current ? { ...current, r } : current));
                }}
                className="mt-2 w-full accent-[var(--color-brass)]"
              />
            </label>
          ) : null}
          {status ? (
            <p
              role="status"
              className={`mt-3 text-sm ${status.tone === "warn" ? "text-miss" : "text-muted"}`}
            >
              {status.text}
            </p>
          ) : null}
          <p className="mt-2 text-sm tabular-nums">
            {holes.length} hull · <span className="font-score text-xl text-brass">{total}</span>
            {inner ? ` · ${inner}X` : ""}
            {holes.length > room ? (
              <span className="text-miss"> · serien har bare plass til {room}</span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (adjust) {
                  // Treat the manual alignment as a hint and snap it to the black's real edge.
                  const snapped =
                    (fullGray.current && snapToBull(fullGray.current, calib)) || calib;
                  setCalib(snapped);
                  detect(image, snapped);
                } else {
                  setStatus({
                    tone: "info",
                    text: "Dra bildet og bruk glidebryteren til ringene ligger omtrent over skiva. Appen finjusterer selv.",
                  });
                }
                setAdjust((value) => !value);
              }}
              aria-pressed={adjust}
              className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm"
            >
              {adjust ? (
                <ScanSearch className="size-4" aria-hidden="true" />
              ) : (
                <Move className="size-4" aria-hidden="true" />
              )}
              {adjust ? "Finn hull på nytt" : "Juster ringene"}
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm"
            >
              <Camera className="size-4" aria-hidden="true" />
              Nytt bilde
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-12 items-center gap-1 rounded-full border border-line px-4 text-sm"
            >
              <X className="size-4" aria-hidden="true" />
              Avbryt
            </button>
            <button
              type="button"
              disabled={used === 0 || adjust}
              onClick={() => onUse(orderForSeries(holes).slice(0, room))}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brass font-semibold text-brass-ink disabled:opacity-40"
            >
              <Check className="size-4" aria-hidden="true" />
              Bruk {used} skudd
            </button>
          </div>
        </>
      ) : null}

      {!image ? (
        <button type="button" onClick={onCancel} className="mt-3 h-11 text-sm text-muted">
          Avbryt
        </button>
      ) : null}
    </section>
  );
}

/** Shot order is unknown from a photo; list the best first so the series reads naturally. */
function orderForSeries(holes: HolePoint[]): HolePoint[] {
  return [...holes].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
}

function PhotoOverlay({
  face,
  image,
  calib,
  holes,
  adjust,
  onMove,
  onToggleHole,
}: {
  face: Face;
  image: Loaded;
  calib: Circle;
  holes: HolePoint[];
  adjust: boolean;
  onMove: (dxMm: number, dyMm: number) => void;
  onToggleHole: (point: HolePoint) => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const ppm = calib.r / (face.blackBullDiameterMm / 2);
  const outer = (face.diametersMm[0] ?? 100) / 2;
  const half = outer + face.caliberMm * 3;
  const stroke = half / 250;
  const holeR = Math.max(face.caliberMm / 2, half / 70);

  const toMm = (event: PointerEvent<SVGSVGElement>): HolePoint | null => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };

  const rings: number[] = [];
  for (let ring = face.lowestRing; ring <= highestRing(face); ring += 1) {
    const diameter = face.diametersMm[ring - face.lowestRing];
    if (diameter != null) rings.push(diameter / 2);
  }

  return (
    <svg
      viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
      className="block w-full touch-none rounded-card bg-bg select-none"
      role="img"
      aria-label={
        adjust
          ? "Dra bildet til ringene passer over skiva"
          : "Bilde av skiva med funne hull. Trykk for å legge til eller fjerne."
      }
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const p = toMm(event);
        if (!p) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: p.x, y: p.y, moved: false };
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (!state || state.id !== event.pointerId || !adjust) return;
        const p = toMm(event);
        if (!p) return;
        state.moved = true;
        onMove(p.x - state.x, p.y - state.y);
        // Incremental: the view stays centred on the target, so compare with the last position.
        state.x = p.x;
        state.y = p.y;
      }}
      onPointerUp={(event) => {
        const state = drag.current;
        drag.current = null;
        if (!state || state.id !== event.pointerId || adjust || state.moved) return;
        const p = toMm(event);
        if (p) onToggleHole(p);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <image
        href={image.url}
        x={-calib.cx / ppm}
        y={-calib.cy / ppm}
        width={image.width / ppm}
        height={image.height / ppm}
        preserveAspectRatio="none"
      />
      {rings.map((radius) => (
        <circle
          key={radius}
          cx={0}
          cy={0}
          r={radius}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth={stroke}
          opacity={adjust ? 0.95 : 0.5}
        />
      ))}
      {!adjust
        ? holes.map((hole, index) => {
            const { score, innerTen } = scoreShot(face, hole.x, hole.y);
            return (
              <g key={`${hole.x.toFixed(2)}:${hole.y.toFixed(2)}:${index}`}>
                <circle
                  cx={hole.x}
                  cy={hole.y}
                  r={holeR}
                  fill="none"
                  stroke="var(--color-miss)"
                  strokeWidth={stroke * 2.5}
                />
                <text
                  x={hole.x}
                  y={hole.y - holeR * 1.6}
                  textAnchor="middle"
                  fontSize={holeR * 1.6}
                  fontWeight={700}
                  fill="var(--color-miss)"
                  stroke="var(--color-bg)"
                  strokeWidth={holeR * 0.35}
                  paintOrder="stroke"
                >
                  {score === 0 ? "0" : `${score}${innerTen ? "X" : ""}`}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}
