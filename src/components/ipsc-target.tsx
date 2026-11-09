import type { PointerEvent } from "react";
import { ALPHA, CHARLIE, OUTER, TARGET_H, TARGET_W, polyPoints, zoneAt } from "@/lib/ipsc/geometry";
import type { Shot, Zone } from "@/lib/ipsc/types";

type Props = {
  shots: Shot[];
  interactive?: boolean;
  onPlace?: (shot: { zone: Zone; x: number; y: number }) => void;
  onRemove?: (id: string) => void;
  label: string;
};

export function IpscTarget({ shots, interactive = true, onPlace, onRemove, label }: Props) {
  function locate(event: PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  }

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    if (!interactive) return;
    event.preventDefault();
    const local = locate(event);
    if (!local) return;
    const near = shots.find((shot) => (shot.x - local.x) ** 2 + (shot.y - local.y) ** 2 < 18 ** 2);
    if (near) {
      onRemove?.(near.id);
      return;
    }
    const zone = zoneAt(local.x, local.y);
    if (!zone || !onPlace) return;
    onPlace({ zone, x: local.x, y: local.y });
  }

  return (
    <svg
      viewBox={`-16 -16 ${TARGET_W + 32} ${TARGET_H + 32}`}
      className="h-auto w-full touch-none select-none"
      role="img"
      aria-label={label}
      onPointerDown={handlePointer}
    >
      <polygon points={polyPoints(OUTER)} fill="var(--color-board-d)" />
      <polygon points={polyPoints(CHARLIE)} fill="var(--color-board-c)" />
      <polygon points={polyPoints(ALPHA)} fill="var(--color-board-a)" />
      <polygon
        points={polyPoints(OUTER)}
        fill="none"
        stroke="var(--color-board-ink)"
        strokeWidth="3"
      />
      <polygon
        points={polyPoints(CHARLIE)}
        fill="none"
        stroke="var(--color-board-ink)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <polygon
        points={polyPoints(ALPHA)}
        fill="none"
        stroke="var(--color-board-ink)"
        strokeWidth="2"
      />
      <text
        x="225"
        y="230"
        textAnchor="middle"
        fill="var(--color-board-ink)"
        fontSize="28"
        opacity="0.45"
      >
        A
      </text>
      <text
        x="112"
        y="230"
        textAnchor="middle"
        fill="var(--color-board-ink)"
        fontSize="20"
        opacity="0.4"
      >
        C
      </text>
      <text
        x="338"
        y="230"
        textAnchor="middle"
        fill="var(--color-board-ink)"
        fontSize="20"
        opacity="0.4"
      >
        C
      </text>
      <text
        x="36"
        y="290"
        textAnchor="middle"
        fill="var(--color-board-ink)"
        fontSize="18"
        opacity="0.45"
      >
        D
      </text>
      <text
        x="414"
        y="290"
        textAnchor="middle"
        fill="var(--color-board-ink)"
        fontSize="18"
        opacity="0.45"
      >
        D
      </text>
      {shots.map((shot, index) => (
        <g key={shot.id}>
          <circle cx={shot.x} cy={shot.y} r="11" fill="var(--color-hole)" />
          <text
            x={shot.x}
            y={shot.y - 16}
            textAnchor="middle"
            fill="var(--color-hole)"
            stroke="var(--color-board-c)"
            strokeWidth="4"
            paintOrder="stroke"
            fontSize="16"
            fontWeight="700"
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
