import { WEAPON_CLASSES, type Weapon } from "@/lib/treffpunkt/weapons";
import { useWeapons } from "@/lib/store";

export function WeaponField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const weapons = useWeapons();
  return (
    <label className="mt-4 block text-sm font-medium">
      Våpen
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="mt-2 h-11 w-full rounded-card border border-line bg-surface px-3"
      >
        <option value="">Ikke valgt</option>
        {weapons.map((weapon) => (
          <option key={weapon.id} value={weapon.id}>
            {weaponLabel(weapon)}
          </option>
        ))}
      </select>
      {weapons.length === 0 ? (
        <span className="mt-1 block font-normal text-muted">Legg inn våpen fra hjem-skjermen først, om du vil.</span>
      ) : null}
    </label>
  );
}

export function weaponLabel(weapon: Weapon): string {
  return `${weapon.name} · ${weapon.classLabel}`;
}

export function classChoices() {
  return WEAPON_CLASSES;
}
