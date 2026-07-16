import type { CSSProperties } from "react";

/**
 * SummitMark — an equilateral peak with the sun's circle rising BEHIND it (David's spec,
 * blessed 2026-07-16: "the summit refined is great"). THE ACHIEVEMENT MARK: Sadhaka days
 * wear it (replaces the ♛). The sun is a true arc, not an overlapped circle — the peak
 * genuinely occludes it, so the mark works on any background.
 */
export default function SummitMark({
  size = 14,
  strokeWidth = 1.7,
  color = "#D4AF37",
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
      strokeLinecap="round"
      style={{ display: "inline-block", ...style }}
    >
      {/* The sun — only the arc that shows above/around the peak (circle c(12,8.2) r4.6,
          clipped where the triangle's edges cross it). */}
      <path d="M 9.01 11.7 A 4.6 4.6 0 1 1 14.99 11.7" />
      {/* The equilateral peak. */}
      <path d="M12 6.5 L19.2 19 L4.8 19 Z" />
    </svg>
  );
}
