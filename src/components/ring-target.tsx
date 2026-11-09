import { memo, useMemo, useRef, useState, type PointerEvent } from "react";
import { highestRing, scoreShot, type Face } from "@/lib/treffpunkt/faces";
import type { RingShot } from "@/lib/treffpunkt/session";

type Point = { x: number; y: number };

/**
 * Ring target. Press to place a hole, drag to fine-tune (the live ring value is
 * shown while dragging), release to commit. `zoom` frames the black bull.
 */
export const RingTarget = memo(function RingTarget({
  face,
  shots,
  readOnly,
  zoom = false,
  highlightLast = false,
  onPlace,
}: {
  face: Face;
  shots: RingShot[];
  readOnly?: boolean;
  zoom?: boolean;
  highlightLast?: boolean;
  onPlace?: (xMm: number, yMm: number) => void;
}) {
  const [pending, setPending] = useState<Point | null>(null);
  const pointerId = useRef<number | null>(null);

  const outer = face.diametersMm[0] ?? 100;
  const black = face.blackBullDiameterMm / 2;
  const half = zoom
    ? Math.min(black + face.caliberMm * 2, outer / 2 + face.caliberMm)
    : outer / 2 + face.caliberMm;
  const span = half * 2;
  const stroke = Math.max(half / 160, 0.3);
  const hole = Math.max(face.caliberMm / 2, half / 60);

  const rings = useMemo(() => {
    const list: { ring: number; radius: number; inner: number; onBlack: boolean }[] = [];
    for (let ring = face.lowestRing; ring <= highestRing(face); ring += 1) {
      const diameter = face.diametersMm[ring - face.lowestRing];
      if (diameter == null) continue;
      const next = face.diametersMm[ring - face.lowestRing + 1];
      list.push({
        ring,
        radius: diameter / 2,
        inner: next != null ? next / 2 : 0,
        onBlack: diameter / 2 <= black + 0.01,
      });
    }
    return list;
  }, [face, black]);

  const toLocal = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  const interactive = !readOnly && !!onPlace;

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive || pointerId.current != null) return;
    const local = toLocal(event);
    if (!local) return;
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPending(local);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== pointerId.current) return;
    const local = toLocal(event);
    if (local) setPending(local);
  };
  const up = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    const local = toLocal(event) ?? pending;
    setPending(null);
    if (local && onPlace) onPlace(local.x, local.y);
  };
  const cancel = () => {
    pointerId.current = null;
    setPending(null);
  };

  const preview = pending ? scoreShot(face, pending.x, pending.y) : null;
  const drawn = shots.filter((shot) => !shot.manual);
  const fontSize = (radius: number, inner: number) =>
    Math.max(Math.min((radius - inner) * 0.55, half / 9), 0.1);

  return (
    <div className="relative">
      <svg
        viewBox={`${-half} ${-half} ${span} ${span}`}
        className="block w-full touch-none rounded-card bg-fg select-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        role="img"
        aria-label={
          readOnly
            ? `Skive med ${drawn.length} treff`
            : "Trykk og dra der skuddet satt, slipp for å sette det"
        }
      >
        <rect x={-half} y={-half} width={span} height={span} fill="var(--color-fg)" />
        <circle cx={0} cy={0} r={black} fill="var(--color-bg)" />
        {rings.map((ring) => (
          <circle
            key={ring.ring}
            cx={0}
            cy={0}
            r={ring.radius}
            fill="none"
            stroke={ring.onBlack ? "var(--color-fg)" : "var(--color-bg)"}
            strokeWidth={stroke}
          />
        ))}
        {face.innerTenDiameterMm != null ? (
          <circle
            cx={0}
            cy={0}
            r={face.innerTenDiameterMm / 2}
            fill="none"
            stroke="var(--color-brass)"
            strokeWidth={stroke}
          />
        ) : null}
        {rings
          .filter((ring) => ring.inner > 0 && fontSize(ring.radius, ring.inner) > half / 40)
          .map((ring) => {
            const x = (ring.radius + ring.inner) / 2;
            const size = fontSize(ring.radius, ring.inner);
            const color = ring.onBlack ? "var(--color-fg)" : "var(--color-bg)";
            return (
              <g
                key={`n${ring.ring}`}
                fontSize={size}
                fill={color}
                opacity={0.75}
                textAnchor="middle"
                dominantBaseline="central"
              >
                <text x={x} y={0}>
                  {ring.ring}
                </text>
                <text x={-x} y={0}>
                  {ring.ring}
                </text>
                <text x={0} y={-x}>
                  {ring.ring}
                </text>
                <text x={0} y={x}>
                  {ring.ring}
                </text>
              </g>
            );
          })}
        {drawn.map((shot, index) => {
          const last = highlightLast && index === drawn.length - 1;
          return (
            <circle
              key={index}
              cx={shot.xMm}
              cy={shot.yMm}
              r={hole}
              fill={last ? "var(--color-brass)" : "var(--color-brass)"}
              fillOpacity={last || !highlightLast ? 1 : 0.7}
              stroke={last ? "var(--color-fg)" : "var(--color-brass-ink)"}
              strokeWidth={last ? stroke * 1.5 : stroke / 2}
            />
          );
        })}
        {pending ? (
          <>
            <line
              x1={pending.x - hole * 3}
              y1={pending.y}
              x2={pending.x + hole * 3}
              y2={pending.y}
              stroke="var(--color-miss)"
              strokeWidth={stroke}
            />
            <line
              x1={pending.x}
              y1={pending.y - hole * 3}
              x2={pending.x}
              y2={pending.y + hole * 3}
              stroke="var(--color-miss)"
              strokeWidth={stroke}
            />
            <circle
              cx={pending.x}
              cy={pending.y}
              r={hole}
              fill="var(--color-miss)"
              fillOpacity={0.8}
            />
          </>
        ) : null}
      </svg>
      {preview ? (
        <div
          className="pointer-events-none absolute top-2 left-2 rounded-full bg-bg/90 px-3 py-1 font-score text-2xl text-brass tabular-nums"
          aria-live="polite"
        >
          {preview.score === 0 ? "Bom" : preview.score}
          {preview.innerTen ? "X" : ""}
        </div>
      ) : null}
    </div>
  );
});
