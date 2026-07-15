/**
 * useSettings — extensible user interface preferences
 *
 * Preferences are persisted to localStorage under "velea_settings" ONLY when
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

export interface SettingsState {
  /** Dark or light mode */
  appearance: AppearanceMode;
  /** Whether to show numeric task counts on mode orbs (false = show "·" dot) */
  showOrbCounts: boolean;
  /** Soft open (David 2026-07-16): first open of a new day greets — hero + calendar + one
      aligned task, orb numbers hidden — until "Show my day" or this is turned off. */
  softOpen: boolean;
  /** How many tasks to show at once in the Today view */
  todayTaskLimit: TodayTaskLimit;
  /** Let the daily go/hold verdict tilt task ordering (default off) */
  verdictShapesRanking: boolean;
  /** While a slow planet activates your MC/IC, let the pole's life-areas rise (default off) */
  meridianLift: boolean;
  /** Underline glossary terms in prose and explain them on tap/hover (default off) */
  glossaryTooltips: boolean;

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
  softOpen: true,
  todayTaskLimit: 3,
  verdictShapesRanking: false,
  meridianLift: false,
  glossaryTooltips: true,
};

const STORAGE_KEY = "velea_settings";

// ─── Persistence helpers ──────────────────────────────────────────────────────

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SettingsState> & { _glossOn?: boolean };
    // Merge with defaults so new keys are always present
    const merged = { ...DEFAULTS, ...parsed };
    // One-time migration: inline glossary tooltips ship on by default. Existing testers
    // had it persisted false from the prior build — flip it on once, then respect choice.
    if (!parsed._glossOn) {
      merged.glossaryTooltips = true;
      (merged as any)._glossOn = true;
      persistSettings(merged);
    }
    return merged;
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
