import GateMark from "@/components/GateMark";
import NotifyMeButton from "@/components/NotifyMeButton";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A public-but-locked feature tile. Fills the same grid cell as the real card (Time Master / Hora)
 * so everyone SEES the feature, but with a lock icon instead of live data. Tapping opens a popup
 * that explains what the feature is — the future home for upsell copy. `entitled` is decided by the
 * backend (masterMode.access); this component only renders the locked presentation.
 *
 * `price` is the tier this feature sits in (PREMIUM_PRICING.nearSight / .allAccess / .pickADate),
 * passed by the caller — the card itself is tier-agnostic. `null` (tier not announced) hides the
 * number and shows only the notify-me capture, never an invented price.
 */
export default function LockedFeatureCard({
  title,
  teaser,
  detail,
  price = null,
}: {
  title: string;
  teaser: string;
  detail: string;
  price?: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`${title} — locked. Tap to learn more.`}
        style={{
          borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)",
          padding: "0.85rem 0.9rem", display: "flex", flexDirection: "column", height: "100%",
          width: "100%", textAlign: "left", cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <GateMark size={17} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground)", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ marginLeft: "auto", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", borderRadius: 999, padding: "0.1rem 0.4rem" }}>Locked</span>
        </span>
        <p style={{ margin: "0.55rem 0 0", fontSize: "0.72rem", color: "var(--color-muted-foreground)", lineHeight: 1.35, opacity: 0.85 }}>{teaser}</p>
        <span style={{ marginTop: "auto", paddingTop: "0.5rem", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.04em", color: "var(--brand-gold, #C9A84C)" }}>Tap to learn more →</span>
      </button>

      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem", background: "rgba(4,6,10,0.62)", backdropFilter: "blur(3px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ position: "relative", width: "100%", maxWidth: 360, borderRadius: 20, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.5rem 1.4rem 1.4rem", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
          >
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ position: "absolute", top: "0.8rem", right: "0.8rem", width: 30, height: 30, borderRadius: 999, border: "none", background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "color-mix(in srgb, var(--brand-gold, #C9A84C) 16%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.9rem" }}>
              <GateMark size={24} style={{ color: "var(--brand-gold, #C9A84C)" }} />
            </div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700, color: "var(--foreground)" }}>{title}</h3>
            <p style={{ margin: "0.6rem 0 0", fontSize: "0.9rem", lineHeight: 1.55, color: "var(--color-muted-foreground)" }}>{detail}</p>
            {price && (
              <p style={{ margin: "0.7rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--foreground)" }}>
                {price} when it opens.
              </p>
            )}
            <div style={{ marginTop: "1.2rem" }}>
              <NotifyMeButton feature={title} />
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ marginTop: "0.55rem", width: "100%", padding: "0.7rem", borderRadius: 12, border: "1px solid var(--color-border)", background: "color-mix(in srgb, var(--foreground) 6%, transparent)", color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
            >
              Got it
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
