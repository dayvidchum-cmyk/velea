import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { GlossaryLink } from "@/components/GlossaryPopover";

/**
 * StageSheet — "The Stage" as a pop-up, openable from the header on every page.
 * Today's verdict (universal x check-in) + the slow-planet weather + retrogrades.
 */
export default function StageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accent = useDayModeColor();
  const { data: stage } = trpc.sky.stage.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "var(--dialog-overlay)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex flex-col"
        style={{ maxHeight: "min(85vh, 640px)", background: "var(--color-card)", borderRadius: "var(--radius-hero)", overflow: "hidden", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.1em", color: accent }}>The Stage</span>
          <button onClick={onClose} className="p-1" aria-label="Close"><X size={18} style={{ color: "var(--color-muted-foreground)" }} /></button>
        </div>

        <div className="overflow-y-auto">
          {!stage ? (
            <p className="text-sm px-5 py-6" style={{ color: "var(--color-muted-foreground)" }}>Reading the sky…</p>
          ) : (
            <>
              {stage.verdict && (
                <div style={{ padding: "1rem 1.25rem", background: `color-mix(in srgb, ${accent} 8%, var(--color-card))`, borderBottom: "1px solid var(--color-border)" }}>
                  <p className="text-xs font-bold uppercase" style={{ letterSpacing: "0.12em", color: "var(--color-muted-foreground)", margin: 0 }}>Today's call</p>
                  <p style={{ fontSize: "1.15rem", fontWeight: 800, color: accent, margin: "0.15rem 0 0", lineHeight: 1.2 }}>{stage.verdict.call}</p>
                  <p className="text-xs" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0.35rem 0 0" }}>{stage.verdict.summary}</p>
                  {stage.verdict.forPersonal && stage.verdict.forCollective && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
                      {[["High-stakes / personal", stage.verdict.forPersonal], ["Launches / sends", stage.verdict.forCollective]].map(([label, body]) => (
                        <div key={label} style={{ background: "var(--color-secondary)", borderRadius: 10, padding: "0.5rem 0.7rem" }}>
                          <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, margin: 0 }}>{label}</p>
                          <p className="text-xs" style={{ color: "var(--foreground)", lineHeight: 1.4, margin: "0.15rem 0 0" }}>{body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!stage.verdict.hasCheckIn && (
                    <p className="text-xs" style={{ color: accent, margin: "0.6rem 0 0", fontWeight: 600 }}>Tap "Current State" (top right) to check in for your full call.</p>
                  )}
                </div>
              )}
              <div style={{ padding: "0.9rem 1.25rem 1.25rem" }}>
                <p className="text-xs font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", margin: "0 0 0.55rem" }}>The stage</p>
                {stage.signals.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)", margin: 0 }}>Clear skies — no notable slow-planet weather right now.</p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {stage.signals.map((sig, i) => {
                      const c = sig.direction === "favor" ? "#3E8E5A" : "#C0862E";
                      return (
                        <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: `color-mix(in srgb, ${c} 8%, var(--color-card))`, borderRadius: 10, padding: "0.55rem 0.7rem", borderLeft: `3px solid ${c}` }}>
                          <span className="text-sm" style={{ color: "var(--foreground)", lineHeight: 1.45 }}>{sig.summary}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {stage.retrogrades.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", marginTop: "0.7rem" }}>
                    <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Retrograde:</span>
                    {stage.retrogrades.map((p) => (
                      <GlossaryLink key={p} term="Retrograde (Vakri)" underline={false} className="text-xs font-semibold" style={{ display: "inline-block", color: "var(--foreground)", background: "var(--color-secondary)", borderRadius: 999, padding: "0.15rem 0.55rem" }}>{p} ℞</GlossaryLink>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
