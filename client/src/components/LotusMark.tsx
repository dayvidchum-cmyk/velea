import type { CSSProperties } from "react";

/**
 * LotusMark — David's own seven-petal lotus (his Canva drawing, 2026-07-16), redrawn as
 * line-art with the solid bindu below the base. THE PROSPERITY MARK: Sampat days wear it
 * (replaces the $, David's pick — "thicker lines and green", weight II blessed).
 * Petals fan from one origin: center bud, two upper, two mid, two near-flat bottom.
 */
export default function LotusMark({
  size = 14,
  strokeWidth = 2.4,
  color = "#77A96B",
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
      viewBox="-1 0 26 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ display: "inline-block", ...style }}
    >
      <path d="M 12 18 Q 14.7 11.4 12 4.8 Q 9.3 11.4 12 18 Z" />
      <path d="M 12 18 Q 11.46 11.21 6.28 6.77 Q 6.82 13.57 12 18 Z" />
      <path d="M 12 18 Q 17.18 13.57 17.72 6.77 Q 12.54 11.21 12 18 Z" />
      <path d="M 12 18 Q 8.42 12.57 2.05 11.29 Q 5.63 16.72 12 18 Z" />
      <path d="M 12 18 Q 18.37 16.72 21.95 11.29 Q 15.58 12.57 12 18 Z" />
      <path d="M 12 18 Q 6.66 15.23 0.86 16.83 Q 6.2 19.6 12 18 Z" />
      <path d="M 12 18 Q 17.8 19.6 23.14 16.83 Q 17.34 15.23 12 18 Z" />
      {/* The bindu below the base — the drop the flower rests over. */}
      <circle cx="12" cy="21.2" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}
