import { useMemo, useState } from "react";
import { ArrowLeft, Play, RotateCcw, Trophy } from "lucide-react";
import { RingTarget } from "@/components/ring-target";
import { clockLabel, dayLabel } from "@/lib/ipsc/format";
import { useFaktor, useRingSessions } from "@/lib/store";
import { faceFor, programById } from "@/lib/treffpunkt/programs";
import {
  createSession,
  seriesPoints,
  sessionPoints,
  type RingShot,
} from "@/lib/treffpunkt/session";
import { bestByProgram } from "@/lib/treffpunkt/stats";

export function SessionDetail({
  sessionId,
  onBack,
  onContinue,
  onDeleted,
  onRestart,
}: {
  sessionId: string;
  onBack: () => void;
  onContinue: () => void;
  onDeleted: () => void;
  onRestart: (sessionId: string) => void;
}) {
  const session = useFaktor((state) => state.ringSessions.find((item) => item.id === sessionId));
  const save = useFaktor((state) => state.saveRingSession);
  const remove = useFaktor((state) => state.deleteRingSession);
  const all = useRingSessions();
  const best = useMemo(() => bestByProgram(all), [all]);
  const [stageIndex, setStageIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);

  if (!session) {
    return (
      <main className="px-4 pt-6">
        <p>Økten er slettet.</p>
        <button type="button" className="mt-4 h-11 text-brass" onClick={onBack}>
          Til loggen
        </button>
      </main>
    );
  }

  const program = programById(session.programId);
  const totals = sessionPoints(session);
  const open = session.status === "open";
  const isBest = !open && best.get(session.programId)?.sessionId === session.id;

  const stages = (program?.stages ?? []).map((stage, index) => {
    const series = session.sealed
      .filter((item) => item.stageIndex === index)
      .map((item) => item.shots);
    if (open && session.stageIndex === index && session.current.length > 0)
      series.push(session.current);
    const shots = series.flat();
    return { stage, index, series, shots, points: seriesPoints(shots) };
  });
  const shown = stages.filter((item) => item.shots.length > 0);
  const active = shown.find((item) => item.index === stageIndex) ?? shown[0];

  return (
    <main className="px-4 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Mine økter
      </button>
      <h1 className="mt-1 font-score text-4xl leading-none">{session.programName}</h1>
      <p className="mt-2 text-sm text-muted">
        {dayLabel(session.at)} {clockLabel(session.at)}
        {session.place ? ` · ${session.place}` : ""}
        {open ? " · ikke avsluttet" : ""}
      </p>

      <div className="mt-4 flex items-end gap-3">
        <p className="font-score text-6xl leading-none text-brass tabular-nums">{totals.points}</p>
        <p className="pb-1 text-muted">
          {totals.inner ? `${totals.inner}X · ` : ""}
          {totals.shots} skudd · snitt{" "}
          {totals.shots ? (totals.points / totals.shots).toFixed(2).replace(".", ",") : "0"}
        </p>
      </div>
      {isBest ? (
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-brass">
          <Trophy className="size-4" aria-hidden="true" />
          Personlig rekord i dette programmet
        </p>
      ) : null}

      {open ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brass font-semibold text-brass-ink"
        >
          <Play className="size-4" aria-hidden="true" />
          Fortsett økten
        </button>
      ) : null}

      {shown.length > 1 ? (
        <div className="mt-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Øvelser">
          {shown.map((item) => (
            <button
              key={item.index}
              type="button"
              role="tab"
              aria-selected={item.index === active?.index}
              onClick={() => setStageIndex(item.index)}
              className={`h-11 shrink-0 rounded-full border px-4 text-sm tabular-nums ${
                item.index === active?.index
                  ? "border-brass bg-brass text-brass-ink"
                  : "border-line bg-surface"
              }`}
            >
              {item.stage.name} · {item.points}
            </button>
          ))}
        </div>
      ) : null}

      {active ? (
        <section className="mt-4">
          <RingTarget face={faceFor(active.stage)} shots={active.shots} readOnly />
          <table className="mt-4 w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-normal">Serie</th>
                <th className="py-1 font-normal">Skudd</th>
                <th className="py-1 text-right font-normal">Sum</th>
              </tr>
            </thead>
            <tbody>
              {active.series.map((shots, index) => (
                <tr key={index} className="border-t border-line">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2 text-muted">{shotList(shots)}</td>
                  <td className="py-2 text-right font-medium">{seriesPoints(shots)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td className="py-2 font-medium" colSpan={2}>
                  {active.stage.name}
                </td>
                <td className="py-2 text-right font-score text-xl text-brass">{active.points}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      ) : (
        <p className="mt-6 text-muted">Ingen skudd registrert ennå.</p>
      )}

      <div className="mt-6 grid gap-2">
        {program ? (
          <button
            type="button"
            onClick={() => {
              const fresh = createSession(program, session.place);
              save(fresh);
              onRestart(fresh.id);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Skyt programmet på nytt
          </button>
        ) : null}
        <button
          type="button"
          className="h-12 w-full text-sm text-miss"
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              window.setTimeout(() => setConfirm(false), 4000);
              return;
            }
            remove(session.id);
            onDeleted();
          }}
        >
          {confirm ? "Trykk igjen for å slette for godt" : "Slett økt"}
        </button>
      </div>
    </main>
  );
}

function shotList(shots: RingShot[]): string {
  return shots.map((shot) => `${shot.score}${shot.innerTen ? "x" : ""}`).join(" ");
}
