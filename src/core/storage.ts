import type { MediaKitStorage } from "./types";

/** Default storage: namespaced localStorage, degrades to an in-memory Map in SSR/privacy-mode contexts where localStorage throws. */
export function createDefaultStorage(namespace = "nmk"): MediaKitStorage {
  const memory = new Map<string, string>();
  const prefixed = (key: string) => `${namespace}:${key}`;

  let localStorageAvailable = true;
  try {
    if (typeof window === "undefined" || !window.localStorage) localStorageAvailable = false;
  } catch {
    localStorageAvailable = false;
  }

  return {
    get(key) {
      if (!localStorageAvailable) return memory.get(key) ?? null;
      try {
        return window.localStorage.getItem(prefixed(key));
      } catch {
        return memory.get(key) ?? null;
      }
    },
    set(key, value) {
      if (!localStorageAvailable) {
        memory.set(key, value);
        return;
      }
      try {
        window.localStorage.setItem(prefixed(key), value);
      } catch {
        memory.set(key, value);
      }
    },
  };
}
