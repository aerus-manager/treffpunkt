import { useId } from "react";
import { UserRound } from "lucide-react";
import { useFaktor } from "@/lib/store";

/** Switch shooter on a shared device (club tablet, family phone). Hidden with only one profile. */
export function ProfileChip() {
  const profiles = useFaktor((state) => state.profiles);
  const active = useFaktor((state) => state.activeProfileId);
  const setActive = useFaktor((state) => state.setActiveProfile);
  const id = useId();
  if (profiles.length < 2) return null;
  return (
    <label
      htmlFor={id}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface pr-1 pl-3 text-sm"
    >
      <UserRound className="size-4 text-brass" aria-hidden="true" />
      <span className="sr-only">Skytter</span>
      <select
        id={id}
        value={active}
        onChange={(event) => setActive(event.target.value)}
        className="h-8 max-w-40 truncate bg-transparent pr-1 text-fg outline-none"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id} className="bg-surface">
            {profile.name}
          </option>
        ))}
      </select>
    </label>
  );
}
