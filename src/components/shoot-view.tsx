import { useMemo, useState } from "react";
import { ChevronLeft, Undo2 } from "lucide-react";
import { IpscTarget } from "@/components/ipsc-target";
import { ScoreMath } from "@/components/score-math";
import { START_LABEL, drillById } from "@/lib/ipsc/drills";
import { formatTime, parseSeconds } from "@/lib/ipsc/format";
import { scoreRun } from "@/lib/ipsc/scoring";
import type { Drill, PaperTarget, Power, Run, Shot } from "@/lib/ipsc/types";
import { useFaktor } from "@/lib/store";

export function ShootView({
  drillId,
  runId,
  onClose,
  onSaved,
}: {
  drillId: string;
  runId?: string;
  onClose: () => void;
  onSaved: (runId: string) => void;
}) {
  const existing = useFaktor((state) =>
    runId ? state.runs.find((run) => run.id === runId) : undefined,
  );
  const custom = useFaktor((state) => state.customDrills);
  const drill = drillById(drillId, custom);

  // Created once per screen so re-renders never reset an in-progress run.
  const [fresh] = useState<Run | null>(() => (drill && !runId ? newRun(drill) : null));

  if (runId && !existing) return <Missing text="Økta finnes ikke lenger." onClose={onClose} />;
  const base = existing ?? fresh;
  if (!base) return <Missing text="Drillen finnes ikke lenger." onClose={onClose} />;

  return (
    <RunEditor key={base.id} base={base} editing={!!existing} onClose={onClose} onSaved={onSaved} />
  );
}

function newRun(drill: Drill): Run {
  return {
    id: crypto.randomUUID(),
    drillId: drill.id,
    drillName: drill.name,
    blurb: drill.blurb,
    countMode: drill.countMode,
    papers: drill.papers.map((paper) => ({ ...paper })),
    steelDown: Array.from({ length: drill.steel }, () => false),
    distanceM: drill.distanceM,
    start: drill.start,
    at: new Date().toISOString(),
    power: useFaktor.getState().lastPower,
    timeSec: 0,
    shots: [],
    noShootHits: 0,
    procedurals: 0,
    note: "",
  };
}

