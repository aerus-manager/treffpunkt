import type { StateStorage } from "zustand/middleware";

/**
 * Async key/value storage on IndexedDB, used by the zustand persist middleware.
 * localStorage tops out around 5 MB and blocks the main thread on every write.
 * Falls back to localStorage when IndexedDB is unavailable.
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

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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

export function requestPersistentStorage() {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    /* unsupported */
  }
}
