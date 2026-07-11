import type { CSSProperties } from "react";

/**
 * DiamondMark — a narrow, vertically-elongated diamond. The horoscope nav icon: a diamond is
 * another sign for a NODE / knot / point — the single day you pin down on the calendar. Drawn as
 * a stroked outline (currentColor) so it inherits the nav's active/muted color, matching the other
 * line icons. Same size/strokeWidth/style API as VeleaMark for drop-in use.
 */
export default function DiamondMark({
  size = 22,
  strokeWidth = 1.8,
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
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      style={{ display: "inline-block", ...style }}
    >
      {/* narrow diamond: width ~9, height ~20 — taller than it is wide */}
      <path d="M12 2 L16.5 12 L12 22 L7.5 12 Z" />
    </svg>
  );
}
