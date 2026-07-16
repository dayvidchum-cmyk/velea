import type { CSSProperties } from "react";

/**
 * CrownMark — DAVID'S OWN CROWN (his image, 2026-07-16: "Can this be the crown, but a
 * flat gold fill? Big like Lakshmi star when solitary.") — five points, each tipped
 * with a bindu ball, deep swooping valleys, wide base. FLAT fill, no gradient.
 * THE SADHAKA MARK (achievement days) everywhere; solitary on a tile it renders big,
 * like the octagram.
 */
export default function CrownMark({
  size = 15,
  color = "#D4AF37",
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={color}
      strokeWidth="0.6"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
    >
      {/* The body (v2 — "It's squished"): taller slender spikes, shallower valleys,
          base inset from the shoulders, matching his image's proportions. */}
      <path d="M5.6 18.8 L3.6 11 Q6.3 14.2 8.6 8.8 Q10.6 13 12 7.2 Q13.4 13 15.4 8.8 Q17.7 14.2 20.4 11 L18.4 18.8 Z" />
      {/* The bindu balls, floating just off every point. */}
      <circle cx="3.5" cy="9.4" r="1.45" />
      <circle cx="8.6" cy="7.1" r="1.45" />
      <circle cx="12" cy="5.4" r="1.55" />
      <circle cx="15.4" cy="7.1" r="1.45" />
      <circle cx="20.5" cy="9.4" r="1.45" />
    </svg>
  );
}
