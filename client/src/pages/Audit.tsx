import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Dateline, { type DatelineProps } from "@/components/Dateline";

/**
 * /audit — the VISUAL AUDIT harness. Instead of checking a data-driven graphic across hundreds of
 * users, render it here against a MATRIX of representative states, all on one screen. Any broken
 * state (clipped, orphaned bullet, unreadable color) jumps out at a glance. Because these tiles
 * render the SAME <Dateline> the header uses, this grid IS what users see — no drift.
 *
 * Admin-only. Start with the dateline; extend the grid to the calendar coin and other surfaces.
 */

// Representative day-mode colors (the app's families). Exact values matter less than exercising
// every color × content combination for legibility + layout.
const MODES: Array<{ label: string; color: string }> = [
  { label: "ACTION", color: "#2E7D4F" },
  { label: "BUILD", color: "#B8912F" },
  { label: "RESTORE", color: "#3C8A7A" },
  { label: "SELECTIVE", color: "#5C6B7A" },
  { label: "RESTRAINT", color: "#8B3A62" },
  { label: "ENERGIZE", color: "#6BA644" },
  { label: "PEAK", color: "#C41E3A" },
];
const ACT_GREEN = "#6BA644";
const ACT_TEAL = "#3C8A7A";

// Each case is a labeled Dateline prop-set. The label says what edge it exercises.
const CASES: Array<{ note: string; props: DatelineProps }> = [
  { note: "Full · short hora", props: { dateLabel: "FRI, 07-17-2026", time: "11:33 PM", modeColor: "#5C6B7A", modeLabel: "SELECTIVE", activity: "ENERGIZE", activityColor: ACT_GREEN, horaLord: "MOON" } },
  { note: "LONG time-lord (wrap test) · JUPITER", props: { dateLabel: "FRI, 07-17-2026", time: "11:33 PM", modeColor: "#8B3A62", modeLabel: "RESTRAINT", activity: "CONSOLIDATE", activityColor: ACT_TEAL, horaLord: "JUPITER" } },
  { note: "Max segments + long names (stress wrap)", props: { dateLabel: "WED, 12-31-2026", time: "11:33 PM", modeColor: "#2E7D4F", modeLabel: "SELECTIVE", activity: "ENERGIZE", activityColor: ACT_GREEN, horaLord: "SATURN" } },
  { note: "Mode only (no activity)", props: { dateLabel: "FRI, 07-17-2026", time: "9:04 AM", modeColor: "#B8912F", modeLabel: "BUILD" } },
  { note: "Minimal (date + time only)", props: { dateLabel: "FRI, 07-17-2026", time: "9:04 AM", modeColor: "#3C8A7A" } },
  { note: "Activity, no hora", props: { dateLabel: "SUN, 07-19-2026", time: "6:12 PM", modeColor: "#2E7D4F", modeLabel: "ACTION", activity: "ENERGIZE", activityColor: ACT_GREEN } },
  { note: "Caution day (red mode)", props: { dateLabel: "SAT, 07-04-2026", time: "3:33 AM", modeColor: "#C41E3A", modeLabel: "RESTRAINT", activity: "RESTORE", activityColor: ACT_TEAL, horaLord: "MARS" } },
];

function Tile({ note, children }: { note: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>{note}</span>
      {/* Phone content width so wraps match what a real device shows. */}
      <div style={{ width: "min(100%, 340px)", padding: "0.7rem 0.9rem", borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }}>
        {children}
      </div>
    </div>
  );
}

export default function Audit() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted-foreground)", fontSize: "0.85rem" }}>
        Admin only.
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-background)", padding: "1.5rem 1rem 6rem" }}>
      <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", fontSize: "0.78rem", cursor: "pointer", marginBottom: "0.75rem" }}>← Back</button>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "1.8rem", color: "var(--heading-ink)", margin: 0 }}>Visual Audit</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0.4rem 0 1.5rem", maxWidth: "40rem" }}>
          The same components users see, rendered across a matrix of data states. Scan for anything clipped,
          orphaned, or unreadable — no accounts to check.
        </p>

        <h2 style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--heading-ink)", margin: "0 0 0.9rem" }}>The Dateline</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.4rem", marginBottom: "2.5rem" }}>
          {CASES.map((c, i) => (
            <Tile key={`c-${i}`} note={c.note}><Dateline {...c.props} /></Tile>
          ))}
        </div>

        <h2 style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--heading-ink)", margin: "0 0 0.9rem" }}>Dateline · every mode color</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.4rem" }}>
          {MODES.map((m) => (
            <Tile key={m.label} note={m.label}>
              <Dateline dateLabel="FRI, 07-17-2026" time="11:33 PM" modeColor={m.color} modeLabel={m.label} activity="ENERGIZE" activityColor={ACT_GREEN} horaLord="MOON" />
            </Tile>
          ))}
        </div>
      </div>
    </div>
  );
}
