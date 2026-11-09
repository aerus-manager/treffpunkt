import { useCallback, useEffect, useState } from "react";

export type CategoryId = "luft" | "fin-grov" | "mil" | "felt" | "ipsc";

const CATEGORY_IDS: CategoryId[] = ["luft", "fin-grov", "mil", "felt", "ipsc"];

export type View =
  | { name: "home" }
  | { name: "category"; category: CategoryId }
  | { name: "setup"; programId: string }
  | { name: "series"; sessionId: string }
  | { name: "session"; sessionId: string }
  | { name: "felt-setup"; courseId: string }
  | { name: "felt"; sessionId: string }
  | { name: "felt-detail"; sessionId: string }
  | { name: "weapons" }
  | { name: "log" }
  | { name: "settings" }
  | { name: "form"; drillId?: string }
  | { name: "shoot"; drillId: string; runId?: string }
  | { name: "run"; runId: string };

const enc = encodeURIComponent;

export function viewToHash(view: View): string {
  switch (view.name) {
    case "home":
      return "#/";
    case "category":
      return `#/kategori/${view.category}`;
    case "setup":
      return `#/program/${enc(view.programId)}`;
    case "series":
      return `#/skyt/${enc(view.sessionId)}`;
    case "session":
      return `#/okt/${enc(view.sessionId)}`;
    case "felt-setup":
      return `#/felt/program/${enc(view.courseId)}`;
    case "felt":
      return `#/felt/skyt/${enc(view.sessionId)}`;
    case "felt-detail":
      return `#/felt/okt/${enc(view.sessionId)}`;
    case "weapons":
      return "#/vapen";
    case "log":
      return "#/logg";
    case "settings":
      return "#/mer";
    case "form":
      return view.drillId ? `#/drill/${enc(view.drillId)}/endre` : "#/drill/ny";
    case "shoot":
      return view.runId
        ? `#/drill/${enc(view.drillId)}/logg/${enc(view.runId)}`
        : `#/drill/${enc(view.drillId)}/logg`;
    case "run":
      return `#/runde/${enc(view.runId)}`;
  }
}

export function hashToView(hash: string): View {
  const parts = hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  const [head, a, b, c] = parts;
  switch (head) {
    case "kategori":
      return CATEGORY_IDS.includes(a as CategoryId)
        ? { name: "category", category: a as CategoryId }
        : { name: "home" };
    case "program":
      return a ? { name: "setup", programId: a } : { name: "home" };
    case "skyt":
      return a ? { name: "series", sessionId: a } : { name: "home" };
    case "okt":
      return a ? { name: "session", sessionId: a } : { name: "log" };
    case "felt":
      if (a === "program" && b) return { name: "felt-setup", courseId: b };
      if (a === "skyt" && b) return { name: "felt", sessionId: b };
      if (a === "okt" && b) return { name: "felt-detail", sessionId: b };
      return { name: "category", category: "felt" };
    case "vapen":
      return { name: "weapons" };
    case "logg":
      return { name: "log" };
    case "mer":
      return { name: "settings" };
    case "drill":
      if (a === "ny") return { name: "form" };
      if (a && b === "endre") return { name: "form", drillId: a };
      if (a && b === "logg") return c ? { name: "shoot", drillId: a, runId: c } : { name: "shoot", drillId: a };
      return { name: "category", category: "ipsc" };
    case "runde":
      return a ? { name: "run", runId: a } : { name: "log" };
    default:
      return { name: "home" };
  }
}

function currentView(): View {
  return typeof window === "undefined" ? { name: "home" } : hashToView(window.location.hash);
}

export type Navigate = (view: View, options?: { replace?: boolean }) => void;
export type GoBack = (parent: View) => void;

const trail: string[] = [];

function stateIndex(): number {
  const idx = (history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" ? idx : -1;
}

export function useHashView(): { view: View; navigate: Navigate; goBack: GoBack } {
  const [view, setView] = useState<View>(currentView);

  useEffect(() => {
    if (stateIndex() < 0) history.replaceState({ idx: 0 }, "", window.location.hash || "#/");
    trail[stateIndex()] = window.location.hash || "#/";
    const sync = () => setView(currentView());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const navigate = useCallback<Navigate>((next, options) => {
    const hash = viewToHash(next);
    const idx = Math.max(0, stateIndex());
    if (options?.replace) {
      history.replaceState({ idx }, "", hash);
      trail[idx] = hash;
    } else if (hash !== window.location.hash) {
      history.pushState({ idx: idx + 1 }, "", hash);
      trail.length = idx + 1;
      trail[idx + 1] = hash;
    }
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const goBack = useCallback<GoBack>(
    (parent) => {
      const idx = stateIndex();
      if (idx > 0 && trail[idx - 1] === viewToHash(parent)) history.back();
      else navigate(parent, { replace: true });
    },
    [navigate],
  );

  return { view, navigate, goBack };
}
