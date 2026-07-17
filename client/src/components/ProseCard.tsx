import type { ReactNode } from "react";

/**
 * ProseCard — THE BELOVED READING REGISTER (David 2026-07-16, pointing at the Your Year
 * card: "why aren't newer reading outputs styled like this? it's so nice. the pale
 * background and darker words is clinical."). Reading prose glows in white on a gradient
 * of the surface's own color — never ink-on-pale for a reading's main voice.
 */
export default function ProseCard({ color, children, question }: { color: string; children: ReactNode; question?: string | null }) {
  const grad = `linear-gradient(160deg, color-mix(in srgb, ${color} 70%, #F2E2AC) 0%, ${color} 52%, color-mix(in srgb, ${color} 72%, #3A2A16) 100%)`;
  return (
    <div style={{ borderRadius: 14, background: grad, padding: "1.1rem 1.2rem", overflow: "hidden" }}>
      <div style={{ color: "rgba(255,255,255,0.96)", fontSize: "0.92rem", lineHeight: 1.68, whiteSpace: "pre-wrap" }}>{children}</div>
      {question ? <p style={{ color: "rgba(255,255,255,0.88)", fontStyle: "italic", fontSize: "0.86rem", lineHeight: 1.55, margin: "0.65rem 0 0" }}>{question}</p> : null}
    </div>
  );
}
