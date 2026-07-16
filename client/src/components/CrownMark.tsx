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
      {/* The body (v3 — TRACED from David's image, pixel-measured, not drawn from
          memory): the four side balls sit LEVEL, only the center towers; valleys dip
          to 44%; the base spans 80% of the width; whole crown ~1.62 wide-to-tall. */}
      <path d="M4 18.2 L2.6 10.4 Q5.3 12.9 8 10.4 Q10.2 12.4 12 7.7 Q13.8 12.4 16 10.4 Q18.7 12.9 21.4 10.4 L20 18.2 Z" />
      {/* The bindu balls — four level, one crowning the center. */}
      <circle cx="2.6" cy="9.3" r="1.3" />
      <circle cx="8" cy="9.3" r="1.3" />
      <circle cx="12" cy="6.5" r="1.45" />
      <circle cx="16" cy="9.3" r="1.3" />
      <circle cx="21.4" cy="9.3" r="1.3" />
    </svg>
  );
}
