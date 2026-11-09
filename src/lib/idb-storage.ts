import type { PersistStorage, StateStorage, StorageValue } from "zustand/middleware";

/**
 * Async key/value storage on IndexedDB, used by the zustand persist middleware.
 * localStorage tops out around 5 MB and blocks the main thread on every write;
 * a shooting diary with years of shot coordinates outgrows that. Falls back to
 * localStorage when IndexedDB is unavailable (old Safari private mode etc.).
 */
const DB_NAME = "treffpunkt";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

function localGet(name: string): string | null {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

/** Keys older builds wrote to localStorage, newest first. */
const LEGACY_KEYS: Record<string, string[]> = {
  "treffpunkt-dagbok": ["treffpunkt-dagbok", "faktor-logg"],
};

export type SaveErrorListener = (error: unknown) => void;
let onSaveError: SaveErrorListener = () => undefined;
export function setSaveErrorListener(listener: SaveErrorListener) {
  onSaveError = listener;
}

export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      const value = await run<string | undefined>("readonly", (store) => store.get(name));
      if (typeof value === "string") return value;
    } catch {
      return localGet(name);
    }
    // First launch on IndexedDB: carry over data written by older builds.
    for (const key of LEGACY_KEYS[name] ?? [name]) {
      const legacy = localGet(key);
      if (legacy) return legacy;
    }
    return null;
  },
  async setItem(name, value) {
    try {
      await run("readwrite", (store) => store.put(value, name));
    } catch (error) {
      try {
        localStorage.setItem(name, value);
      } catch {
        onSaveError(error);
      }
    }
  },
  async removeItem(name) {
    try {
      await run("readwrite", (store) => store.delete(name));
    } catch {
      /* ignore */
    }
  },
};

/** Ask the browser not to evict the diary under storage pressure (Safari wipes after 7 idle days otherwise). */
export function requestPersistentStorage() {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    /* unsupported */
  }
}

/* ------------------------------------------------------------------------ */
/* Batched persistence for the zustand store                                 */
/* ------------------------------------------------------------------------ */

const WRITE_DELAY_MS = 300;
const CHANNEL = "treffpunkt-sync";
const tabId = Math.random().toString(36).slice(2);

const pending = new Map<string, StorageValue<unknown>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (!channel && typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(CHANNEL);
  return channel;
}

/** Write everything queued now. Called on a timer and whenever the page is hidden. */
export async function flushPendingWrites(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const entries = [...pending];
  pending.clear();
  for (const [name, value] of entries) {
    await idbStorage.setItem(name, JSON.stringify(value));
    getChannel()?.postMessage({ name, from: tabId });
  }
}

if (typeof window !== "undefined") {
  // Last chance before the OS freezes or kills the tab.
  window.addEventListener("pagehide", () => void flushPendingWrites());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushPendingWrites();
  });
}

/** Another tab saved: lets this tab reload instead of overwriting newer data later. */
export function onExternalChange(listener: (name: string) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;
  const handle = (event: MessageEvent<{ name: string; from: string }>) => {
    if (event.data?.from !== tabId && !pending.has(event.data.name)) listener(event.data.name);
  };
  ch.addEventListener("message", handle);
  return () => ch.removeEventListener("message", handle);
}

/**
 * zustand PersistStorage that coalesces rapid changes (one per shot) into a
 * single serialize-and-write, instead of stringifying the whole diary each tap.
 */
export function createBatchedStorage<S>(): PersistStorage<S> {
  return {
    async getItem(name) {
      const raw = await idbStorage.getItem(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StorageValue<S>;
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      pending.set(name, value as StorageValue<unknown>);
      if (!timer) timer = setTimeout(() => void flushPendingWrites(), WRITE_DELAY_MS);
    },
    async removeItem(name) {
      pending.delete(name);
      await idbStorage.removeItem(name);
    },
  };
}
