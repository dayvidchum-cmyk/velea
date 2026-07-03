import { MapPin, CalendarCheck, Compass } from "lucide-react";

/**
 * First-run welcome — replaces the auto-forced tour. One calm, LARGE, high-contrast card that
 * (1) greets by name, (2) has the user confirm their birth data (catching the wrong-date error
 * a disoriented/low-vision user makes), (3) drives them to set their current location and says
 * WHY it matters, and (4) OFFERS the tour instead of forcing it. Built big for magnified screens.
 */
export default function FirstRunWelcome({
  name, birthLine, locationSet, locationLabel, onFixBirth, onSetLocation, onTakeTour, onExplore,
}: {
  name: string;
  birthLine: string | null;      // "February 3, 1982 · 8:39 PM · West Islip"
  locationSet: boolean;
  locationLabel: string | null;  // current location city, if set
  onFixBirth: () => void;
  onSetLocation: () => void;
  onTakeTour: () => void;
  onExplore: () => void;
}) {
  const btnBase: React.CSSProperties = {
    width: "100%", minHeight: 54, borderRadius: 14, fontSize: "1.05rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer",
  };
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-md my-auto"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 24, padding: "1.9rem 1.6rem", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.9rem", fontWeight: 800, color: "var(--color-foreground)", margin: 0, lineHeight: 1.1 }}>
          Welcome{name ? `, ${name}` : ""}.
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--color-muted-foreground)", lineHeight: 1.55, margin: "0.7rem 0 0" }}>
          Velea reads the sky and your chart to tell you what to do, when, and why. Two things make it yours — let's make sure they're right.
        </p>

        {/* 1 — confirm birth data */}
        <div style={{ marginTop: "1.5rem", padding: "1.1rem 1.15rem", borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CalendarCheck size={18} style={{ color: "var(--color-primary)" }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Your birth details</span>
          </div>
          <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.35, margin: "0.55rem 0 0" }}>
            {birthLine ?? "Not set yet"}
          </p>
          <p style={{ fontSize: "0.95rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0.35rem 0 0" }}>
            Your whole chart rests on this. If the date or time is even a little off, the reading will be too.
          </p>
          <button onClick={onFixBirth} style={{ marginTop: "0.7rem", fontSize: "1rem", fontWeight: 700, color: "var(--color-primary)", background: "none", border: "none", padding: "0.35rem 0", cursor: "pointer" }}>
            {birthLine ? "Not exactly right? Fix it →" : "Add your birth details →"}
          </button>
        </div>

        {/* 2 — set current location */}
        <div style={{ marginTop: "0.9rem", padding: "1.1rem 1.15rem", borderRadius: 16, border: `1px solid ${locationSet ? "var(--color-border)" : "color-mix(in srgb, var(--color-primary) 45%, transparent)"}`, background: "var(--color-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={18} style={{ color: "var(--color-primary)" }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Where you are now</span>
          </div>
          <p style={{ fontSize: "0.98rem", color: "var(--color-foreground)", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
            This is <strong>separate from where you were born</strong>. It's what tunes today's timing to you — without it, the day's read is off.
          </p>
          <button onClick={onSetLocation} style={{ ...btnBase, marginTop: "0.85rem", minHeight: 50, fontSize: "1rem",
            background: locationSet ? "transparent" : "var(--color-primary)", color: locationSet ? "var(--color-primary)" : "var(--color-primary-foreground)",
            border: `1.5px solid var(--color-primary)` }}>
            <MapPin size={17} /> {locationSet ? `Current: ${locationLabel ?? "set"} — change it` : "Set my current location"}
          </button>
        </div>

        {/* 3 — offer the tour (not forced) */}
        <p style={{ fontSize: "1rem", color: "var(--color-foreground)", textAlign: "center", margin: "1.6rem 0 0.85rem", fontWeight: 600 }}>
          Want me to show you around, or explore on your own?
        </p>
        <button onClick={onTakeTour} style={{ ...btnBase, background: "var(--color-primary)", color: "var(--color-primary-foreground)", border: "none" }}>
          <Compass size={18} /> Show me around
        </button>
        <button onClick={onExplore} style={{ ...btnBase, marginTop: "0.6rem", background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }}>
          I'll explore on my own
        </button>
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", textAlign: "center", margin: "0.85rem 0 0" }}>
          You can start the tour anytime from Settings.
        </p>
      </div>
    </div>
  );
}
