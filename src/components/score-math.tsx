import { formatHf, formatPoints, formatTime } from "@/lib/ipsc/format";
import { ZONE_POINTS } from "@/lib/ipsc/scoring";
import type { Power, ScoreBreakdown } from "@/lib/ipsc/types";

export function ScoreMath({
  score,
  power,
  timeSec,
}: {
  score: ScoreBreakdown;
  power: Power;
  timeSec: number | null;
}) {
  const worth = ZONE_POINTS[power];
  const rows: { label: string; value: string }[] = [];
  if (score.A)
    rows.push({ label: `${score.A} × ${worth.A} A`, value: formatPoints(score.A * worth.A) });
  if (score.C)
    rows.push({ label: `${score.C} × ${worth.C} C`, value: formatPoints(score.C * worth.C) });
  if (score.D)
    rows.push({ label: `${score.D} × ${worth.D} D`, value: formatPoints(score.D * worth.D) });
  if (score.steel)
    rows.push({ label: `${score.steel} × 5 stål`, value: formatPoints(score.steel * 5) });
  if (score.misses)
    rows.push({ label: `${score.misses} × −10 bom`, value: formatPoints(score.misses * -10) });
  if (score.noShoots) {
    rows.push({
      label: `${score.noShoots} × −10 no-shoot`,
      value: formatPoints(score.noShoots * -10),
    });
  }
  if (score.procedurals) {
    rows.push({
      label: `${score.procedurals} × −10 prosedyre`,
      value: formatPoints(score.procedurals * -10),
    });
  }
  if (rows.length === 0) rows.push({ label: "Ingen treff", value: "0" });

  return (
    <dl className="flex flex-col gap-1 text-sm tabular-nums">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      <div className="my-1 border-t border-line" />
      <div className="flex justify-between">
        <dt>Poeng</dt>
        <dd className="font-medium">{formatPoints(score.points)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Tid</dt>
        <dd className="text-muted">{timeSec == null ? "—" : `${formatTime(timeSec)} s`}</dd>
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <dt className="font-medium">Hit factor</dt>
        <dd className="font-score text-xl text-brass">
          {timeSec == null ? "—" : formatHf(score.hitFactor)}
        </dd>
      </div>
      {score.discarded > 0 ? (
        <p className="pt-1 text-muted">
          {score.discarded === 1
            ? "Ett ekstra skudd teller ikke. Bare de beste beholdes."
            : `${score.discarded} ekstra skudd teller ikke. Bare de beste beholdes.`}
        </p>
      ) : null}
    </dl>
  );
}
