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
      {/* The body: center point tallest, mids beside it, outers low; swooping valleys. */}
      <path d="M5 19.4 L3.8 10 Q6.4 15 8.7 8.4 Q10.7 14.2 12 6.8 Q13.3 14.2 15.3 8.4 Q17.6 15 20.2 10 L19 19.4 Z" />
      {/* The bindu balls on every point. */}
      <circle cx="3.8" cy="8.4" r="1.25" />
      <circle cx="8.7" cy="6.9" r="1.25" />
      <circle cx="12" cy="5" r="1.35" />
      <circle cx="15.3" cy="6.9" r="1.25" />
      <circle cx="20.2" cy="8.4" r="1.25" />
    </svg>
  );
}
