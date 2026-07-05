import type { CSSProperties } from "react";

/**
 * VeleaLorMark — the "Veleal'or" mark: វេលាល្អ, the auspicious, golden moment. A bullseye /
 * sun-glyph (ring + centered dot). The circle-and-dot IS the classical Sun glyph ☉ — sun = gold
 * = l'or — and reads as a target: hitting the exact right moment. Sibling to VeleaMark; use it
 * for golden hours / crown moments. Same size/color API as VeleaMark for drop-in use.
 */
export default function VeleaLorMark({
  size = 22,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "inline-block", ...style }}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  );
}
