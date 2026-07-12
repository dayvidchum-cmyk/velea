import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * WhyNowSheet — the on-demand "why is this task aligned for today" pop-up. Keeps the aligned
 * cards clean (the crux: stay on the task); the reasoning is pulled here only when wanted.
 * Shows the ranking's pressure-layer bubbles + the transparent reasons.
 */
export default function WhyNowSheet({ task, modeColor, onClose }: { task: any; modeColor: string; onClose: () => void }) {
  if (!task) return null;
  const bubbles = ((task.layerBubbles ?? []) as string[]);
  const reasons = ((task.reasons ?? []) as string[]);
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "var(--dialog-overlay)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md"
        style={{ background: "var(--color-card)", borderRadius: 20, border: "1px solid var(--color-border)", padding: "1.4rem", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: modeColor, margin: 0 }}>Why now?</p>
            <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-foreground)", margin: "0.2rem 0 0", lineHeight: 1.25 }}>{task.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--color-secondary)", color: "var(--color-foreground)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={17} />
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--color-muted-foreground)", margin: "0.8rem 0 0", lineHeight: 1.5 }}>
          Why this rose to the top of today's list:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.85rem" }}>
          {bubbles.map((b) => (
            <span key={b} style={{ fontSize: "0.84rem", fontWeight: 700, padding: "0.35rem 0.75rem", borderRadius: 999, background: modeColor, color: "#FDFDFD", letterSpacing: "0.02em" }}>{b}</span>
          ))}
          {reasons.map((r) => (
            <span key={r} style={{ fontSize: "0.84rem", fontWeight: 600, padding: "0.35rem 0.75rem", borderRadius: 999, background: `color-mix(in srgb, ${modeColor} 12%, var(--color-card))`, color: modeColor, border: `1px solid color-mix(in srgb, ${modeColor} 30%, transparent)` }}>{r}</span>
          ))}
          {bubbles.length === 0 && reasons.length === 0 && (
            <span style={{ color: "var(--color-muted-foreground)", fontSize: "0.9rem" }}>Aligned with today's mode.</span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
