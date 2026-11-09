import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Keyboard, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { RingTarget } from "@/components/ring-target";
import { SeriesTimer } from "@/components/series-timer";
import { highestRing, scoreShot, type Face } from "@/lib/treffpunkt/faces";
import { faceFor, programById, type StageDef } from "@/lib/treffpunkt/programs";
import {
  reopenLastSeries,
  roundMm,
  sealSeries,
  seriesPoints,
  sessionPoints,
  type RingSession,
  type RingShot,
  type SeriesTiming,
} from "@/lib/treffpunkt/session";
import { useFaktor } from "@/lib/store";

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
  const timing = useRef<SeriesTiming>({ elapsedMs: null, overTime: null });
  const [zoom, setZoom] = useState(false);
  const [pad, setPad] = useState(false);

  const program = session ? programById(session.programId) : undefined;
  const stage = session && program ? program.stages[session.stageIndex] : undefined;
  const face = stage ? faceFor(stage) : null;
  const full = !!stage && !!session && session.current.length >= stage.shotsPerSeries;

  const commit = useCallback(
    (next: RingSession) => {
      save(next);
    },
    [save],
  );

  const addShot = useCallback(
    (shot: Omit<RingShot, "targetIndex">, targetIndex?: number) => {
      const state = useFaktor.getState().ringSessions.find((item) => item.id === sessionId);
      const currentStage = state ? programById(state.programId)?.stages[state.stageIndex] : undefined;
      if (!state || !currentStage || state.status === "done") return;
      const targets = currentStage.targetsPerSeries ?? 1;
      const placed =
        targets > 1
          ? {
              ...shot,
              targetIndex:
                targetIndex ??
                Array.from({ length: targets }, (_, index) => index).find(
                  (index) => !state.current.some((item) => item.targetIndex === index),
                ) ??
                0,
            }
          : { ...shot, targetIndex: 0 };
      const current =
        targets > 1
          ? [...state.current.filter((item) => item.targetIndex !== placed.targetIndex), placed]
          : state.current.length >= currentStage.shotsPerSeries
            ? state.current
            : [...state.current, placed];
      if (current.length > currentStage.shotsPerSeries) return;
      commit({ ...state, touched: new Date().toISOString(), current });
      navigator.vibrate?.(10);
    },
    [commit, sessionId],
  );

  if (!session) return <Missing text="Økten finnes ikke." onClose={onClose} />;
  if (!program) return <Missing text="Programmet er ikke i katalogen lenger." onClose={onClose} />;

  const totals = sessionPoints(session);
  const lastStage = session.stageIndex >= program.stages.length - 1;
  const lastSeries = stage != null && session.seriesDoneInStage + 1 >= stage.seriesCount;
  const seriesNumber = session.sealed.length + 1;
  const seriesTotal = program.stages.reduce((sum, item) => sum + item.seriesCount, 0);
  const targets = stage?.targetsPerSeries ?? 1;
  const nextIndex = Array.from({ length: targets }, (_, index) => index).find(
    (index) => !session.current.some((shot) => shot.targetIndex === index),
  );

  const undo = () => {
    if (session.current.length > 0) {
      commit({ ...session, touched: new Date().toISOString(), current: session.current.slice(0, -1) });
    } else if (session.sealed.length > 0) {
      commit(reopenLastSeries(session, program));
    }
  };

  const next = () => {
    const sealed = sealSeries(session, program, timing.current);
    timing.current = { elapsedMs: null, overTime: null };
    commit(sealed);
    setZoom(false);
    if (sealed.status === "done") onFinished(sealed.id);
  };

  return (
    <main className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Hjem
        </button>
        <span className="text-sm text-muted tabular-nums">
          Serie {Math.min(seriesNumber, seriesTotal)} av {seriesTotal}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium tracking-wide text-brass uppercase">{session.programName}</p>
      <h1 className="mt-1 text-2xl leading-tight font-semibold">
        {stage ? `${stage.name} · serie ${session.seriesDoneInStage + 1} av ${stage.seriesCount}` : "Økt ferdig"}
      </h1>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-score text-5xl leading-none text-brass tabular-nums">
          {totals.points}
          {totals.inner > 0 ? <span className="ml-2 text-2xl text-fg">{totals.inner}X</span> : null}
        </p>
        {stage?.secondsPerSeries ? (
          <SeriesTimer key={session.sealed.length} seconds={stage.secondsPerSeries} timing={timing} />
        ) : null}
      </div>
      <SeriesStrip shots={session.current} stage={stage} />
      {face && !pad && targets > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-1">
          {Array.from({ length: targets }, (_, index) => (
            <div key={index} className={!full && index === nextIndex ? "rounded-lg ring-2 ring-brass" : ""}>
              <p className="mb-1 text-center text-xs text-muted">{index + 1}</p>
              <RingTarget
                face={face}
                shots={session.current.filter((shot) => shot.targetIndex === index)}
                readOnly={full}
                onPlace={(xMm, yMm) => {
                  const scored = scoreShot(face, roundMm(xMm), roundMm(yMm));
                  addShot(
                    { xMm: roundMm(xMm), yMm: roundMm(yMm), score: scored.score, innerTen: scored.innerTen },
                    index,
                  );
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
      {face && !pad && targets === 1 ? (
        <div className="mt-3">
          <RingTarget
            face={face}
            shots={session.current}
            readOnly={full}
            zoom={zoom}
            highlightLast
            onPlace={(xMm, yMm) => {
              const scored = scoreShot(face, roundMm(xMm), roundMm(yMm));
              addShot({ xMm: roundMm(xMm), yMm: roundMm(yMm), score: scored.score, innerTen: scored.innerTen });
            }}
          />
        </div>
      ) : null}
      {face && pad ? <ScorePad face={face} disabled={full} onScore={(shot) => addShot(shot)} /> : null}
      <div className="mt-3 flex gap-2">
        {face && !pad && targets === 1 ? (
          <button
            type="button"
            onClick={() => setZoom((value) => !value)}
            aria-pressed={zoom}
            className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm"
          >
            {zoom ? <ZoomOut className="size-4" aria-hidden="true" /> : <ZoomIn className="size-4" aria-hidden="true" />}
            {zoom ? "Hele" : "Zoom"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setPad((value) => !value)}
          aria-pressed={pad}
          className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm"
        >
          <Keyboard className="size-4" aria-hidden="true" />
          {pad ? "Skive" : "Tast"}
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={session.current.length === 0 && session.sealed.length === 0}
          className="ml-auto inline-flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm disabled:opacity-40"
        >
          <Undo2 className="size-4" aria-hidden="true" />
          {session.current.length === 0 && session.sealed.length > 0 ? "Forrige serie" : "Angre"}
        </button>
      </div>
      {full ? (
        <button
          type="button"
          onClick={next}
          className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-brass px-4 font-semibold text-brass-ink"
        >
          {lastStage && lastSeries ? "Avslutt økt" : `Neste serie (${seriesPoints(session.current)} p)`}
        </button>
      ) : null}
    </main>
  );
}

function Missing({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <main className="px-4 pt-6">
      <p className="text-muted">{text}</p>
      <button type="button" className="mt-4 h-11 text-brass" onClick={onClose}>
        Tilbake
      </button>
    </main>
  );
}

function SeriesStrip({ shots, stage }: { shots: RingShot[]; stage?: StageDef }) {
  if (!stage) return null;
  const slots = Array.from({ length: stage.shotsPerSeries }, (_, index) => shots[index]);
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={`${shots.length} av ${stage.shotsPerSeries} skudd`}>
      {slots.map((shot, index) => (
        <span
          key={index}
          className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums ${
            shot
              ? shot.score === 0
                ? "border-miss/60 bg-surface text-miss"
                : "border-line bg-surface-2 text-fg"
              : "border-dashed border-line text-muted"
          }`}
        >
          {shot ? (shot.score === 0 ? "0" : `${shot.score}${shot.innerTen ? "X" : ""}`) : index + 1}
        </span>
      ))}
      <span className="ml-1 w-10 text-right font-score text-xl text-brass tabular-nums">{seriesPoints(shots)}</span>
    </div>
  );
}

function ScorePad({
  face,
  disabled,
  onScore,
}: {
  face: Face;
  disabled: boolean;
  onScore: (shot: Omit<RingShot, "targetIndex">) => void;
}) {
  const top = highestRing(face);
  const values: { label: string; score: number; inner: boolean }[] = [];
  if (face.innerTenDiameterMm != null) values.push({ label: `${top}X`, score: top, inner: true });
  for (let ring = top; ring >= face.lowestRing; ring -= 1) values.push({ label: String(ring), score: ring, inner: false });
  values.push({ label: "Bom", score: 0, inner: false });
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {values.map((value) => (
        <button
          key={value.label}
          type="button"
          disabled={disabled}
          onClick={() => onScore({ xMm: 0, yMm: 0, score: value.score, innerTen: value.inner, manual: true })}
          className={`h-14 rounded-card border text-xl font-semibold tabular-nums disabled:opacity-40 ${
            value.score === 0 ? "border-miss/60 text-miss" : value.inner ? "border-brass text-brass" : "border-line bg-surface"
          }`}
        >
          {value.label}
        </button>
      ))}
    </div>
  );
}
