import type { CSSProperties } from "react";

/**
 * LotusMark — THE PROSPERITY MARK (Sampat days; replaced the $). Final form per David
 * (2026-07-16): "Just do the teardrop shape with the bindu. Like a bud. It's simple.
 * It reads clearly. It's elegant." One closed lotus bud — a teardrop drawn in line —
 * with the solid bindu at its heart. Green #77A96B. (The seven-petal open lotus was
 * v558's first cut; it smushed below ~14px. The bud reads at every size.)
 */
export default function LotusMark({
  size = 14,
  strokeWidth = 2,
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
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ display: "inline-block", ...style }}
    >
      {/* The bud — a teardrop: round base, petal-tip apex. */}
      <path d="M12 20 C8.4 20 6 17.8 6 14.9 C6 12 8.4 9.8 12 4 C15.6 9.8 18 12 18 14.9 C18 17.8 15.6 20 12 20 Z" />
      {/* The bindu at its heart. */}
      <circle cx="12" cy="14.5" r="2" fill={color} stroke="none" />
    </svg>
  );
}
