import type { PointerEvent } from "react";
import { highestRing, type Face } from "@/lib/treffpunkt/faces";
import type { RingShot } from "@/lib/treffpunkt/session";

export function RingTarget({
  face,
  shots,
  readOnly,
  onPlace,
}: {
  face: Face;
  shots: RingShot[];
  readOnly?: boolean;
  onPlace?: (xMm: number, yMm: number) => void;
}) {
  const outer = face.diametersMm[0] ?? 100;
  const half = outer / 2 + face.caliberMm;
  const span = half * 2;
  const stroke = Math.max(outer / 120, 0.6);
  const black = face.blackBullDiameterMm / 2;

  const place = (event: PointerEvent<SVGSVGElement>) => {
    if (readOnly || !onPlace) return;
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    onPlace(local.x, local.y);
  };

  const rings: { radius: number; onBlack: boolean }[] = [];
  for (let ring = face.lowestRing; ring <= highestRing(face); ring += 1) {
    const diameter = face.diametersMm[ring - face.lowestRing];
    if (diameter == null) continue;
    rings.push({ radius: diameter / 2, onBlack: diameter / 2 < black - stroke });
  }

  return (
    <svg
      viewBox={`${-half} ${-half} ${span} ${span}`}
      className="w-full touch-none rounded-card bg-fg"
      onPointerDown={place}
      role={readOnly ? "img" : "button"}
      aria-label={readOnly ? "Skive" : "Trykk der skuddet satt"}
    >
      <rect x={-half} y={-half} width={span} height={span} fill="var(--color-fg)" />
      <circle cx={0} cy={0} r={black} fill="var(--color-bg)" />
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
      {rings.map((ring) => (
        <circle
          key={ring.radius}
          cx={0}
          cy={0}
          r={ring.radius}
          fill="none"
          stroke={ring.onBlack ? "var(--color-fg)" : "var(--color-bg)"}
          strokeWidth={stroke}
        />
      ))}
      {shots.map((shot, index) => (
        <g key={`${shot.xMm}-${shot.yMm}-${index}`}>
          <circle
            cx={shot.xMm}
            cy={shot.yMm}
            r={Math.max(face.caliberMm / 2, outer / 55)}
            fill="var(--color-brass)"
            stroke="var(--color-brass-ink)"
            strokeWidth={stroke / 2}
          />
        </g>
      ))}
    </svg>
  );
}
