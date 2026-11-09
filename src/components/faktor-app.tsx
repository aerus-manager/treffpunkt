import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, House, Plus } from "lucide-react";
import { CategoryView } from "@/components/category-view";
import { DrillForm } from "@/components/drill-form";
import { LogView } from "@/components/log-view";
import { RunDetail } from "@/components/run-detail";
import { SeriesShoot } from "@/components/series-shoot";
import { SessionDetail } from "@/components/session-detail";
import { SetupView } from "@/components/setup-view";
import { ShootView } from "@/components/shoot-view";
import { TpHome } from "@/components/tp-home";
import type { View } from "@/lib/nav";
import { useFaktor } from "@/lib/store";
import { programById } from "@/lib/treffpunkt/programs";

export function TreffpunktApp() {
  const [view, setView] = useState<View>({ name: "home" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const next = "treffpunkt-dagbok";
      const previous = localStorage.getItem("faktor-logg");
      if (previous && !localStorage.getItem(next)) localStorage.setItem(next, previous);
    } catch {
      /* private mode */
    }
    void Promise.resolve(useFaktor.persist.rehydrate()).then(() => setReady(true));
  }, []);

  const focused = view.name === "shoot" || view.name === "form" || view.name === "series" || view.name === "setup";
  const showFab = view.name === "category" && view.category === "ipsc";

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className={`mx-auto w-full max-w-lg ${showFab ? "pb-36" : focused ? "pb-8" : "pb-24"}`}>
        {view.name === "home" ? <TpHome ready={ready} onOpen={setView} /> : null}
        {view.name === "category" ? (
          <CategoryView
            category={view.category}
            ready={ready}
            onBack={() => setView({ name: "home" })}
            onOpen={setView}
          />
        ) : null}
        {view.name === "setup" ? (
          <SetupView
            programId={view.programId}
            onBack={() => {
              const program = programById(view.programId);
              setView(program ? { name: "category", category: program.category } : { name: "home" });
            }}
            onStart={(sessionId) => setView({ name: "series", sessionId })}
          />
        ) : null}
        {view.name === "series" ? (
          <SeriesShoot
            sessionId={view.sessionId}
            onClose={() => setView({ name: "home" })}
            onFinished={(sessionId) => setView({ name: "session", sessionId })}
          />
        ) : null}
        {view.name === "session" ? (
          <SessionDetail
            sessionId={view.sessionId}
            onBack={() => setView({ name: "log" })}
            onContinue={() => setView({ name: "series", sessionId: view.sessionId })}
            onDeleted={() => setView({ name: "log" })}
          />
        ) : null}
        {view.name === "log" ? <LogView ready={ready} onOpen={setView} /> : null}
        {view.name === "form" ? (
          <DrillForm
            drillId={view.drillId}
            onDone={() => setView({ name: "category", category: "ipsc" })}
          />
        ) : null}
        {view.name === "shoot" ? (
          <ShootView
            drillId={view.drillId}
            runId={view.runId}
            onClose={() =>
              setView(view.runId ? { name: "run", runId: view.runId } : { name: "category", category: "ipsc" })
            }
            onSaved={(runId) => setView({ name: "run", runId })}
          />
        ) : null}
        {view.name === "run" ? (
          <RunDetail
            runId={view.runId}
            onBack={() => setView({ name: "log" })}
            onEdit={() => {
              const run = useFaktor.getState().runs.find((item) => item.id === view.runId);
              if (!run) return;
              setView({ name: "shoot", drillId: run.drillId, runId: run.id });
            }}
            onDeleted={() => setView({ name: "log" })}
            onAgain={(drillId) => setView({ name: "shoot", drillId })}
          />
        ) : null}
      </div>
      {focused ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-lg grid-cols-2">
            <NavButton
              active={view.name === "home" || view.name === "category"}
              label="Hjem"
              icon={<House className="size-5" aria-hidden="true" />}
              onClick={() => setView({ name: "home" })}
            />
            <NavButton
              active={view.name === "log" || view.name === "run" || view.name === "session"}
              label="Mine økter"
              icon={<BookOpen className="size-5" aria-hidden="true" />}
              onClick={() => setView({ name: "log" })}
            />
          </div>
        </nav>
      )}
      {showFab ? (
        <button
          type="button"
          className="fixed right-4 bottom-20 z-20 flex size-14 items-center justify-center rounded-full bg-brass text-brass-ink"
          onClick={() => setView({ name: "form" })}
          aria-label="Ny drill"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
        active ? "text-brass" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
