import type { CSSProperties } from "react";

/**
 * OctagramMark — an eight-pointed star (two overlapping squares, the Star of Lakshmi). The knot/
 * node mark: used for knot days on the calendar and as the Horoscope icon. Eight resonates through
 * the system (ashta — the Ashtakavarga's eight reference points) and the star is a classic auspicious
 * sign, fitting an apex day. Outline by default; pass `fill` for a solid mark.
 */
export default function OctagramMark({
  size = 22,
  strokeWidth = 1.8,
  color = "currentColor",
  fill = "none",
  style,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Fill color for a SOLID star (default "none" = outline). */
  fill?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      style={{ display: "inline-block", ...style }}
    >
      {/* Two equal squares, one rotated 45° — their union is the eight-pointed star. */}
      <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      <path d="M5 5 H19 V19 H5 Z" />
    </svg>
  );
}
