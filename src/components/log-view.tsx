import { useMemo, useState } from "react";
import { ProfileChip } from "@/components/profile-chip";
import { clockLabel, dayLabel, formatHf } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import type { View } from "@/lib/nav";
import { useRingSessions, useRuns } from "@/lib/store";
import { sessionPoints } from "@/lib/treffpunkt/session";

type Filter = "all" | "nsf" | "ipsc";

type Row = {
  id: string;
  kind: "nsf" | "ipsc";
  at: string;
  title: string;
  result: string;
  open: boolean;
  detail: string;
  view: View;
};

const PAGE = 40;
const monthFormat = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" });

export function LogView({ onOpen }: { onOpen: (view: View) => void }) {
  const runs = useRuns();
  const sessions = useRingSessions();
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo<Row[]>(
    () =>
      [
        ...sessions.map((session): Row => {
          const totals = sessionPoints(session);
          const open = session.status === "open";
          return {
            id: session.id,
            kind: "nsf",
            at: session.touched || session.at,
            title: session.programName,
            result: open ? "Åpen" : String(totals.points),
            open,
            detail: [
              `${dayLabel(session.at)} ${clockLabel(session.at)}`,
              session.place,
              open ? `${totals.points} poeng så langt` : totals.inner ? `${totals.inner}X` : "",
            ]
              .filter(Boolean)
              .join(" · "),
            view: { name: "session", sessionId: session.id },
          };
        }),
        ...runs.map((run): Row => {
          const score = scoreRun(run);
          return {
            id: run.id,
            kind: "ipsc",
            at: run.at,
            title: run.drillName,
            result: formatHf(score.hitFactor),
            open: false,
            detail: `${dayLabel(run.at)} ${clockLabel(run.at)} · ${run.power === "minor" ? "Minor" : "Major"} · ${score.points} p`,
            view: { name: "run", runId: run.id },
          };
        }),
      ].sort((a, b) => b.at.localeCompare(a.at)),
    [runs, sessions],
  );

  const visible = filter === "all" ? rows : rows.filter((row) => row.kind === filter);
  const shown = visible.slice(0, limit);

  const groups: { month: string; rows: Row[] }[] = [];
  for (const row of shown) {
    const month = monthFormat.format(new Date(row.at));
    const last = groups[groups.length - 1];
    if (last?.month === month) last.rows.push(row);
    else groups.push({ month, rows: [row] });
  }

  return (
    <main className="px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-score text-5xl leading-none">Mine økter</h1>
        <ProfileChip />
      </div>
      <p className="mt-3 text-muted">
        Programmer og IPSC-driller, nyeste først. Alt ligger på denne enheten.
      </p>
      {rows.length > 0 ? (
        <div className="mt-4 flex gap-2" role="group" aria-label="Filter">
          {(
            [
              ["all", `Alle (${rows.length})`],
              ["nsf", "NSF"],
              ["ipsc", "IPSC"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setLimit(PAGE);
              }}
              className={`h-9 rounded-full border px-4 text-sm ${
                filter === value
                  ? "border-brass bg-brass text-brass-ink"
                  : "border-line bg-surface text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-8 text-muted">
          Ingen økter ennå. Start et program, eller logg en IPSC-drill.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-muted">Ingen økter i dette filteret.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.month} className="mt-6">
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{group.month}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {group.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpen(row.view)}
                  className={`w-full rounded-card border bg-surface p-4 text-left transition-colors hover:border-muted ${
                    row.open ? "border-brass/60" : "border-line"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.title}</span>
                    <span
                      className={`shrink-0 font-score text-2xl tabular-nums ${row.open ? "text-muted" : "text-brass"}`}
                    >
                      {row.result}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.detail}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {visible.length > shown.length ? (
        <button
          type="button"
          onClick={() => setLimit((current) => current + PAGE)}
          className="mt-4 h-11 w-full rounded-full border border-line text-sm"
        >
          Vis flere ({visible.length - shown.length} igjen)
        </button>
      ) : null}
    </main>
  );
}
