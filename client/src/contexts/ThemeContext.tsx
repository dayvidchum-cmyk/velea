import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** @deprecated Use preference/setPreference instead */
  setTheme: (t: Theme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Velea is dark-only by design. Light mode leaves the iOS safe-area / nav painted
 *  near-white (the "white bar" + oversized-footer bug), so force dark regardless of the
 *  OS or the stored preference until a proper light palette is built. */
function resolveTheme(_pref: ThemePreference): Theme {
  return "dark";
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Controlled preference value — when provided, ThemeProvider syncs to this */
  preference?: ThemePreference;
  /** Legacy: controlled theme value */
  theme?: Theme;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  preference: controlledPreference,
  theme: controlledTheme,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  // Determine the preference (system/dark/light)
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (controlledPreference) return controlledPreference;
    if (controlledTheme) return controlledTheme;
    return defaultTheme;
  });

  // Resolved actual theme
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(preference));

  // Sync when controlled preference/theme changes from outside
  useEffect(() => {
    if (controlledPreference && controlledPreference !== preference) {
      setPreferenceState(controlledPreference);
    } else if (controlledTheme && controlledTheme !== preference) {
      setPreferenceState(controlledTheme);
    }
  }, [controlledPreference, controlledTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-resolve theme when preference changes
  useEffect(() => {
    setThemeState(resolveTheme(preference));
  }, [preference]);

  // Listen for OS theme changes when preference is "system"
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  // Apply class to <html> element and update theme-color meta
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    // Update Safari theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#000000" : "#FAFAFA");
    }
  }, [theme]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
  };

  // Legacy compat
  const setTheme = (t: Theme) => {
    setPreferenceState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, setTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
