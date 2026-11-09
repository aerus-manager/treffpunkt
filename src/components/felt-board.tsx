import type { PointerEvent } from "react";
import { layoutHold, type FeltHold, type FeltShot } from "@/lib/treffpunkt/felt";

const FILL = { black: "#1a1612", green: "#2f6b45", red: "#8d3a32" };

export function FeltBoard({
  hold,
  shots,
  readOnly,
  onPlace,
}: {
  hold: FeltHold;
  shots: FeltShot[];
  readOnly?: boolean;
  onPlace?: (xCm: number, yCm: number) => void;
}) {
  const layout = layoutHold(hold);
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

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto w-full touch-none rounded-card bg-[#d8c7a4]"
      role={readOnly ? "img" : "button"}
      aria-label={readOnly ? `Hold ${hold.number}` : "Trykk på figuren du traff"}
      onPointerDown={place}
    >
      {layout.figures.map((figure) => (
        <g key={figure.index} transform={`translate(${figure.x} ${figure.y})`}>
          <FigureShape figure={figure} fill={FILL[hold.colour]} />
          {figure.hasInner ? (
            <ellipse
              cx={figure.widthCm / 2}
              cy={figure.heightCm / 2}
              rx={figure.widthCm * 0.22}
              ry={figure.heightCm * 0.22}
              fill="none"
              stroke="#f4efe6"
              strokeWidth={0.35}
            />
          ) : null}
          <text
            x={figure.widthCm / 2}
            y={figure.heightCm + 1.6}
            textAnchor="middle"
            fontSize={1.8}
            fill="#2c261e"
          >
            {figure.name}
          </text>
        </g>
      ))}
      {shots.map((shot, index) => (
        <g key={`${shot.xCm}-${index}`}>
          <circle cx={shot.xCm} cy={shot.yCm} r={0.7} fill="#e0a24a" stroke="#2a1c08" strokeWidth={0.15} />
        </g>
      ))}
    </svg>
  );
}

function FigureShape({
  figure,
  fill,
}: {
  figure: { kind: string; widthCm: number; heightCm: number };
  fill: string;
}) {
  const { widthCm: w, heightCm: h, kind } = figure;
  if (kind === "stripe") return <rect width={w} height={h} rx={0.4} fill={fill} />;
  if (kind === "triangle") return <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} fill={fill} />;
  if (kind === "right-triangle") return <polygon points={`0,0 ${w},${h} 0,${h}`} fill={fill} />;
  if (kind === "hexagon") {
    const inset = Math.min(w, h) * 0.22;
    return (
      <polygon
        points={`${inset},0 ${w - inset},0 ${w},${h / 2} ${w - inset},${h} ${inset},${h} 0,${h / 2}`}
        fill={fill}
      />
    );
  }
  const ry = kind === "egg" ? h / 2.2 : h / 2;
  const cy = kind === "egg" ? h * 0.55 : h / 2;
  return <ellipse cx={w / 2} cy={cy} rx={w / 2} ry={ry} fill={fill} />;
}
