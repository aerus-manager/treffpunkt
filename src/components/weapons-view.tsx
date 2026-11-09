import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { WEAPON_CLASSES } from "@/lib/treffpunkt/weapons";
import { useWeapons, useFaktor } from "@/lib/store";

export function WeaponsView({ onBack }: { onBack: () => void }) {
  const weapons = useWeapons();
  const save = useFaktor((state) => state.saveWeapon);
  const remove = useFaktor((state) => state.deleteWeapon);
  const [name, setName] = useState("");
  const [classIndex, setClassIndex] = useState(0);

  return (
    <main className="px-4 pt-4">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hjem
      </button>
      <h1 className="mt-2 font-score text-5xl leading-none">Våpen</h1>
      <p className="mt-3 text-muted">Våpenet følger med på økten og resultatarket.</p>
      <ul className="mt-6 flex flex-col gap-2">
        {weapons.map((weapon) => (
          <li key={weapon.id} className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
            <span>
              <span className="block font-medium">{weapon.name}</span>
              <span className="text-sm text-muted">
                {weapon.classLabel} · {weapon.caliberLabel}
              </span>
            </span>
            <button type="button" className="h-11 text-sm text-miss" onClick={() => remove(weapon.id)}>
              Slett
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-6 block text-sm font-medium" htmlFor="vapen-navn">
        Nytt våpen
      </label>
      <input
        id="vapen-navn"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="F.eks. Walther"
        className="mt-2 h-11 w-full rounded-card border border-line bg-surface px-3"
      />
      <select
        value={classIndex}
        onChange={(event) => setClassIndex(Number(event.target.value))}
        className="mt-2 h-11 w-full rounded-card border border-line bg-surface px-3"
        aria-label="Våpenklasse"
      >
        {WEAPON_CLASSES.map((item, index) => (
          <option key={item.classLabel} value={index}>
            {item.classLabel} · {item.caliberLabel}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="mt-3 h-11 w-full rounded-full bg-brass font-semibold text-brass-ink"
        onClick={() => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const weaponClass = WEAPON_CLASSES[classIndex] ?? WEAPON_CLASSES[0];
          save({ id: crypto.randomUUID(), name: trimmed.slice(0, 40), ...weaponClass });
          setName("");
        }}
      >
        Lagre våpen
      </button>
    </main>
  );
}
