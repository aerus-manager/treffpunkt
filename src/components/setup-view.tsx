import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { WeaponField } from "@/components/weapon-field";
import { programById, totalShots } from "@/lib/treffpunkt/programs";
import { createSession } from "@/lib/treffpunkt/session";
import { useFaktor } from "@/lib/store";

export function SetupView({
  programId,
  onBack,
  onStart,
}: {
  programId: string;
  onBack: () => void;
  onStart: (sessionId: string) => void;
}) {
  const program = programById(programId);
  const save = useFaktor((state) => state.saveRingSession);
  const [place, setPlace] = useState("");
  const [weaponId, setWeaponId] = useState<string | null>(null);

  if (!program) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Programmet finnes ikke.</p>
        <button type="button" className="mt-4 text-brass" onClick={onBack}>
          Tilbake
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Programmer
      </button>
      <h1 className="mt-2 font-score text-4xl leading-none">{program.name}</h1>
      <p className="mt-3 text-muted">{totalShots(program)} skudd i alt.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {program.stages.map((stage) => (
          <li key={stage.name} className="rounded-card border border-line bg-surface px-4 py-3 text-sm">
            <span className="font-medium">{stage.name}</span>
            <span className="text-muted">
              {" "}
              · {stage.seriesCount} serier × {stage.shotsPerSeries}
              {stage.secondsPerSeries ? ` · ${stage.secondsPerSeries} s` : ""}
              {(stage.targetsPerSeries ?? 1) > 1 ? ` · ${stage.targetsPerSeries} skiver` : ""}
            </span>
          </li>
        ))}
      </ul>
      <label className="mt-6 block text-sm font-medium" htmlFor="sted">
        Sted
      </label>
      <input
        id="sted"
        value={place}
        onChange={(event) => setPlace(event.target.value)}
        placeholder="Valgfritt, f.eks. Løvenskiold"
        className="mt-2 h-11 w-full rounded-card border border-line bg-surface px-3 text-fg"
      />
      <WeaponField value={weaponId} onChange={setWeaponId} />
      <button
        type="button"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-brass font-semibold text-brass-ink"
        onClick={() => {
          const session = createSession(program, place, weaponId);
          save(session);
          onStart(session.id);
        }}
      >
        Start økt
      </button>
    </main>
  );
}
