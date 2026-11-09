import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { WeaponField } from "@/components/weapon-field";
import { createFeltSession, feltCourse, maxPoints, type FeltGroup } from "@/lib/treffpunkt/felt";
import { useFaktor } from "@/lib/store";

export function FeltSetup({
  courseId,
  onBack,
  onStart,
}: {
  courseId: string;
  onBack: () => void;
  onStart: (sessionId: string) => void;
}) {
  const course = feltCourse(courseId);
  const save = useFaktor((state) => state.saveFeltSession);
  const [place, setPlace] = useState("");
  const [group, setGroup] = useState<FeltGroup>("1");
  const [weaponId, setWeaponId] = useState<string | null>(null);

  if (!course) {
    return (
      <main className="px-4 pt-6">
        <p className="text-muted">Løypa finnes ikke.</p>
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
        Felt
      </button>
      <h1 className="mt-2 font-score text-4xl leading-none">{course.name}</h1>
      <p className="mt-3 text-muted">{course.note}</p>
      <p className="mt-2 text-sm text-muted">
        Maks {maxPoints(course, group)} poeng for gruppe {group}. {course.holds.length} hold, {course.seconds} sekunder.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["1", "2"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setGroup(item)}
            className={`h-11 rounded-full border text-sm font-medium ${
              group === item ? "border-brass bg-brass text-brass-ink" : "border-line bg-surface"
            }`}
          >
            Gruppe {item} · {item === "1" ? "6" : "5"} skudd
          </button>
        ))}
      </div>
      <label className="mt-6 block text-sm font-medium" htmlFor="felt-sted">
        Sted
      </label>
      <input
        id="felt-sted"
        value={place}
        onChange={(event) => setPlace(event.target.value)}
        placeholder="Valgfritt"
        className="mt-2 h-11 w-full rounded-card border border-line bg-surface px-3"
      />
      <WeaponField value={weaponId} onChange={setWeaponId} />
      <button
        type="button"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-brass font-semibold text-brass-ink"
        onClick={() => {
          const session = createFeltSession(course, group, place, weaponId);
          save(session);
          onStart(session.id);
        }}
      >
        Start løype
      </button>
    </main>
  );
}
