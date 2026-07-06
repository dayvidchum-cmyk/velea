import { useEffect } from "react";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useFullSpectrum } from "@/hooks/useFullSpectrum";

/**
 * Full Spectrum mode. When enabled, paints every surface (--background / --card / --popover /
 * --secondary) a MID-DARK shade of today's day-mode color — dark enough to keep white text
 * legible, clearly the day's hue. The `full-spectrum` class on <html> flips the text/border
 * tokens light (see index.css) so it reads regardless of the light/dark choice underneath.
 * Renders nothing; it only manages CSS custom properties on the document root.
 */
export default function FullSpectrumController() {
  const [on] = useFullSpectrum();
  const color = useDayModeColor(); // today's MODE_SOLID hex — changes with the day

  useEffect(() => {
    const root = document.documentElement;
    const surfaceVars = ["--background", "--card", "--popover", "--secondary", "--color-background", "--color-card", "--color-popover", "--color-secondary"];
    if (!on) return;

    root.classList.add("full-spectrum");
    // Surfaces share one shade (cards read by their borders); --secondary is a touch lighter so
    // inputs still lift. Build's FS background is a FIXED exact hue David chose (#6F5B1D); the cool
    // modes keep the computed mid-dark tint of their own mode color on a cool near-black base.
    const isBuild = color.trim().toUpperCase() === "#D4AF37";
    let surface: string, secondary: string;
    if (isBuild) {
      surface = "#6F5B1D";
      secondary = "color-mix(in srgb, #6F5B1D 90%, #ffffff)"; // a hair lighter so inputs still lift
    } else {
      surface = `color-mix(in srgb, ${color} 30%, #070b12)`;
      secondary = `color-mix(in srgb, ${color} 42%, #0b1119)`;
    }
    // Set the base tokens AND their --color-* aliases. Tailwind bakes some --color-* tokens to
    // literals (e.g. --color-secondary → light #F5F5F5), so overriding only --secondary leaves any
    // `var(--color-secondary)` surface a glaring white pill in full-spectrum (the tab bar, the
    // "this year" caption, the sheet chips…). Setting the aliases too kills that whole class.
    root.style.setProperty("--background", surface);
    root.style.setProperty("--color-background", surface);
    root.style.setProperty("--card", surface);
    root.style.setProperty("--color-card", surface);
    root.style.setProperty("--popover", surface);
    root.style.setProperty("--color-popover", surface);
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--color-secondary", secondary);

    return () => {
      root.classList.remove("full-spectrum");
      surfaceVars.forEach((v) => root.style.removeProperty(v));
    };
  }, [on, color]);

  return null;
}
