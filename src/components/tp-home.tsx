import { ChevronRight } from "lucide-react";
import type { FeltSession } from "@/lib/treffpunkt/felt";
import { sessionTally } from "@/lib/treffpunkt/felt";
import type { View } from "@/lib/nav";
import { CATEGORIES, programById } from "@/lib/treffpunkt/programs";
import { sessionPoints, type RingSession } from "@/lib/treffpunkt/session";
import { useFeltSessions, useRingSessions, useRuns } from "@/lib/store";

export function TpHome({ ready, onOpen }: { ready: boolean; onOpen: (view: View) => void }) {
  const sessions = useRingSessions();
  const felt = useFeltSessions();
  const runs = useRuns();
  const openRing = sessions
    .filter((session) => session.status === "open")
    .sort((a, b) => b.touched.localeCompare(a.touched))[0];
  const openFelt = felt
    .filter((session) => session.status === "open")
    .sort((a, b) => b.touched.localeCompare(a.touched))[0];
  const resumeFelt = openFelt && (!openRing || openFelt.touched > openRing.touched);
  const empty = ready && sessions.length === 0 && felt.length === 0 && runs.length === 0;

  return (
    <main className="px-4 pt-6">
      <p className="text-xs font-medium tracking-wide text-brass uppercase">Skytedagbok</p>
      <h1 className="mt-1 font-score text-5xl leading-none">Treffpunkt</h1>
      <p className="mt-3 max-w-sm text-muted">
        NSF-programmene, feltløype og IPSC. Tid merkes når serien ryker, og resultatet kan skrives ut.
      </p>
      {empty ? <p className="mt-4 text-sm text-muted">Velg en kategori. Økten lagres på denne enheten.</p> : null}
      {resumeFelt && openFelt ? (
        <button
          type="button"
          onClick={() => onOpen({ name: "felt", sessionId: openFelt.id })}
          className="mt-6 w-full rounded-card border border-brass bg-surface p-4 text-left"
        >
          <p className="text-xs font-medium tracking-wide text-brass uppercase">Fortsett løype</p>
          <p className="mt-1 text-lg font-semibold">{openFelt.courseName}</p>
          <p className="mt-1 text-sm text-muted">{feltLine(openFelt)}</p>
        </button>
      ) : openRing ? (
        <button
          type="button"
          onClick={() => onOpen({ name: "series", sessionId: openRing.id })}
          className="mt-6 w-full rounded-card border border-brass bg-surface p-4 text-left"
        >
          <p className="text-xs font-medium tracking-wide text-brass uppercase">Fortsett økt</p>
          <p className="mt-1 text-lg font-semibold">{openRing.programName}</p>
          <p className="mt-1 text-sm text-muted">{resumeLine(openRing)}</p>
        </button>
      ) : null}
      <ul className="mt-6 flex flex-col gap-3">
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onOpen({ name: "category", category: category.id })}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-left"
            >
              <span>
                <span className="block text-lg font-semibold">{category.name}</span>
                <span className="mt-1 block text-sm text-muted">{category.blurb}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onOpen({ name: "weapons" })} className="mt-4 text-sm text-brass">
        Våpen
      </button>
    </main>
  );
}

function resumeLine(session: RingSession): string {
  const stage = programById(session.programId)?.stages[session.stageIndex];
  const points = sessionPoints(session);
  const where = session.place ? `${session.place} · ` : "";
  if (!stage) return `${where}${points.points} poeng`;
  return `${where}${stage.name} · serie ${session.seriesDoneInStage + 1} · ${points.points} poeng`;
}

function feltLine(session: FeltSession): string {
  const points = sessionTally(session);
  return `Hold ${session.holdIndex + 1} · gruppe ${session.group} · ${points.points} poeng`;
}
