/**
 * useSettings — extensible user interface preferences
 *
 * Preferences are persisted to localStorage under "kala_settings" ONLY when
 * saveSettings() is explicitly called. Components that need live-preview can
 * use updateSetting() for local state changes, then call saveSettings() to
 * commit them permanently.
 *
 * Adding a new preference requires only:
 *   1. Adding the field to SettingsState with a default value in DEFAULTS
 *   2. Consuming it via useSettingsContext() anywhere in the app
 *
 * Do NOT store server-side or calculation-affecting state here.
 * This is for display/UX preferences only.
 */

import { useState, useCallback } from "react";

// ─── Settings schema ──────────────────────────────────────────────────────────

export type AppearanceMode = "dark" | "light" | "system";
export type TodayTaskLimit = 1 | 2 | 3 | 4 | 5 | "unlimited";
export type PersonalEnergy = "Low" | "Medium" | "High";

export interface SettingsState {
  /** Dark or light mode */
  appearance: AppearanceMode;
  /** Whether to show numeric task counts on mode orbs (false = show "·" dot) */
  showOrbCounts: boolean;
  /** How many tasks to show at once in the Today view */
  todayTaskLimit: TodayTaskLimit;
  /** Current personal energy level — influences task selection ranking */
  personalEnergy: PersonalEnergy;
  /** Let the daily go/hold verdict tilt task ordering (default off) */
  verdictShapesRanking: boolean;

  // ── Future preferences (not yet implemented) ──────────────────────────────
  // showAstrologyDetails: boolean;
  // compactMode: boolean;
  // reducedMotion: boolean;
  // showTimeLordInfluence: boolean;
  // showQualifierLabels: boolean;
  // plannerDensity: "compact" | "comfortable";
}

const DEFAULTS: SettingsState = {
  appearance: "system",
  showOrbCounts: true,
  todayTaskLimit: 3,
  personalEnergy: "Medium",
  verdictShapesRanking: false,
};

const STORAGE_KEY = "kala_settings";

// ─── Persistence helpers ──────────────────────────────────────────────────────

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    // Merge with defaults so new keys are always present
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function persistSettings(settings: SettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore write errors (private browsing, quota exceeded)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  // Initialize from localStorage once at mount
  const [settings, setSettingsState] = useState<SettingsState>(loadSettings);

  // Update local state only — does NOT persist until saveSettings() is called
  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettingsState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Explicitly persist current state to localStorage
  const saveSettings = useCallback((overrideSettings?: SettingsState) => {
    const toSave = overrideSettings ?? settings;
    persistSettings(toSave);
    if (overrideSettings) {
      setSettingsState(overrideSettings);
    }
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULTS);
  }, []);

  return { settings, updateSetting, saveSettings, resetSettings };
}
