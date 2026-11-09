import { ArrowLeft, ChevronRight } from "lucide-react";
import { DrillHome } from "@/components/drill-home";
import type { CategoryId, View } from "@/lib/nav";
import { CATEGORIES, programsIn, totalShots, type ProgramDef } from "@/lib/treffpunkt/programs";

export function CategoryView({
  category,
  ready,
  onBack,
  onOpen,
}: {
  category: CategoryId;
  ready: boolean;
  onBack: () => void;
  onOpen: (view: View) => void;
}) {
  const meta = CATEGORIES.find((item) => item.id === category);

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hjem
      </button>
      <h1 className="mt-2 font-score text-5xl leading-none">{meta?.name ?? "Kategori"}</h1>
      {category === "ipsc" ? (
        <>
          <p className="mt-3 text-muted">
            Sett treffene på skiva og tast tiden fra skuddtimeren. Hit factor er poeng delt på sekunder.
          </p>
          <div className="mt-6">
            <DrillHome ready={ready} onOpen={onOpen} />
          </div>
        </>
      ) : null}
      {category === "mil" ? <p className="mt-6 text-muted">Ingen programmer i denne kategorien ennå.</p> : null}
      {category === "felt" ? (
        <p className="mt-6 text-muted">
          Norgesfelt føres ikke i denne utgaven. IPSC-kategorien er det som er lagt til: tid, soner og hit factor.
        </p>
      ) : null}
      {category === "luft" || category === "fin-grov" ? (
        <ul className="mt-6 flex flex-col gap-3">
          {programsIn(category).map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} onOpen={() => onOpen({ name: "setup", programId: program.id })} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

function ProgramCard({ program, onOpen }: { program: ProgramDef; onOpen: () => void }) {
  const stageNames = program.stages.map((stage) => stage.name).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-left"
    >
      <span>
        <span className="block text-lg font-semibold leading-tight">{program.name}</span>
        <span className="mt-1 block text-sm text-muted">
          {totalShots(program)} skudd · {stageNames}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}
