import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BookOpen, House, Plus, Settings } from "lucide-react";
import { CategoryView } from "@/components/category-view";
import { LogView } from "@/components/log-view";
import { TpHome } from "@/components/tp-home";
import { setSaveErrorListener, requestPersistentStorage } from "@/lib/idb-storage";
import { useHashView, type GoBack, type Navigate, type View } from "@/lib/nav";
import { useFaktor } from "@/lib/store";
import { programById } from "@/lib/treffpunkt/programs";
import { useWakeLock } from "@/lib/use-wake-lock";

// Shooting and detail screens load on demand so the home screen paints fast.
const DrillForm = lazy(() =>
  import("@/components/drill-form").then((m) => ({ default: m.DrillForm })),
);
const RunDetail = lazy(() =>
  import("@/components/run-detail").then((m) => ({ default: m.RunDetail })),
);
const SeriesShoot = lazy(() =>
  import("@/components/series-shoot").then((m) => ({ default: m.SeriesShoot })),
);
const SessionDetail = lazy(() =>
  import("@/components/session-detail").then((m) => ({ default: m.SessionDetail })),
);
const SetupView = lazy(() =>
  import("@/components/setup-view").then((m) => ({ default: m.SetupView })),
);
const ShootView = lazy(() =>
  import("@/components/shoot-view").then((m) => ({ default: m.ShootView })),
);
const SettingsView = lazy(() =>
  import("@/components/settings-view").then((m) => ({ default: m.SettingsView })),
);

export function TreffpunktApp() {
  const { view, navigate, goBack } = useHashView();
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    setSaveErrorListener(() => setSaveError(true));
    requestPersistentStorage();
    void Promise.resolve(useFaktor.persist.rehydrate()).finally(() => setReady(true));
  }, []);

  const focused =
    view.name === "shoot" ||
    view.name === "form" ||
    view.name === "series" ||
    view.name === "setup";
  const shooting = view.name === "shoot" || view.name === "series";
  const showFab = view.name === "category" && view.category === "ipsc";
  useWakeLock(shooting);

  return (
    <div className="min-h-screen bg-bg text-fg">
      {saveError ? (
        <div
          role="alert"
          className="sticky top-0 z-30 bg-miss px-4 py-2 text-sm font-medium text-bg"
        >
          Kunne ikke lagre. Lagringsplassen kan være full. Ta en sikkerhetskopi under «Mer».
        </div>
      ) : null}
      <div
        className={`mx-auto w-full max-w-lg ${showFab ? "pb-36" : focused ? "pb-8" : "pb-24"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Suspense fallback={<p className="px-4 pt-6 text-sm text-muted">Laster…</p>}>
          {ready ? <Screen view={view} navigate={navigate} goBack={goBack} /> : <Loading />}
        </Suspense>
      </div>
      {focused ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Hovedmeny"
        >
          <div className="mx-auto grid max-w-lg grid-cols-3">
            <NavButton
              active={view.name === "home" || view.name === "category"}
              label="Hjem"
              icon={<House className="size-5" aria-hidden="true" />}
              onClick={() => navigate({ name: "home" })}
            />
            <NavButton
              active={view.name === "log" || view.name === "run" || view.name === "session"}
              label="Mine økter"
              icon={<BookOpen className="size-5" aria-hidden="true" />}
              onClick={() => navigate({ name: "log" })}
            />
            <NavButton
              active={view.name === "settings"}
              label="Mer"
              icon={<Settings className="size-5" aria-hidden="true" />}
              onClick={() => navigate({ name: "settings" })}
            />
          </div>
        </nav>
      )}
      {showFab ? (
        <button
          type="button"
          className="fixed right-4 bottom-24 z-20 flex size-14 items-center justify-center rounded-full bg-brass text-brass-ink shadow-lg"
          onClick={() => navigate({ name: "form" })}
          aria-label="Ny drill"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="px-4 pt-6" aria-busy="true">
      <p className="text-xs font-medium tracking-wide text-brass uppercase">Skytedagbok</p>
      <p className="mt-1 font-score text-5xl leading-none">Treffpunkt</p>
      <p className="mt-6 text-sm text-muted">Henter dagboken…</p>
    </div>
  );
}

function Screen({ view, navigate, goBack }: { view: View; navigate: Navigate; goBack: GoBack }) {
  switch (view.name) {
    case "home":
      return <TpHome onOpen={navigate} />;
    case "category":
      return (
        <CategoryView
          category={view.category}
          onBack={() => goBack({ name: "home" })}
          onOpen={navigate}
        />
      );
    case "setup": {
      const program = programById(view.programId);
      return (
        <SetupView
          programId={view.programId}
          onBack={() =>
            goBack(program ? { name: "category", category: program.category } : { name: "home" })
          }
          onStart={(sessionId) => navigate({ name: "series", sessionId }, { replace: true })}
        />
      );
    }
    case "series":
      return (
        <SeriesShoot
          sessionId={view.sessionId}
          onClose={() => goBack({ name: "home" })}
          onFinished={(sessionId) => navigate({ name: "session", sessionId }, { replace: true })}
        />
      );
    case "session":
      return (
        <SessionDetail
          sessionId={view.sessionId}
          onBack={() => goBack({ name: "log" })}
          onContinue={() => navigate({ name: "series", sessionId: view.sessionId })}
          onDeleted={() => navigate({ name: "log" }, { replace: true })}
          onRestart={(sessionId) => navigate({ name: "series", sessionId })}
        />
      );
    case "log":
      return <LogView onOpen={navigate} />;
    case "settings":
      return <SettingsView />;
    case "form":
      return (
        <DrillForm
          drillId={view.drillId}
          onDone={() => goBack({ name: "category", category: "ipsc" })}
        />
      );
    case "shoot":
      return (
        <ShootView
          drillId={view.drillId}
          runId={view.runId}
          onClose={() =>
            goBack(
              view.runId
                ? { name: "run", runId: view.runId }
                : { name: "category", category: "ipsc" },
            )
          }
          onSaved={(runId) => navigate({ name: "run", runId }, { replace: true })}
        />
      );
    case "run":
      return (
        <RunDetail
          runId={view.runId}
          onBack={() => goBack({ name: "log" })}
          onEdit={() => {
            const run = useFaktor.getState().runs.find((item) => item.id === view.runId);
            if (run) navigate({ name: "shoot", drillId: run.drillId, runId: run.id });
          }}
          onDeleted={() => navigate({ name: "log" }, { replace: true })}
          onAgain={(drillId) => navigate({ name: "shoot", drillId })}
        />
      );
  }
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
      aria-current={active ? "page" : undefined}
      className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
        active ? "text-brass" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
