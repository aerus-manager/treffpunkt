import { ArrowLeft, Undo2 } from "lucide-react";
import { scoreShot } from "@/lib/treffpunkt/faces";
import { faceFor, programById } from "@/lib/treffpunkt/programs";
import { sealSeries, seriesPoints, sessionPoints, type RingSession } from "@/lib/treffpunkt/session";
import { useFaktor } from "@/lib/store";
import { RingTarget } from "@/components/ring-target";

export function SeriesShoot({
  sessionId,
  onClose,
  onFinished,
}: {
  sessionId: string;
  onClose: () => void;
  onFinished: (sessionId: string) => void;
}) {
  const session = useFaktor((state) => state.ringSessions.find((item) => item.id === sessionId));
  const save = useFaktor((state) => state.saveRingSession);
  if (!session) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Økten finnes ikke.</p>
        <button type="button" className="mt-4 text-brass" onClick={onClose}>Tilbake</button>
      </main>
    );
  }
  const program = programById(session.programId);
  if (!program) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Programmet er ikke i katalogen lenger.</p>
        <button type="button" className="mt-4 text-brass" onClick={onClose}>Tilbake</button>
      </main>
    );
  }
  const stage = program.stages[session.stageIndex];
  const totals = sessionPoints(session);
  const full = stage != null && session.current.length >= stage.shotsPerSeries;
  const lastStage = session.stageIndex >= program.stages.length - 1;
  const lastSeries = stage != null && session.seriesDoneInStage + 1 >= stage.seriesCount;
  const commit = (next: RingSession) => save(next);
  const place = (xMm: number, yMm: number) => {
    if (!stage || full || session.status === "done") return;
    const scored = scoreShot(faceFor(stage), xMm, yMm);
    const targets = stage.targetsPerSeries ?? 1;
    commit({
      ...session,
      touched: new Date().toISOString(),
      current: [...session.current, { xMm, yMm, score: scored.score, innerTen: scored.innerTen, targetIndex: session.current.length % targets }],
    });
  };
  const undo = () => {
    if (session.current.length === 0) return;
    commit({ ...session, touched: new Date().toISOString(), current: session.current.slice(0, -1) });
  };
  const next = () => {
    const sealed = sealSeries(session, program);
    commit(sealed);
    if (sealed.status === "done") onFinished(sealed.id);
  };
  const face = stage ? faceFor(stage) : null;
  const targets = stage?.targetsPerSeries ?? 1;
  const displayIndex = session.current.length === 0 ? 0 : (session.current.length - 1) % targets;
  const visibleShots = targets > 1 ? session.current.filter((shot) => shot.targetIndex === displayIndex) : session.current;
  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hjem
      </button>
      <p className="mt-2 text-xs font-medium tracking-wide text-brass uppercase">{session.programName}</p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">
        {stage ? `${stage.name} · serie ${session.seriesDoneInStage + 1} av ${stage.seriesCount}` : "Økt ferdig"}
      </h1>
      <p className="mt-4 font-score text-5xl leading-none text-brass tabular-nums">
        {totals.points}
        {totals.inner > 0 ? <span className="ml-2 text-2xl text-fg">{totals.inner}X</span> : null}
      </p>
      {face ? (
        <div className="mt-4">
          <RingTarget face={face} shots={visibleShots} readOnly={full} onPlace={place} />
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={undo} disabled={session.current.length === 0} className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-4 text-sm disabled:opacity-40">
          <Undo2 className="size-4" aria-hidden="true" />
          Angre
        </button>
        {full ? (
          <button type="button" onClick={next} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink">
            {lastStage && lastSeries ? "Avslutt" : "Neste serie"}
          </button>
        ) : (
          <p className="flex h-11 flex-1 items-center text-sm text-muted">{stage ? `${session.current.length} av ${stage.shotsPerSeries} skudd` : null}</p>
        )}
      </div>
    </main>
  );
}
