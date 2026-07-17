import type { CSSProperties } from "react";

/**
 * GateMark — THE TIME GATE, worn as the lock (David 2026-07-16: the bare padlock "doesn't
 * even look special… I want it to feel special, not gleaming like a crown special, but
 * special. more weight."). Not a padlock: a temple gate — two pillars under a double
 * lintel, and the gold bindu waiting inside. Every culture that made time a being gave
 * it a gate; what Velea guards sits behind this one. Line-drawn kin of the mark family.
 */
export default function GateMark({
  size = 14,
  color = "var(--brand-gold)",
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
      fill="none"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
    >
      {/* the crowning lintel, wider than the frame — the sheltering beam */}
      <path d="M3.4 6 H20.6" />
      {/* the second beam, resting on the pillars */}
      <path d="M5.6 9.4 H18.4" />
      {/* the pillars */}
      <path d="M7.6 9.4 V20.4" />
      <path d="M16.4 9.4 V20.4" />
      {/* the bindu — what waits inside the gate */}
      <circle cx="12" cy="15.6" r="2" fill={color} stroke="none" />
    </svg>
  );
}
