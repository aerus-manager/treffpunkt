import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { IpscTarget } from "@/components/ipsc-target";
import { ScoreMath } from "@/components/score-math";
import { START_LABEL, drillById } from "@/lib/ipsc/drills";
import { formatHf, formatPoints, parseDistance, parseTime } from "@/lib/ipsc/format";
import { ZONE_POINTS, scoreRun } from "@/lib/ipsc/scoring";
import type { Power, Run, Shot, Zone } from "@/lib/ipsc/types";
import { useFaktor } from "@/lib/store";

const MAX_HITS = 30;

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
  const custom = useFaktor((state) => state.customDrills);
  const existing = useFaktor((state) => state.runs.find((run) => run.id === runId));
  const drill = drillById(drillId, custom);
  const setup = existing ?? drill;
  const saveRun = useFaktor((state) => state.saveRun);

  const [power, setPower] = useState<Power>(existing?.power ?? useFaktor.getState().lastPower);
  const [timeRaw, setTimeRaw] = useState(existing ? existing.timeSec.toFixed(2).replace(".", ",") : "");
  const [distanceRaw, setDistanceRaw] = useState(
    setup?.distanceM != null ? String(setup.distanceM).replace(".", ",") : "",
  );
  const [shots, setShots] = useState<Shot[]>(existing?.shots ?? []);
  const [steelDown, setSteelDown] = useState<boolean[]>(
    existing?.steelDown ?? Array.from({ length: drill?.steel ?? 0 }, () => false),
  );
  const [noShootHits, setNoShootHits] = useState(existing?.noShootHits ?? 0);
  const [procedurals, setProcedurals] = useState(existing?.procedurals ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [penOpen, setPenOpen] = useState((existing?.noShootHits ?? 0) > 0 || (existing?.procedurals ?? 0) > 0);
  const [activeId, setActiveId] = useState(setup?.papers[0]?.id ?? "");
  const [error, setError] = useState("");

  const timeSec = parseTime(timeRaw);
  const papers = setup?.papers ?? [];
  const countMode = setup?.countMode ?? "all";
  const sheet = setup;
  const blurb = sheet?.blurb ?? "";
  const startPos = sheet?.start ?? "valgfritt";

  const score = useMemo(
    () =>
      scoreRun({
        power,
        timeSec: timeSec ?? 0,
        countMode,
        papers,
        shots,
        steelDown,
        noShootHits,
        procedurals,
      }),
    [power, timeSec, countMode, papers, shots, steelDown, noShootHits, procedurals],
  );

  if (!sheet) {
    return (
      <main className="px-4 pt-6">
        <p>Drillen finnes ikke lenger.</p>
        <button type="button" className="mt-4 text-brass" onClick={onClose}>
          Tilbake
        </button>
      </main>
    );
  }

  const title = "name" in sheet ? sheet.name : sheet.drillName;

  const active = papers.find((paper) => paper.id === activeId) ?? papers[0];
  const expected = papers.reduce((sum, paper) => sum + paper.requiredHits, 0);
  const placed = shots.length;
  const worth = ZONE_POINTS[power];

  function place(zone: Zone, x: number, y: number) {
    if (!active) return;
    const onTarget = shots.filter((shot) => shot.targetId === active.id).length;
    if (onTarget >= MAX_HITS) {
      setError("Maks 30 treff på en skive.");
      return;
    }
    setError("");
    setShots((current) => [
      ...current,
      { id: crypto.randomUUID(), targetId: active.id, zone, x, y },
    ]);
  }

  function save() {
    if (timeSec == null) {
      setError("Tast tiden fra skuddtimeren, for eksempel 2,48.");
      return;
    }
    const distanceM = parseDistance(distanceRaw);
    if (distanceRaw.trim() && distanceM == null) {
      setError("Avstanden må være mellom 1 og 300 meter.");
      return;
    }
    const run: Run = {
      id: existing?.id ?? crypto.randomUUID(),
      drillId: existing?.drillId ?? drillId,
      drillName: title,
      blurb,
      countMode,
      papers,
      steelDown,
      distanceM,
      start: startPos,
      at: existing?.at ?? new Date().toISOString(),
      power,
      timeSec,
      shots,
      noShootHits,
      procedurals,
      note: note.trim().slice(0, 140),
    };
    saveRun(run);
    onSaved(run.id);
  }

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Tilbake
      </button>
      <h1 className="mt-1 font-score text-4xl leading-none">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {START_LABEL[startPos]}
        {countMode === "best" ? " · beste treff" : " · alle treff teller"}
        {expected > 0 ? ` · ${expected} skudd` : ""}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Choice active={power === "minor"} onClick={() => setPower("minor")} label="Minor" />
        <Choice active={power === "major"} onClick={() => setPower("major")} label="Major" />
      </div>
      <p className="mt-2 text-sm text-muted">
        A {worth.A} · C {worth.C} · D {worth.D} · bom −10. Production skyter Minor.
      </p>

      <label className="mt-4 block text-sm text-muted">
        Tid i sekunder
        <input
          inputMode="decimal"
          autoComplete="off"
          value={timeRaw}
          placeholder="2,48"
          onChange={(event) => setTimeRaw(sanitizeDecimal(event.target.value))}
          className="mt-1 h-16 w-full rounded-card border border-line bg-surface px-4 font-score text-4xl text-fg tabular-nums"
        />
      </label>

      {papers.length > 1 && active ? (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {papers.map((paper) => {
            const count = shots.filter((shot) => shot.targetId === paper.id).length;
            const selected = paper.id === active.id;
            return (
              <button
                key={paper.id}
                type="button"
                onClick={() => setActiveId(paper.id)}
                className={`h-11 shrink-0 rounded-full border px-4 text-sm ${
                  selected ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface"
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
          <IpscTarget
            shots={shots.filter((shot) => shot.targetId === active.id)}
            label={`${active.label}. Trykk der treffet sitter. Trykk et hull for å fjerne det.`}
            onPlace={({ zone, x, y }) => place(zone, x, y)}
            onRemove={(id) => setShots((current) => current.filter((shot) => shot.id !== id))}
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">
              {active.label}: {shots.filter((shot) => shot.targetId === active.id).length} av {active.requiredHits}
            </span>
            <button
              type="button"
              className="h-11 px-2 text-muted"
              onClick={() => {
                const onTarget = shots.filter((shot) => shot.targetId === active.id);
                const last = onTarget[onTarget.length - 1];
                if (!last) return;
                setShots((current) => current.filter((shot) => shot.id !== last.id));
              }}
            >
              Angre
            </button>
          </div>
        </div>
      ) : null}

      {countMode === "all" && expected > 0 && placed > 0 && placed !== expected ? (
        <p className="mt-3 text-sm text-muted">
          {placed < expected
            ? `${expected - placed} skudd mangler og telles som bom.`
            : `${placed - expected} skudd mer enn drillen. De teller likevel.`}
        </p>
      ) : null}

      {steelDown.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-sm text-muted">Stål</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {steelDown.map((down, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  setSteelDown((current) => current.map((value, item) => (item === index ? !value : value)))
                }
                className={`size-16 rounded-full border text-xs font-medium ${
                  down ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface text-muted"
                }`}
                aria-pressed={down}
              >
                {down ? "Nede" : "Oppe"}
                <span className="block">{index + 1}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <button type="button" className="mt-4 h-11 text-sm text-brass" onClick={() => setPenOpen((open) => !open)}>
        {penOpen ? "Skjul straff" : "No-shoot og prosedyre"}
        {noShootHits + procedurals > 0 ? ` (${noShootHits + procedurals})` : ""}
      </button>
      {penOpen ? (
        <div className="mt-2 flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
          <Counter label="No-shoot" value={noShootHits} onChange={setNoShootHits} />
          <Counter label="Prosedyre" value={procedurals} onChange={setProcedurals} />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm text-muted">
          Avstand, meter
          <input
            inputMode="decimal"
            value={distanceRaw}
            onChange={(event) => setDistanceRaw(event.target.value.replace(/[^0-9,]/g, ""))}
            className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
          />
        </label>
        <label className="text-sm text-muted">
          Notat
          <input
            value={note}
            maxLength={140}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 h-12 w-full rounded-card border border-line bg-surface px-3 text-base text-fg"
            placeholder="Våpen, magasin"
          />
        </label>
      </div>

      {shots.length > 0 ? (
        <ul className="mt-4 flex flex-col">
          {shots.map((shot, index) => {
            const paper = papers.find((item) => item.id === shot.targetId);
            return (
              <li key={shot.id} className="flex h-11 items-center justify-between border-t border-line text-sm">
                <span className="tabular-nums">
                  {index + 1}. {paper?.label ?? "Skive"} · {shot.zone}
                </span>
                <button
                  type="button"
                  className="h-11 px-2 text-muted"
                  onClick={() => setShots((current) => current.filter((item) => item.id !== shot.id))}
                >
                  Fjern
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <section className="mt-4 rounded-card border border-line bg-surface p-4">
        <ScoreMath score={score} power={power} timeSec={timeSec} />
      </section>
      {error ? <p className="mt-3 text-sm text-miss">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-3">
          <div>
            <p className="text-xs text-muted">
              {formatPoints(score.points)} poeng
              {timeSec != null ? ` · ${timeSec.toFixed(2).replace(".", ",")} s` : ""}
            </p>
            <p className="font-score text-3xl leading-none text-brass tabular-nums">
              {timeSec == null ? "—" : formatHf(score.hitFactor)}
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            className="ml-auto h-12 rounded-full bg-brass px-6 font-semibold text-brass-ink"
          >
            Lagre
          </button>
        </div>
      </div>
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

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="size-11 rounded-full border border-line"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Færre ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <button
          type="button"
          className="size-11 rounded-full border border-line"
          onClick={() => onChange(Math.min(20, value + 1))}
          aria-label={`Flere ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const [head, ...rest] = cleaned.split(",");
  if (rest.length === 0) return head ?? "";
  return `${head},${rest.join("").slice(0, 2)}`;
}
