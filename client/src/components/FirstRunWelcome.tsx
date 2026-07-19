import { useEffect } from "react";
import { MapPin, CalendarCheck, X } from "lucide-react";

/**
 * First-run welcome — replaces the auto-forced tour. Compact + high-contrast: greets, has the
 * user confirm birth data (catching the wrong-date error), drives current location + says WHY,
 * and OFFERS the tour. The two choices are PINNED in a non-scrolling footer so "explore on my
 * own" is always visible (never hidden below the fold). Built big for magnified screens.
 */
export default function FirstRunWelcome({
  name, birthLine, locationSet, locationLabel, onShown, onFixBirth, onSetLocation, onTakeTour, onExplore, onDismiss,
}: {
  name: string;
  birthLine: string | null;
  locationSet: boolean;
  locationLabel: string | null;
  onShown?: () => void;
  onFixBirth: () => void;
  onSetLocation: () => void;
  onTakeTour: () => void;
  onExplore: () => void;
  onDismiss: () => void;
}) {
  // Count this as one lifetime "show" the moment it mounts — independent of how the user
  // leaves (button, ×, backdrop, or just closing the app). That's what caps it at 2.
  useEffect(() => { onShown?.(); }, []);
  const btn: React.CSSProperties = {
    width: "100%", minHeight: 52, borderRadius: 14, fontSize: "1.05rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer",
  };
  return (
    <div onClick={onDismiss} data-velea-welcome className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col" style={{ position: "relative", maxHeight: "92vh", background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 22, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden" }}>

        {/* dismiss — close without a tour; marks the welcome seen so it never returns (tap the × or outside) */}
        <button onClick={onDismiss} aria-label="Dismiss" style={{ position: "absolute", top: 10, right: 10, zIndex: 3, width: 34, height: 34, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-secondary)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", cursor: "pointer" }}>
          <X size={18} />
        </button>

        {/* scrollable content */}
        <div className="overflow-y-auto" style={{ padding: "1.5rem 1.4rem 0.5rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-foreground)", margin: 0, lineHeight: 1.1 }}>
            Welcome{name ? `, ${name}` : ""}.
          </h1>
          <p style={{ fontSize: "0.98rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
            Two things make Velea yours — let's make sure they're right.
          </p>

          {/* 1 — confirm birth data */}
          <div style={{ marginTop: "1.1rem", padding: "0.9rem 1rem", borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <CalendarCheck size={16} style={{ color: "var(--color-primary)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Your birth details</span>
            </div>
            <p style={{ fontSize: "1.12rem", fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.3, margin: "0.4rem 0 0" }}>
              {birthLine ?? "Not set yet"}
            </p>
            <p style={{ fontSize: "0.88rem", color: "var(--color-muted-foreground)", lineHeight: 1.45, margin: "0.25rem 0 0" }}>
              If the date or time is even a little off, your whole chart is too.
            </p>
            <button onClick={onFixBirth} style={{ marginTop: "0.5rem", fontSize: "0.98rem", fontWeight: 700, color: "var(--color-primary)", background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer" }}>
              {birthLine ? "Not exactly right? Fix it →" : "Add your birth details →"}
            </button>
          </div>

          {/* 2 — set current location */}
          <div style={{ marginTop: "0.75rem", padding: "0.9rem 1rem", borderRadius: 14, border: `1px solid ${locationSet ? "var(--color-border)" : "color-mix(in srgb, var(--color-primary) 45%, transparent)"}`, background: "var(--color-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <MapPin size={16} style={{ color: "var(--color-primary)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Where you are now</span>
            </div>
            <p style={{ fontSize: "0.92rem", color: "var(--color-foreground)", lineHeight: 1.45, margin: "0.4rem 0 0" }}>
              <strong>Separate from your birthplace</strong> — it's what tunes today's timing to you.
            </p>
            <button onClick={onSetLocation} style={{ ...btn, marginTop: "0.65rem", minHeight: 46, fontSize: "0.98rem",
              background: locationSet ? "transparent" : "var(--color-primary)", color: locationSet ? "var(--color-primary)" : "var(--color-primary-foreground)",
              border: `1.5px solid var(--color-primary)` }}>
              <MapPin size={16} /> {locationSet ? `${locationLabel ?? "Set"} — change it` : "Set my current location"}
            </button>
          </div>
        </div>

        {/* pinned choices — always visible, no scrolling to find them */}
        <div style={{ padding: "0.9rem 1.4rem calc(env(safe-area-inset-bottom,0px) + 1rem)", borderTop: "1px solid var(--color-border)", background: "var(--color-card)" }}>
          <button onClick={onTakeTour} style={{ ...btn, background: "var(--color-primary)", color: "var(--color-primary-foreground)", border: "none" }}>
            Show me around
          </button>
          <button onClick={onExplore} style={{ ...btn, marginTop: "0.55rem", minHeight: 48, background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }}>
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
