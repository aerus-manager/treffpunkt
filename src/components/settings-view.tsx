import { useEffect, useRef, useState } from "react";
import { Check, Download, Pencil, Trash2, Upload, UserPlus } from "lucide-react";
import { exportBackup, parseBackup, useFaktor, type Profile } from "@/lib/store";

export function SettingsView() {
  const profiles = useFaktor((state) => state.profiles);
  const activeId = useFaktor((state) => state.activeProfileId);
  const addProfile = useFaktor((state) => state.addProfile);
  const setActive = useFaktor((state) => state.setActiveProfile);
  const importBackup = useFaktor((state) => state.importBackup);
  const runs = useFaktor((state) => state.runs);
  const sessions = useFaktor((state) => state.ringSessions);
  const felt = useFaktor((state) => state.feltSessions);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [usage, setUsage] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bytes = new Blob([exportBackup()]).size;
    setUsage(
      bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} kB`
        : `${(bytes / 1048576).toFixed(1)} MB`,
    );
    void navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => undefined);
  }, [felt, runs, sessions]);

  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `treffpunkt-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ tone: "ok", text: "Sikkerhetskopien er lastet ned." });
  };

  const restore = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const { added } = importBackup(data);
      setMessage({
        tone: "ok",
        text: added === 0 ? "Alt i filen fantes fra før." : `Hentet inn ${added} nye oppføringer.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error && error.message.startsWith("Filen")
            ? error.message
            : "Kunne ikke lese filen.",
      });
    }
  };

  return (
    <main className="px-4 pt-6">
      <h1 className="font-score text-5xl leading-none">Mer</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Skyttere</h2>
        <p className="mt-1 text-sm text-muted">
          Flere kan bruke samme enhet, f.eks. et klubbnettbrett. Hver skytter har egne økter,
          driller og persrekorder.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              active={profile.id === activeId}
              canDelete={profiles.length > 1}
              onSelect={() => setActive(profile.id)}
            />
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newName.trim()) return;
            addProfile(newName);
            setNewName("");
          }}
        >
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={32}
            placeholder="Navn på ny skytter"
            aria-label="Navn på ny skytter"
            className="h-11 min-w-0 flex-1 rounded-card border border-line bg-surface px-3 text-fg"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="inline-flex h-11 items-center gap-1 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink disabled:opacity-40"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Legg til
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Sikkerhetskopi</h2>
        <p className="mt-1 text-sm text-muted">
          Dagboken ligger bare på denne enheten. Last ned en kopi jevnlig, og bruk den for å flytte
          dagboken til en annen telefon. Innlesing slår sammen – ingenting slettes.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={download}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium"
          >
            <Download className="size-4" aria-hidden="true" />
            Last ned
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium"
          >
            <Upload className="size-4" aria-hidden="true" />
            Les inn
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void restore(file);
            }}
          />
        </div>
        {message ? (
          <p
            role="status"
            className={`mt-3 text-sm ${message.tone === "ok" ? "text-brass" : "text-miss"}`}
          >
            {message.text}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted">
          {sessions.length} programøkter, {felt.length} feltløyper og {runs.length} IPSC-runder totalt
          {usage ? ` · ${usage}` : ""}
          {persisted === true ? " · beskyttet mot automatisk sletting" : ""}
        </p>
        {persisted === false ? (
          <p className="mt-2 text-sm text-muted">
            Tips: Legg Treffpunkt til på hjemskjermen. Da sletter ikke nettleseren dagboken når
            plassen blir trang.
          </p>
        ) : null}
      </section>

      <section className="mt-8 text-sm text-muted">
        <h2 className="text-lg font-semibold text-fg">Om</h2>
        <p className="mt-1">
          Treffpunkt virker uten nett når siden først er lastet. Lisens GPL-3.0-or-later.
        </p>
      </section>
    </main>
  );
}

function ProfileRow({
  profile,
  active,
  canDelete,
  onSelect,
}: {
  profile: Profile;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
}) {
  const rename = useFaktor((state) => state.renameProfile);
  const remove = useFaktor((state) => state.deleteProfile);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirm, setConfirm] = useState(false);

  if (editing) {
    return (
      <li>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            rename(profile.id, name);
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={32}
            aria-label="Nytt navn"
            className="h-11 min-w-0 flex-1 rounded-card border border-brass bg-surface px-3 text-fg"
          />
          <button
            type="submit"
            className="h-11 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink"
          >
            Lagre
          </button>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-card border bg-surface pl-2 ${active ? "border-brass" : "border-line"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex h-12 min-w-0 flex-1 items-center gap-2 px-2 text-left"
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-brass bg-brass text-brass-ink" : "border-line"
          }`}
        >
          {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
        </span>
        <span className="truncate font-medium">{profile.name}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setName(profile.name);
          setEditing(true);
        }}
        className="flex size-11 items-center justify-center text-muted"
        aria-label={`Gi ${profile.name} nytt navn`}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      {canDelete ? (
        <button
          type="button"
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              window.setTimeout(() => setConfirm(false), 4000);
              return;
            }
            remove(profile.id);
          }}
          className={`flex h-11 items-center justify-center px-3 text-sm ${confirm ? "text-miss" : "text-muted"}`}
          aria-label={
            confirm ? `Bekreft: slett ${profile.name} og alle øktene` : `Slett ${profile.name}`
          }
        >
          {confirm ? "Slett alt?" : <Trash2 className="size-4" aria-hidden="true" />}
        </button>
      ) : null}
    </li>
  );
}
