import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "treffpunkt-chunk-reload";

/**
 * React.lazy that survives a new deploy: a tab still running the old build asks
 * for a chunk that no longer exists. Reload once to pick up the new build
 * instead of showing the error page.
 */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>) {
  return lazy(async () => {
    try {
      const component = await load();
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* storage blocked */
      }
      return { default: component };
    } catch (error) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* storage blocked */
      }
      if (!reloaded && navigator.onLine) {
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  });
}
