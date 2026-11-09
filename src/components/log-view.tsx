import { dayLabel, clockLabel, formatHf } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import type { View } from "@/lib/nav";
import { sessionPoints } from "@/lib/treffpunkt/session";
import { useFaktor } from "@/lib/store";

type Row = {
  id: string;
  at: string;
  title: string;
  result: string;
  detail: string;
  open: () => void;
};

export function LogView({ ready, onOpen }: { ready: boolean; onOpen: (view: View) => void }) {
  const runs = useFaktor((state) => state.runs);
  const sessions = useFaktor((state) => state.ringSessions);

  const rows: Row[] = [
    ...sessions.map((session) => {
      const totals = sessionPoints(session);
      return {
        id: session.id,
        at: session.touched || session.at,
        title: session.programName,
        result: session.status === "open" ? "Åpen" : String(totals.points),
        detail: `${dayLabel(session.at)} ${clockLabel(session.at)} · ${session.status === "open" ? "ikke avsluttet" : `${totals.points} poeng${totals.inner ? ` · ${totals.inner}X` : ""}`}`,
        open: () => onOpen({ name: "session", sessionId: session.id }),
      };
    }),
    ...runs.map((run) => {
      const score = scoreRun(run);
      return {
        id: run.id,
        at: run.at,
        title: run.drillName,
        result: formatHf(score.hitFactor),
        detail: `${dayLabel(run.at)} ${clockLabel(run.at)} · ${run.power === "minor" ? "Minor" : "Major"} · hit factor`,
        open: () => onOpen({ name: "run", runId: run.id }),
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <main className="px-4 pt-6">
      <h1 className="font-score text-5xl leading-none">Mine økter</h1>
      <p className="mt-3 text-muted">Programmer og IPSC-driller, nyeste først. Alt ligger på denne enheten.</p>
      {!ready ? <p className="mt-8 text-sm text-muted">Henter loggen…</p> : null}
      {ready && rows.length === 0 ? (
        <p className="mt-8 text-muted">Ingen økter ennå. Start et program, eller logg en IPSC-drill.</p>
      ) : null}
      <ul className="mt-6 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={row.open}
              className="w-full rounded-card border border-line bg-surface p-4 text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{row.title}</span>
                <span className="font-score text-2xl text-brass tabular-nums">{row.result}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{row.detail}</p>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
