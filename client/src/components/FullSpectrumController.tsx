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
    const surfaceVars = ["--background", "--card", "--popover", "--secondary"];
    if (!on) return;

    root.classList.add("full-spectrum");
    // Mid-dark tint: the mode hue mixed into a near-black base. Surfaces share one shade
    // (cards read by their borders); --secondary is a touch lighter so inputs still lift.
    // The Build (gold) day leans on a WARM near-black base so the tint reads golden, not
    // olive; the cool modes keep the cool base. Lightness stays low either way, so gold
    // labels / gold font sitting ON the surface keep their contrast.
    const isBuild = color.trim().toUpperCase() === "#D4AF37";
    const base = isBuild ? "#0d0a04" : "#070b12";
    const base2 = isBuild ? "#141005" : "#0b1119";
    const surface = `color-mix(in srgb, ${color} 30%, ${base})`;
    root.style.setProperty("--background", surface);
    root.style.setProperty("--card", surface);
    root.style.setProperty("--popover", surface);
    root.style.setProperty("--secondary", `color-mix(in srgb, ${color} 42%, ${base2})`);

    return () => {
      root.classList.remove("full-spectrum");
      surfaceVars.forEach((v) => root.style.removeProperty(v));
    };
  }, [on, color]);

  return null;
}
