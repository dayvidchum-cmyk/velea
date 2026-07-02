import { useState } from "react";
import { X, Share } from "lucide-react";

/**
 * Persistent (until installed) prompt to add Velea to the Home Screen — shown on the
 * Today page. Guides the user to install FROM this page, so the app opens straight to
 * their day instead of glitching onto a login screen. Hidden once running standalone.
 */
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as any).standalone === true
  );
}
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function AddToHomeScreenNote() {
  // Session-only dismiss: reappears on next launch until actually installed.
  const [hidden, setHidden] = useState(false);
  if (hidden || isStandalone()) return null;
  const ios = isIOS();

  return (
    <div
      style={{
        position: "relative", borderRadius: 14, border: "1px solid var(--brand-gold)",
        background: "color-mix(in srgb, var(--brand-gold) 10%, var(--color-card))",
        padding: "0.85rem 1rem", marginBottom: "1rem",
      }}
    >
      <button
        onClick={() => setHidden(true)}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 2 }}
      >
        <X size={16} />
      </button>
      <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "var(--brand-gold)" }}>Add Velea to your Home Screen</p>
      <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.5, paddingRight: "1.1rem" }}>
        {ios ? (
          <>
            Tap <strong>Share</strong> <Share size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> in Safari, then{" "}
            <strong>“Add to Home Screen.”</strong> Do it from <strong>this page</strong> so it opens straight to your day.
          </>
        ) : (
          <>
            Open your browser menu and choose <strong>“Install app”</strong> / <strong>“Add to Home Screen.”</strong>{" "}
            Do it from <strong>this page</strong> so it opens straight to your day.
          </>
        )}
      </p>
      <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "var(--color-muted-foreground)", lineHeight: 1.45 }}>
        Why: it opens full-screen like a real app, loads faster, and stays signed in.
      </p>
    </div>
  );
}
