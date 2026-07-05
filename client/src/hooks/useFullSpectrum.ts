import { useSyncExternalStore } from "react";

// Full Spectrum — a visual mode that tints every surface a mid-dark shade of TODAY's
// day-mode color. Device-local (localStorage) so it applies instantly across the whole app
// without a round-trip; can move to server-synced settings later if wanted.
const KEY = "velea-full-spectrum";
const EVENT = "velea-full-spectrum-change";

function get(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** [enabled, setEnabled] — reactive across every component that reads it. */
export function useFullSpectrum(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribe, get, () => false);
  const setOn = (v: boolean) => {
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, setOn];
}
