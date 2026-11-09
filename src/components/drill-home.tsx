import { ChevronRight } from "lucide-react";
import type { View } from "@/lib/nav";
import { START_LABEL, allDrills } from "@/lib/ipsc/drills";
import { formatHf } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import type { Drill, Run } from "@/lib/ipsc/types";
import { useMemo } from "react";
import { useCustomDrills, useRuns } from "@/lib/store";

export function DrillHome({ onOpen }: { onOpen: (view: View) => void }) {
  const custom = useCustomDrills();
  const runs = useRuns();
  const drills = useMemo(() => allDrills(custom), [custom]);
  // One pass over the log instead of re-scoring every run for every card.
  const bests = useMemo(() => bestHitFactors(runs), [runs]);

  return (
    <ul className="flex flex-col gap-3">
      {drills.map((drill) => (
        <li key={drill.id}>
          <DrillCard
            drill={drill}
            minor={bests.get(`${drill.id}:minor`) ?? null}
            major={bests.get(`${drill.id}:major`) ?? null}
            onShoot={() => onOpen({ name: "shoot", drillId: drill.id })}
            onEdit={drill.builtin ? undefined : () => onOpen({ name: "form", drillId: drill.id })}
          />
        </li>
      ))}
    </ul>
  );
}

function bestHitFactors(runs: Run[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const run of runs) {
    if (run.timeSec <= 0) continue;
    const key = `${run.drillId}:${run.power}`;
    const hf = scoreRun(run).hitFactor;
    if (hf > (best.get(key) ?? -1)) best.set(key, hf);
  }
  return best;
}

function DrillCard({
  drill,
  minor,
  major,
  onShoot,
  onEdit,
}: {
  drill: Drill;
  minor: number | null;
  major: number | null;
  onShoot: () => void;
  onEdit?: () => void;
}) {
  const shots = drill.papers.reduce((sum, paper) => sum + paper.requiredHits, 0);
  const mode = drill.countMode === "best" ? "beste treff" : "alle teller";

  return (
    <article className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-semibold">{drill.name}</h2>
          <p className="mt-1 text-sm text-muted">{drill.blurb}</p>
        </div>
        {onEdit ? (
          <button type="button" onClick={onEdit} className="h-11 shrink-0 px-2 text-sm text-brass">
            Endre
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted">
        {shots} skudd · {drill.papers.length === 1 ? "1 skive" : `${drill.papers.length} skiver`}
        {drill.steel > 0 ? ` · ${drill.steel} stål` : ""} · {mode}
        {drill.distanceM != null ? ` · ${formatDistance(drill.distanceM)}` : ""} ·{" "}
        {START_LABEL[drill.start]}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-sm text-muted tabular-nums">
          {minor == null && major == null ? (
            "Ingen pers ennå"
          ) : (
            <>
              {minor != null ? <span>Minor {formatHf(minor)}</span> : null}
              {minor != null && major != null ? <span> · </span> : null}
              {major != null ? <span>Major {formatHf(major)}</span> : null}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onShoot}
          className="inline-flex h-11 items-center gap-1 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink"
        >
          Logg
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function formatDistance(meters: number): string {
  return `${String(meters).replace(".", ",")} m`;
}
