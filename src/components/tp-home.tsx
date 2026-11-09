import { useState } from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { ProfileChip } from "@/components/profile-chip";
import type { View } from "@/lib/nav";
import { CATEGORIES, programById } from "@/lib/treffpunkt/programs";
import { sessionPoints, type RingSession } from "@/lib/treffpunkt/session";
import { useFaktor, useRingSessions, useRuns } from "@/lib/store";

const BACKUP_NAG_DAYS = 30;
const BACKUP_NAG_MIN_ENTRIES = 5;

export function TpHome({ onOpen }: { onOpen: (view: View) => void }) {
  const sessions = useRingSessions();
  const runs = useRuns();
  const open = sessions
    .filter((session) => session.status === "open")
    .sort((a, b) => b.touched.localeCompare(a.touched));
  const resume = open[0];
  const empty = sessions.length === 0 && runs.length === 0;
  const lastBackupAt = useFaktor((state) => state.lastBackupAt);
  const entries = useFaktor((state) => state.runs.length + state.ringSessions.length);
  const [now] = useState(() => Date.now());
  const backupDue =
    entries >= BACKUP_NAG_MIN_ENTRIES &&
    (!lastBackupAt || now - Date.parse(lastBackupAt) > BACKUP_NAG_DAYS * 86_400_000);

  return (
    <main className="px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-brass uppercase">Skytedagbok</p>
        <ProfileChip />
      </div>
      <h1 className="mt-1 font-score text-5xl leading-none">Treffpunkt</h1>
      <p className="mt-3 max-w-sm text-muted">
        NSF-programmene, pluss IPSC. På drillene setter du treff og tid, og får hit factor.
      </p>
      {empty ? (
        <p className="mt-4 text-sm text-muted">
          Velg en kategori for å starte. Økten lagres på denne enheten, også uten nett.
        </p>
      ) : null}
      {resume ? (
        <button
          type="button"
          onClick={() => onOpen({ name: "series", sessionId: resume.id })}
          className="mt-6 flex w-full items-center justify-between gap-3 rounded-card border border-brass bg-surface p-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium tracking-wide text-brass uppercase">
              Fortsett økt{open.length > 1 ? ` (${open.length} åpne)` : ""}
            </span>
            <span className="mt-1 block truncate text-lg font-semibold">{resume.programName}</span>
            <span className="mt-1 block text-sm text-muted">{resumeLine(resume)}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-brass" aria-hidden="true" />
        </button>
      ) : null}
      {backupDue ? (
        <button
          type="button"
          onClick={() => onOpen({ name: "settings" })}
          className="mt-4 flex w-full items-center gap-3 rounded-card border border-line bg-surface-2 p-3 text-left text-sm"
        >
          <ShieldAlert className="size-5 shrink-0 text-brass" aria-hidden="true" />
          <span>
            {lastBackupAt
              ? "Det er over en måned siden siste sikkerhetskopi."
              : "Du har ikke tatt sikkerhetskopi av dagboken ennå."}{" "}
            <span className="text-brass">Ta en nå</span>
          </span>
        </button>
      ) : null}
      <ul className="mt-6 flex flex-col gap-3">
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onOpen({ name: "category", category: category.id })}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-left transition-colors hover:border-muted"
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
