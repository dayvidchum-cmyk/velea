import type { CSSProperties } from "react";

/**
 * DotMark — a single filled dot: the bindu. The knot/node mark, used for knot days and as the
 * Horoscope icon. A point in time you pin down — the quietest possible symbol. Same size/color API
 * as the other nav marks for drop-in use (strokeWidth accepted but ignored — a dot has no stroke).
 */
export default function DotMark({
  size = 22,
  color = "currentColor",
  style,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: "inline-block", ...style }}
    >
      <circle cx="12" cy="12" r="5.5" fill={color} />
    </svg>
  );
}
