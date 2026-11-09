import { useMemo } from "react";
import { ArrowLeft, ChevronRight, Trophy } from "lucide-react";
import { DrillHome } from "@/components/drill-home";
import type { CategoryId, View } from "@/lib/nav";
import { useRingSessions } from "@/lib/store";
import { CATEGORIES, programsIn, totalShots, type ProgramDef } from "@/lib/treffpunkt/programs";
import { bestByProgram, type ProgramBest } from "@/lib/treffpunkt/stats";

export function CategoryView({
  category,
  onBack,
  onOpen,
}: {
  category: CategoryId;
  onBack: () => void;
  onOpen: (view: View) => void;
}) {
  const meta = CATEGORIES.find((item) => item.id === category);
  const sessions = useRingSessions();
  const best = useMemo(() => bestByProgram(sessions), [sessions]);

  return (
    <main className="px-4 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hjem
      </button>
      <h1 className="mt-2 font-score text-5xl leading-none">{meta?.name ?? "Kategori"}</h1>
      {category === "ipsc" ? (
        <>
          <p className="mt-3 text-muted">
            Sett treffene på skiva og tast tiden fra skuddtimeren. Hit factor er poeng delt på
            sekunder.
          </p>
          <div className="mt-6">
            <DrillHome onOpen={onOpen} />
          </div>
        </>
      ) : null}
      {category === "mil" ? (
        <p className="mt-6 text-muted">Ingen programmer i denne kategorien ennå.</p>
      ) : null}
      {category === "felt" ? (
        <p className="mt-6 text-muted">
          Norgesfelt føres ikke i denne utgaven. IPSC-kategorien er det som er lagt til: tid, soner
          og hit factor.
        </p>
      ) : null}
      {category === "luft" || category === "fin-grov" ? (
        <ul className="mt-6 flex flex-col gap-3">
          {programsIn(category).map((program) => (
            <li key={program.id}>
              <ProgramCard
                program={program}
                best={best.get(program.id)}
                onOpen={() => onOpen({ name: "setup", programId: program.id })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

function ProgramCard({
  program,
  best,
  onOpen,
}: {
  program: ProgramDef;
  best?: ProgramBest;
  onOpen: () => void;
}) {
  const stageNames = program.stages.map((stage) => stage.name).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-left transition-colors hover:border-muted"
    >
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-semibold">{program.name}</span>
        <span className="mt-1 block text-sm text-muted">
          {totalShots(program)} skudd · {stageNames}
        </span>
        {best ? (
          <span className="mt-1 inline-flex items-center gap-1 text-sm text-brass tabular-nums">
            <Trophy className="size-3.5" aria-hidden="true" />
            Pers {best.points}
            {best.inner ? ` · ${best.inner}X` : ""}
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}
