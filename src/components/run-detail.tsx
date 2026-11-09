import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { IpscTarget } from "@/components/ipsc-target";
import { ScoreMath } from "@/components/score-math";
import { START_LABEL, drillById } from "@/lib/ipsc/drills";
import { clockLabel, dayLabel, formatTime } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import { useFaktor } from "@/lib/store";

export function RunDetail({
  runId,
  onBack,
  onEdit,
  onDeleted,
  onAgain,
}: {
  runId: string;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onAgain: (drillId: string) => void;
}) {
  const run = useFaktor((state) => state.runs.find((item) => item.id === runId));
  const custom = useFaktor((state) => state.customDrills);
  const deleteRun = useFaktor((state) => state.deleteRun);
  const [confirm, setConfirm] = useState(false);
  const [activeId, setActiveId] = useState(run?.papers[0]?.id ?? "");

  if (!run) {
    return (
      <main className="px-4 pt-6">
        <p>Økta er slettet.</p>
        <button type="button" className="mt-4 h-11 text-brass" onClick={onBack}>
          Til loggen
        </button>
      </main>
    );
  }

  const score = scoreRun(run);
  const drill = drillById(run.drillId, custom);
  const active = run.papers.find((paper) => paper.id === activeId) ?? run.papers[0];

  return (
    <main className="px-4 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Mine økter
      </button>
      <h1 className="mt-1 font-score text-4xl leading-none">{run.drillName}</h1>
      <p className="mt-2 text-sm text-muted">
        {dayLabel(run.at)} {clockLabel(run.at)} · {run.power === "minor" ? "Minor" : "Major"} ·{" "}
        {START_LABEL[run.start]}
        {run.distanceM != null ? ` · ${String(run.distanceM).replace(".", ",")} m` : ""} ·{" "}
        {formatTime(run.timeSec)} s
      </p>
      {run.note ? <p className="mt-2 text-sm">{run.note}</p> : null}

      {run.papers.length > 1 && active ? (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {run.papers.map((paper) => (
            <button
              key={paper.id}
              type="button"
              onClick={() => setActiveId(paper.id)}
              className={`h-11 shrink-0 rounded-full border px-4 text-sm ${
                paper.id === active.id
                  ? "border-brass bg-brass text-brass-ink"
                  : "border-line bg-surface"
              }`}
            >
              {paper.label}
            </button>
          ))}
        </div>
      ) : null}

      {active ? (
        <div className="mt-4 rounded-card bg-surface-2 p-3">
          <IpscTarget
            interactive={false}
            shots={run.shots.filter((shot) => shot.targetId === active.id)}
            label={`${active.label}, lagrede treff`}
          />
        </div>
      ) : null}

      {run.steelDown.length > 0 ? (
        <p className="mt-3 text-sm text-muted">
          Stål: {run.steelDown.map((down) => (down ? "nede" : "oppe")).join(", ")}
        </p>
      ) : null}

      <section className="mt-4 rounded-card border border-line bg-surface p-4">
        <ScoreMath score={score} power={run.power} timeSec={run.timeSec} />
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="h-12 rounded-full border border-line text-sm font-medium"
        >
          Endre
        </button>
        {drill ? (
          <button
            type="button"
            onClick={() => onAgain(drill.id)}
            className="h-12 rounded-full bg-brass text-sm font-semibold text-brass-ink"
          >
            Logg på nytt
          </button>
        ) : (
          <span />
        )}
      </div>
      <button
        type="button"
        className="mt-3 h-12 w-full text-sm text-miss"
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            window.setTimeout(() => setConfirm(false), 4000);
            return;
          }
          deleteRun(run.id);
          onDeleted();
        }}
      >
        {confirm ? "Trykk igjen for å slette for godt" : "Slett økt"}
      </button>
    </main>
  );
}
