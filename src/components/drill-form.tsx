import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { START_LABEL } from "@/lib/ipsc/drills";
import type { CountMode, Drill, StartPosition } from "@/lib/ipsc/types";
import { useFaktor } from "@/lib/store";

const STARTS: StartPosition[] = ["hylster", "lav", "vendt", "valgfritt"];

export function DrillForm({ drillId, onDone }: { drillId?: string; onDone: () => void }) {
  const existing = useFaktor((state) => state.customDrills.find((drill) => drill.id === drillId));
  const saveDrill = useFaktor((state) => state.saveDrill);
  const deleteDrill = useFaktor((state) => state.deleteDrill);
  const [name, setName] = useState(existing?.name ?? "");
  const [blurb, setBlurb] = useState(existing?.blurb ?? "");
  const [countMode, setCountMode] = useState<CountMode>(existing?.countMode ?? "all");
  const [start, setStart] = useState<StartPosition>(existing?.start ?? "hylster");
  const [distance, setDistance] = useState(existing?.distanceM != null ? String(existing.distanceM) : "7");
  const [steel, setSteel] = useState(existing?.steel ?? 0);
  const [papers, setPapers] = useState(
    existing?.papers ?? [{ id: crypto.randomUUID(), label: "Skive 1", requiredHits: 6 }],
  );
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Gi drillen et navn.");
      return;
    }
    if (papers.length === 0 && steel === 0) {
      setError("Legg til minst én skive eller ett stål.");
      return;
    }
    const parsedDistance = distance.trim() === "" ? null : Number(distance.replace(",", "."));
    if (parsedDistance != null && (!Number.isFinite(parsedDistance) || parsedDistance <= 0 || parsedDistance > 300)) {
      setError("Avstanden må være mellom 1 og 300 meter.");
      return;
    }
    const drill: Drill = {
      id: existing?.id ?? crypto.randomUUID(),
      name: trimmed.slice(0, 48),
      blurb: blurb.trim().slice(0, 140),
      builtin: false,
      distanceM: parsedDistance,
      start,
      countMode,
      papers: papers.map((paper, index) => ({
        ...paper,
        label: paper.label.trim() || `Skive ${index + 1}`,
        requiredHits: clamp(paper.requiredHits, 1, 12),
      })),
      steel,
    };
    saveDrill(drill);
    onDone();
  }

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onDone} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Driller
      </button>
      <h1 className="mt-2 font-score text-4xl">{existing ? "Endre drill" : "Ny drill"}</h1>
      <label className="mt-6 block text-sm text-muted">
        Navn
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
          maxLength={48}
          placeholder="Sterk hånd, 6 skudd"
        />
      </label>
      <label className="mt-4 block text-sm text-muted">
        Notat
        <input
          value={blurb}
          onChange={(event) => setBlurb(event.target.value)}
          className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
          maxLength={140}
          placeholder="Hva som skiller denne fra Bill Drill"
        />
      </label>
      <fieldset className="mt-5">
        <legend className="text-sm text-muted">Hvordan treffene teller</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Choice active={countMode === "all"} onClick={() => setCountMode("all")} label="Alle skudd" />
          <Choice active={countMode === "best"} onClick={() => setCountMode("best")} label="Beste treff" />
        </div>
        <p className="mt-2 text-sm text-muted">
          {countMode === "all"
            ? "Hvert hull teller. Mangler det skudd mot kravet, blir resten bom."
            : "Comstock: bare de beste treffene på hver skive beholdes. Ekstra skudd kastes."}
        </p>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="text-sm text-muted">Start</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {STARTS.map((item) => (
            <Choice key={item} active={start === item} onClick={() => setStart(item)} label={START_LABEL[item]} />
          ))}
        </div>
      </fieldset>
      <label className="mt-5 block text-sm text-muted">
        Avstand i meter
        <input
          inputMode="decimal"
          value={distance}
          onChange={(event) => setDistance(event.target.value.replace(/[^0-9.,]/g, ""))}
          className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
        />
      </label>
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Skiver</h2>
          <button
            type="button"
            className="h-11 px-2 text-sm text-brass"
            onClick={() =>
              setPapers((current) =>
                current.length >= 6
                  ? current
                  : [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        label: `Skive ${current.length + 1}`,
                        requiredHits: countMode === "best" ? 2 : 2,
                      },
                    ],
              )
            }
          >
            Legg til
          </button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {papers.map((paper, index) => (
            <li key={paper.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <input
                  value={paper.label}
                  onChange={(event) =>
                    setPapers((current) =>
                      current.map((item) => (item.id === paper.id ? { ...item, label: event.target.value } : item)),
                    )
                  }
                  className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-base"
                  aria-label={`Navn på skive ${index + 1}`}
                />
                <button
                  type="button"
                  className="h-11 px-2 text-sm text-muted"
                  onClick={() => setPapers((current) => current.filter((item) => item.id !== paper.id))}
                >
                  Fjern
                </button>
              </div>
              <div className="mt-2">
                <Stepper
                  label="Treff som kreves"
                  value={paper.requiredHits}
                  min={1}
                  max={12}
                  onChange={(value) =>
                    setPapers((current) =>
                      current.map((item) => (item.id === paper.id ? { ...item, requiredHits: value } : item)),
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-4 rounded-card border border-line bg-surface p-3">
        <Stepper label="Stål som må falle" value={steel} min={0} max={8} onChange={setSteel} />
      </div>
      {error ? <p className="mt-4 text-sm text-miss">{error}</p> : null}
      <button
        type="button"
        onClick={save}
        className="mt-6 h-12 w-full rounded-full bg-brass text-base font-semibold text-brass-ink"
      >
        Lagre drill
      </button>
      {existing ? (
        <button
          type="button"
          className="mt-3 h-12 w-full text-sm text-miss"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            deleteDrill(existing.id);
            onDone();
          }}
        >
          {confirmDelete ? "Bekreft sletting" : "Slett drill"}
        </button>
      ) : null}
    </main>
  );
}

function Choice({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-full border text-sm font-medium ${
        active ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface text-fg"
      }`}
    >
      {label}
    </button>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="size-11 rounded-full border border-line text-lg"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Færre, ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <button
          type="button"
          className="size-11 rounded-full border border-line text-lg"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Flere, ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
