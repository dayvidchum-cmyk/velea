import type { CSSProperties } from "react";

/**
 * VeleaMark — an even-weight icon interpretation of the Velea logo (a ring + the
 * line), for small UI sizes where the detailed tapered logo reads too thin. Strokes
 * in currentColor by default so it inherits like a lucide icon and matches their
 * weight. (The full detailed logo art is used at hero/splash sizes.)
 */
export default function VeleaMark({
  size = 22,
  color = "currentColor",
  strokeWidth = 2,
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <circle cx="11" cy="13" r="7.5" />
      <path d="M20.8 3.2 L13.4 10.6" />
    </svg>
  );
}
