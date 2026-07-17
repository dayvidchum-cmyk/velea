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
  // wear the sky-portrait's smoke and ember.
  Mercury: "#3FA8A0", Saturn: "#454A8C", Venus: "#CE5F6E", Mars: "#A8002C", Jupiter: "#A2850A",
  Rahu: "#4a4a58", Ketu: "#7a5a48",
};

const FILES: Record<string, string> = {
  Mercury: "mercury", Saturn: "saturn", Venus: "venus", Mars: "mars", Jupiter: "jupiter",
  Rahu: "rahu", Ketu: "ketu",
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
  if (!file) return null;
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
