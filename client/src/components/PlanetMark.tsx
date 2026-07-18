import type { CSSProperties } from "react";

/**
 * PlanetMark — DAVID'S OWN GLYPHS (his files, 2026-07-17 drop: "Planet Glyphs" folder).
 * The use-the-file law: his 500px transparent PNGs (trimmed, square-padded, in
 * client/public/planet-marks/) render as CSS masks so each glyph takes its planet's
 * ink — never redrawn, never a font. One geometry on every device: the alignment wars
 * stay over. Rahu (☊) and Ketu (☋) joined the family with his drop.
 * Same props API as the drawn version; `strokeWidth` is accepted and ignored.
 */
export const PLANET_MARK_INK: Record<string, string> = {
  // The assigned inks: Mercury aquamarine + Saturn jyotish indigo are David's blessed
  // mark colors; Venus/Mars/Jupiter wear the dasha table's parchment set; the nodes
  // wear the sky-portrait's smoke and ember. Sun/Moon inks stand ready for when their
  // glyph art lands (they fall back to Unicode until then — see below).
  Mercury: "#3FA8A0", Saturn: "#454A8C", Venus: "#CE5F6E", Mars: "#A8002C", Jupiter: "#A2850A",
  Rahu: "#4a4a58", Ketu: "#7a5a48", Sun: "#C2820A", Moon: "#7E7E7E",
};

const FILES: Record<string, string> = {
  Mercury: "mercury", Saturn: "saturn", Venus: "venus", Mars: "mars", Jupiter: "jupiter",
  Rahu: "rahu", Ketu: "ketu",
  // Sun & Moon: no art in David's 2026-07-17 drop yet — they render via the Unicode
  // fallback below. Add "sun"/"moon" here (+ drop the PNGs in planet-marks/) to upgrade.
};

// Fallback so PlanetMark is safe EVERYWHERE (David 2026-07-17: "planet glyphs go everywhere").
// A planet with no PNG renders its Unicode glyph, still tinted its ink — so a surface can switch
// wholesale to PlanetMark today, and Sun/Moon quietly become real art the moment their files land.
const UNICODE: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

export default function PlanetMark({
  planet,
  size = 14,
  strokeWidth: _strokeWidth = 1.9,
  color,
  style,
}: {
  planet: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const file = FILES[planet];
  if (!file) {
    // No art for this planet (Sun/Moon today) → its Unicode glyph, tinted, sized to the box.
    const u = UNICODE[planet];
    if (!u) return null;
    return (
      <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, width: size, height: size, alignItems: "center", justifyContent: "center", fontSize: size * 0.92, lineHeight: 1, color: color ?? PLANET_MARK_INK[planet] ?? "currentColor", ...style }}>{u}</span>
    );
  }
  const mask = `url("/planet-marks/${file}.png")`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        backgroundColor: color ?? PLANET_MARK_INK[planet] ?? "currentColor",
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}
