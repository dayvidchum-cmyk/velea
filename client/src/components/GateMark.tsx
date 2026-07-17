import type { CSSProperties } from "react";

/**
 * GateMark — THE TIME GATE, worn as the lock (David 2026-07-16: the bare padlock "doesn't
 * even look special… I want it to feel special, not gleaming like a crown special, but
 * special. more weight."). Not a padlock: a temple gate — two pillars under a double
 * lintel, and the gold bindu waiting inside. Every culture that made time a being gave
 * it a gate; what Velea guards sits behind this one. Form G from David's board (tall,
 * narrow, the slot of light) crowned with THE KALA CREST — the kirtimukha of the Khmer
 * gates reduced to a peaked brow and one eye: Time's face over the threshold.
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
      {/* THE KALA CREST (David: "some simple something up top to represent the kala
          figure") — the kirtimukha reduced to its essence: a peaked brow and one eye,
          Time's face watching over the threshold, as on the Khmer gates. */}
      <path d="M9.7 3.4 Q12 1.2 14.3 3.4" />
      <circle cx="12" cy="3.1" r="0.95" fill={color} stroke="none" />
      {/* the gate — G from the board: tall and narrow, the slot of light */}
      <path d="M5.2 6.2 H18.8" />
      <path d="M6.4 9.2 H17.6" />
      <path d="M8.2 9.2 V21" />
      <path d="M15.8 9.2 V21" />
      {/* the bindu — what waits inside, risen */}
      <circle cx="12" cy="13.8" r="1.9" fill={color} stroke="none" />
    </svg>
  );
}
