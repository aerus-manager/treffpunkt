import { ChevronRight } from "lucide-react";
import type { View } from "@/lib/nav";
import { START_LABEL, allDrills } from "@/lib/ipsc/drills";
import { formatHf } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import type { Drill, Power, Run } from "@/lib/ipsc/types";
import { useFaktor } from "@/lib/store";

export function DrillHome({ ready, onOpen }: { ready: boolean; onOpen: (view: View) => void }) {
  const custom = useFaktor((state) => state.customDrills);
  const runs = useFaktor((state) => state.runs);
  const drills = allDrills(custom);

  return (
    <ul className="flex flex-col gap-3">
        {drills.map((drill) => (
          <li key={drill.id}>
            <DrillCard
              drill={drill}
              ready={ready}
              runs={runs}
              onShoot={() => onOpen({ name: "shoot", drillId: drill.id })}
              onEdit={
                drill.builtin ? undefined : () => onOpen({ name: "form", drillId: drill.id })
              }
            />
          </li>
        ))}
    </ul>
  );
}

function best(runs: Run[], drillId: string, power: Power): number | null {
  const values = runs
    .filter((run) => run.drillId === drillId && run.power === power && run.timeSec > 0)
    .map((run) => scoreRun(run).hitFactor);
  if (values.length === 0) return null;
  return Math.max(...values);
}

function DrillCard({
  drill,
  runs,
  ready,
  onShoot,
  onEdit,
}: {
  drill: Drill;
  runs: Run[];
  ready: boolean;
  onShoot: () => void;
  onEdit?: () => void;
}) {
  const minor = ready ? best(runs, drill.id, "minor") : null;
  const major = ready ? best(runs, drill.id, "major") : null;
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
          <button type="button" onClick={onEdit} className="shrink-0 text-sm text-brass">
            Endre
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted">
        {shots} skudd · {drill.papers.length === 1 ? "1 skive" : `${drill.papers.length} skiver`}
        {drill.steel > 0 ? ` · ${drill.steel} stål` : ""} · {mode}
        {drill.distanceM != null ? ` · ${formatDistance(drill.distanceM)}` : ""} · {START_LABEL[drill.start]}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-sm tabular-nums text-muted">
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
