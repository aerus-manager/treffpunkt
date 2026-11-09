import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { FeltBoard } from "@/components/felt-board";
import { SeriesTimer } from "@/components/series-timer";
import {
  feltCourse,
  holdTally,
  sessionTally,
  shotOnHold,
  shotsForGroup,
  type FeltSession,
} from "@/lib/treffpunkt/felt";
import type { SeriesTiming } from "@/lib/treffpunkt/session";
import { useFaktor } from "@/lib/store";

export function FeltShoot({
  sessionId,
  onClose,
  onFinished,
}: {
  sessionId: string;
  onClose: () => void;
  onFinished: (sessionId: string) => void;
}) {
  const session = useFaktor((state) => state.feltSessions.find((item) => item.id === sessionId));
  const save = useFaktor((state) => state.saveFeltSession);
  const timing = useRef<SeriesTiming>({ elapsedMs: null, overTime: null });

  if (!session) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Økten finnes ikke.</p>
        <button type="button" className="mt-4 text-brass" onClick={onClose}>
          Tilbake
        </button>
      </main>
    );
  }

  const course = feltCourse(session.courseId);
  const hold = course?.holds[session.holdIndex];
  const limit = shotsForGroup(session.group);
  const tally = sessionTally(session);
  const full = session.current.length >= limit;

  const commit = (next: FeltSession) => save(next);

  const place = (xCm: number, yCm: number) => {
    if (!hold || full || session.status === "done") return;
    const hit = shotOnHold(hold, xCm, yCm);
    commit({
      ...session,
      touched: new Date().toISOString(),
      current: [...session.current, { xCm, yCm, ...hit }],
    });
  };

  const undo = () => {
    if (session.current.length === 0) return;
    commit({ ...session, touched: new Date().toISOString(), current: session.current.slice(0, -1) });
  };

  const next = () => {
    if (!course || !full) return;
    const sealed = [...session.sealed, { shots: session.current, ...timing.current }];
    timing.current = { elapsedMs: null, overTime: null };
    const done = session.holdIndex + 1 >= course.holds.length;
    const saved: FeltSession = {
      ...session,
      sealed,
      current: [],
      holdIndex: done ? session.holdIndex : session.holdIndex + 1,
      status: done ? "done" : "open",
      touched: new Date().toISOString(),
    };
    commit(saved);
    if (done) onFinished(saved.id);
  };

  const holdTallyNow = holdTally(session.current);

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hjem
      </button>
      <p className="mt-2 text-xs font-medium tracking-wide text-brass uppercase">{session.courseName}</p>
      {hold ? (
        <h1 className="mt-1 text-2xl font-semibold">
          Hold {hold.number}
          <span className="text-muted">
            {" "}
            · {session.holdIndex + 1} av {course?.holds.length}
          </span>
        </h1>
      ) : (
        <h1 className="mt-1 text-2xl font-semibold">Løype ferdig</h1>
      )}
      {hold ? (
        <p className="mt-1 text-sm text-muted">
          {hold.distance} · {hold.position} · gruppe {session.group}
        </p>
      ) : null}
      <p className="mt-4 font-score text-5xl leading-none text-brass tabular-nums">
        {tally.points}
        <span className="ml-2 text-2xl text-fg">{holdTallyNow.points} dette holdet</span>
      </p>
      {course ? (
        <SeriesTimer key={session.holdIndex} seconds={course.seconds} timing={timing} />
      ) : null}
      {hold ? (
        <div className="mt-4">
          <FeltBoard hold={hold} shots={session.current} readOnly={full} onPlace={place} />
        </div>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        {session.current.length} av {limit} skudd · {holdTallyNow.treff} treff · {holdTallyNow.figures} figurer
        {holdTallyNow.inner ? ` · ${holdTallyNow.inner} inner` : ""}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={session.current.length === 0}
          className="h-11 rounded-full border border-line px-4 text-sm disabled:opacity-40"
        >
          Angre
        </button>
        {full ? (
          <button
            type="button"
            onClick={next}
            className="h-11 flex-1 rounded-full bg-brass text-sm font-semibold text-brass-ink"
          >
            {course && session.holdIndex + 1 >= course.holds.length ? "Avslutt løype" : "Neste hold"}
          </button>
        ) : null}
      </div>
    </main>
  );
}
