/**
 * SettingsContext — provides interface preferences app-wide
 *
 * Wrap the app root with <SettingsProvider> to make settings
 * available via useSettingsContext() in any component.
 *
 * Settings are loaded from localStorage at mount.
 * They are only written back to localStorage when saveSettings() is called.
 */

import React, { createContext, useContext } from "react";
import { useSettings } from "@/hooks/useSettings";
import type { SettingsState } from "@/hooks/useSettings";

interface SettingsContextType {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  saveSettings: (overrideSettings?: SettingsState) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsApi = useSettings();

  return (
    <SettingsContext.Provider value={settingsApi}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettingsContext must be used within SettingsProvider");
  }
  return ctx;
}
