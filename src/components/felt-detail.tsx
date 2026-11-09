import { ArrowLeft } from "lucide-react";
import { FeltBoard } from "@/components/felt-board";
import { ResultCard } from "@/components/result-card";
import { weaponLabel } from "@/components/weapon-field";
import { dayLabel, clockLabel } from "@/lib/ipsc/format";
import { feltCourse, holdTally, sessionTally } from "@/lib/treffpunkt/felt";
import { useFaktor } from "@/lib/store";

export function FeltDetail({
  sessionId,
  onBack,
  onContinue,
  onDeleted,
}: {
  sessionId: string;
  onBack: () => void;
  onContinue: () => void;
  onDeleted: () => void;
}) {
  const session = useFaktor((state) => state.feltSessions.find((item) => item.id === sessionId));
  const weapon = useFaktor((state) => state.weapons.find((item) => item.id === session?.weaponId));
  const remove = useFaktor((state) => state.deleteFeltSession);

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

  const course = feltCourse(session.courseId);
  const totals = sessionTally(session);

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Mine økter
      </button>
      <p className="mt-2 text-xs font-medium tracking-wide text-brass uppercase">
        {session.status === "open" ? "Åpen løype" : "Ferdig"} · {dayLabel(session.at)} {clockLabel(session.at)}
      </p>
      <h1 className="mt-1 font-score text-4xl leading-none">{session.courseName}</h1>
      <p className="mt-2 text-sm text-muted">
        Gruppe {session.group}
        {session.place ? ` · ${session.place}` : ""}
        {weapon ? ` · ${weaponLabel(weapon)}` : ""}
      </p>
      <p className="mt-4 font-score text-5xl leading-none text-brass tabular-nums">
        {totals.points}
        <span className="ml-2 text-2xl text-fg">{totals.inner} inner</span>
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
      <ul className="mt-6 flex flex-col gap-3">
        {session.sealed.map((hold, index) => {
          const def = course?.holds[index];
          const tally = holdTally(hold.shots);
          return (
            <li key={def?.number ?? index} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-baseline justify-between">
                <span>
                  Hold {def?.number ?? index + 1}
                  {hold.overTime ? <span className="ml-2 text-miss">over tid</span> : null}
                </span>
                <span className="font-score text-2xl tabular-nums">{tally.points}</span>
              </div>
              <p className="text-sm text-muted">
                {tally.treff} treff · {tally.figures} figurer
                {tally.inner ? ` · ${tally.inner} inner` : ""}
              </p>
              {def ? (
                <div className="mt-2">
                  <FeltBoard hold={def} shots={hold.shots} readOnly />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ResultCard
        title={session.courseName}
        meta={`Gruppe ${session.group}${weapon ? ` · ${weaponLabel(weapon)}` : ""}${session.place ? ` · ${session.place}` : ""}`}
        lines={session.sealed.map((hold, index) => {
          const tally = holdTally(hold.shots);
          return {
            label: `Hold ${course?.holds[index]?.number ?? index + 1}${hold.overTime ? " · over tid" : ""}`,
            value: `${tally.points} (${tally.treff}+${tally.figures})`,
          };
        })}
        total={`${totals.points} poeng · ${totals.inner} inner`}
      />
      <button
        type="button"
        className="mt-6 text-sm text-miss"
        onClick={() => {
          remove(session.id);
          onDeleted();
        }}
      >
        Slett økt
      </button>
    </main>
  );
}