function RunEditor({
  base,
  editing,
  onClose,
  onSaved,
}: {
  base: Run;
  editing: boolean;
  onClose: () => void;
  onSaved: (runId: string) => void;
}) {
  const saveRun = useFaktor((state) => state.saveRun);
  const [shots, setShots] = useState<Shot[]>(base.shots);
  const [activeId, setActiveId] = useState(base.papers[0]?.id ?? "");
  const [steelDown, setSteelDown] = useState<boolean[]>(base.steelDown);
  const [power, setPower] = useState<Power>(base.power);
  const [time, setTime] = useState(base.timeSec > 0 ? formatTime(base.timeSec) : "");
  const [noShoots, setNoShoots] = useState(base.noShootHits);
  const [procedurals, setProcedurals] = useState(base.procedurals);
  const [note, setNote] = useState(base.note);
  const [error, setError] = useState("");

  const timeSec = parseSeconds(time);
  const draft = useMemo(
    () => ({
      ...base,
      shots,
      steelDown,
      power,
      timeSec: timeSec ?? 0,
      noShootHits: noShoots,
      procedurals,
      note: note.trim().slice(0, 280),
    }),
    [base, shots, steelDown, power, timeSec, noShoots, procedurals, note],
  );
  const score = useMemo(() => scoreRun(draft), [draft]);
  const active: PaperTarget | undefined =
    base.papers.find((paper) => paper.id === activeId) ?? base.papers[0];
  const activeShots = active ? shots.filter((shot) => shot.targetId === active.id) : [];
  const dirty =
    shots.length !== base.shots.length ||
    steelDown.some((down, index) => down !== base.steelDown[index]) ||
    time !== (base.timeSec > 0 ? formatTime(base.timeSec) : "") ||
    noShoots !== base.noShootHits ||
    procedurals !== base.procedurals ||
    note !== base.note;

  const close = () => {
    if (dirty && !window.confirm("Forkaste endringene?")) return;
    onClose();
  };

  const save = () => {
    if (timeSec == null) {
      setError("Tast tiden fra skuddtimeren, f.eks. 3,42.");
      return;
    }
    saveRun(draft);
    onSaved(draft.id);
  };

  return (
    <main className="px-4 pt-4">
      <button
        type="button"
        onClick={close}
        className="inline-flex h-11 items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Avbryt
      </button>
      <h1 className="mt-1 font-score text-4xl leading-none">{base.drillName}</h1>
      <p className="mt-2 text-sm text-muted">
        {START_LABEL[base.start]}
        {base.distanceM != null ? ` · ${String(base.distanceM).replace(".", ",")} m` : ""} ·{" "}
        {base.countMode === "best" ? "beste treff teller" : "alle treff teller"}
        {editing ? " · endrer lagret økt" : ""}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Power factor">
        {(["minor", "major"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={power === value}
            onClick={() => setPower(value)}
            className={`h-11 rounded-full border text-sm font-medium ${
              power === value ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface"
            }`}
          >
            {value === "minor" ? "Minor" : "Major"}
          </button>
        ))}
      </div>

      {base.papers.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Skiver">
          {base.papers.map((paper) => {
            const count = shots.filter((shot) => shot.targetId === paper.id).length;
            return (
              <button
                key={paper.id}
                type="button"
                role="tab"
                aria-selected={paper.id === active?.id}
                onClick={() => setActiveId(paper.id)}
                className={`h-11 shrink-0 rounded-full border px-4 text-sm tabular-nums ${
                  paper.id === active?.id
                    ? "border-brass bg-brass text-brass-ink"
                    : "border-line bg-surface"
                }`}
              >
                {paper.label} {count}/{paper.requiredHits}
              </button>
            );
          })}
        </div>
      ) : null}

      {active ? (
        <div className="mt-4 rounded-card bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted tabular-nums">
              {activeShots.length} av {active.requiredHits} treff · trykk på et hull for å fjerne
              det
            </span>
            <button
              type="button"
              disabled={activeShots.length === 0}
              onClick={() => {
                const last = activeShots[activeShots.length - 1];
                if (last) setShots((current) => current.filter((shot) => shot.id !== last.id));
              }}
              className="inline-flex h-9 items-center gap-1 px-2 text-brass disabled:opacity-40"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Angre
            </button>
          </div>
          <IpscTarget
            shots={activeShots}
            label={`${active.label}: trykk der treffet satt`}
            onPlace={(hit) => {
              setError("");
              setShots((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  targetId: active.id,
                  zone: hit.zone,
                  x: Math.round(hit.x),
                  y: Math.round(hit.y),
                },
              ]);
              navigator.vibrate?.(10);
            }}
            onRemove={(id) => setShots((current) => current.filter((shot) => shot.id !== id))}
          />
        </div>
      ) : null}

      {steelDown.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-sm text-muted">Stål – trykk på de som falt</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {steelDown.map((down, index) => (
              <button
                key={index}
                type="button"
                aria-pressed={down}
                onClick={() =>
                  setSteelDown((current) =>
                    current.map((value, i) => (i === index ? !value : value)),
                  )
                }
                className={`h-11 min-w-20 rounded-full border px-4 text-sm font-medium ${
                  down ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface"
                }`}
              >
                Stål {index + 1}: {down ? "nede" : "oppe"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <label className="mt-5 block text-sm text-muted" htmlFor="tid">
        Tid i sekunder
      </label>
      <input
        id="tid"
        inputMode="decimal"
        autoComplete="off"
        value={time}
        onChange={(event) => {
          setError("");
          setTime(event.target.value.replace(/[^0-9.,]/g, ""));
        }}
        placeholder="0,00"
        className="mt-1 h-14 w-full rounded-card border border-line bg-surface px-3 font-score text-3xl text-fg tabular-nums"
      />

      <div className="mt-4 flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
        <Counter label="No-shoot-treff" value={noShoots} onChange={setNoShoots} />
        <Counter label="Prosedyrefeil" value={procedurals} onChange={setProcedurals} />
      </div>

      <label className="mt-4 block text-sm text-muted">
        Notat
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          placeholder="Valgfritt"
          className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
        />
      </label>

      <section className="mt-4 rounded-card border border-line bg-surface p-4" aria-live="polite">
        <ScoreMath score={score} power={power} timeSec={timeSec} />
      </section>

      {error ? (
        <p className="mt-3 text-sm text-miss" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        className="mt-4 h-12 w-full rounded-full bg-brass text-base font-semibold text-brass-ink"
      >
        {editing ? "Lagre endringer" : "Lagre økt"}
      </button>
    </main>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="size-11 rounded-full border border-line text-lg"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Færre, ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <button
          type="button"
          className="size-11 rounded-full border border-line text-lg"
          onClick={() => onChange(Math.min(20, value + 1))}
          aria-label={`Flere, ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Missing({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <main className="px-4 pt-6">
      <p className="text-muted">{text}</p>
      <button type="button" className="mt-4 h-11 text-brass" onClick={onClose}>
        Tilbake
      </button>
    </main>
  );
}
