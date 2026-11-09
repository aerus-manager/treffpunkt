import { useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import { RingTarget } from "@/components/ring-target";
import { weaponLabel } from "@/components/weapon-field";
import { dayLabel, clockLabel } from "@/lib/ipsc/format";
import { scoreShot } from "@/lib/treffpunkt/faces";
import { faceFor, programById } from "@/lib/treffpunkt/programs";
import { createSession, replaceSealedShots, seriesPoints, sessionPoints, type RingShot } from "@/lib/treffpunkt/session";
import { useFaktor, useRingSessions } from "@/lib/store";
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
  const weapon = useFaktor((state) => state.weapons.find((item) => item.id === session?.weaponId));
  const save = useFaktor((state) => state.saveRingSession);
  const remove = useFaktor((state) => state.deleteRingSession);
  const all = useRingSessions();
  const best = useMemo(() => bestByProgram(all), [all]);
  const [openIndex, setOpenIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!session) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Økten finnes ikke.</p>
        <button type="button" className="mt-4 text-brass" onClick={onBack}>
          Tilbake
        </button>
      </main>
    );
  }

  const program = programById(session.programId);
  const totals = sessionPoints(session);
  const selected = session.sealed[openIndex];
  const stage = selected && program ? program.stages[selected.stageIndex] : undefined;

  const writeShots = (shots: RingShot[]) => {
    save(replaceSealedShots(session, openIndex, shots));
  };

  const placeShot = (xMm: number, yMm: number, targetIndex: number) => {
    if (!editing || !selected || !stage) return;
    const scored = scoreShot(faceFor(stage), xMm, yMm);
    const shot: RingShot = { xMm, yMm, score: scored.score, innerTen: scored.innerTen, targetIndex };
    const targets = stage.targetsPerSeries ?? 1;
    if (targets > 1) {
      const next = [...selected.shots.filter((item) => item.targetIndex !== targetIndex), shot];
      if (next.length <= stage.shotsPerSeries) writeShots(next);
      return;
    }
    if (selected.shots.length >= stage.shotsPerSeries) return;
    writeShots([...selected.shots, shot]);
  };

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Mine økter
      </button>
      <p className="mt-2 text-xs font-medium tracking-wide text-brass uppercase">
        {session.status === "open" ? "Åpen økt" : "Ferdig"} · {dayLabel(session.at)} {clockLabel(session.at)}
      </p>
      <h1 className="mt-1 font-score text-4xl leading-none">{session.programName}</h1>
      {session.status === "done" && best.get(session.programId)?.sessionId === session.id ? (
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-brass">
          <Trophy className="size-4" aria-hidden="true" />
          Persrekord
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted">
        {session.place || "Uten sted"}
        {weapon ? ` · ${weaponLabel(weapon)}` : ""}
        {totals.late ? ` · ${totals.late} serier over tid` : ""}
      </p>
      <p className="mt-4 font-score text-5xl leading-none text-brass tabular-nums">
        {totals.points}
        {totals.inner > 0 ? <span className="ml-2 text-2xl text-fg">{totals.inner}X</span> : null}
      </p>
      {session.status === "open" ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-brass font-semibold text-brass-ink"
        >
          Fortsett
        </button>
      ) : null}
      <ul className="mt-6 flex flex-col gap-2">
        {session.sealed.map((series, index) => {
          const seriesStage = program?.stages[series.stageIndex];
          const number = session.sealed
            .slice(0, index + 1)
            .filter((item) => item.stageIndex === series.stageIndex).length;
          const inner = series.shots.filter((shot) => shot.innerTen).length;
          return (
            <li key={`${series.stageIndex}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  setOpenIndex(index);
                  setEditing(false);
                }}
                className={`flex w-full items-baseline justify-between rounded-card border px-4 py-3 text-left ${
                  index === openIndex ? "border-brass bg-surface" : "border-line bg-surface"
                }`}
              >
                <span>
                  {seriesStage?.name ?? "Serie"} · {number}
                  {series.overTime ? <span className="ml-2 text-miss">over tid</span> : null}
                </span>
                <span className="font-score text-2xl tabular-nums">
                  {seriesPoints(series.shots)}
                  {inner > 0 ? <span className="ml-1 text-sm text-muted">{inner}X</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected && stage ? (
        <div className="mt-4">
          <button type="button" className="mb-3 text-sm text-brass" onClick={() => setEditing((value) => !value)}>
            {editing ? "Ferdig med endring" : "Endre denne serien"}
          </button>
          {(stage.targetsPerSeries ?? 1) > 1 ? (
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: stage.targetsPerSeries ?? 1 }, (_, index) => (
                <RingTarget
                  key={index}
                  face={faceFor(stage)}
                  shots={selected.shots.filter((shot) => shot.targetIndex === index)}
                  readOnly={!editing}
                  onPlace={(xMm, yMm) => placeShot(xMm, yMm, index)}
                />
              ))}
            </div>
          ) : (
            <RingTarget
              face={faceFor(stage)}
              shots={selected.shots}
              readOnly={!editing}
              onPlace={(xMm, yMm) => placeShot(xMm, yMm, 0)}
            />
          )}
          {editing ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.shots.map((shot, index) => (
                <button
                  key={`${shot.xMm}-${index}`}
                  type="button"
                  className="h-11 rounded-full border border-line px-3 text-sm"
                  onClick={() => writeShots(selected.shots.filter((_, item) => item !== index))}
                >
                  Fjern {index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <ResultCard
        title={session.programName}
        meta={`${dayLabel(session.at)} ${clockLabel(session.at)}${session.place ? ` · ${session.place}` : ""}${weapon ? ` · ${weaponLabel(weapon)}` : ""}`}
        lines={session.sealed.map((series, index) => {
          const seriesStage = program?.stages[series.stageIndex];
          const inner = series.shots.filter((shot) => shot.innerTen).length;
          return {
            label: `${seriesStage?.name ?? "Serie"} ${index + 1}${series.overTime ? " · over tid" : ""}`,
            value: `${seriesPoints(series.shots)}${inner ? ` · ${inner}X` : ""}`,
          };
        })}
        total={`${totals.points}${totals.inner ? ` · ${totals.inner}X` : ""}`}
      />
      <div className="mt-6 grid gap-2">
        {program ? (
          <button
            type="button"
            onClick={() => {
              const fresh = createSession(program, session.place, session.weaponId);
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
