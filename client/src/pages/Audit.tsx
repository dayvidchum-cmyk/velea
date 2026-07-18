import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Dateline, { type DatelineProps } from "@/components/Dateline";
import CalendarCoin, { type CalendarCoinProps } from "@/components/CalendarCoin";

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

// Calendar-coin cases — colors are representative (Planner computes the real palette); the point
// is to exercise every LAYOUT combination the one-template coin can produce.
const TEAL = "#3C8A7A", GOLD = "#B8912F", GREY = "#7E7E7E", MERC = "#3FA8A0";
const COIN_CASES: Array<{ note: string; props: CalendarCoinProps }> = [
  { note: "Plain day", props: { day: 8, numberColor: GOLD, restingBg: "transparent", border: "1.5px solid transparent", accent: GOLD } },
  { note: "TODAY (dark square)", props: { day: 17, isToday: true, filled: true, hasMode: true, pulse: "today", numberColor: "#FBF7ED", restingBg: `color-mix(in srgb, ${TEAL} 62%, var(--parchment))`, border: "1.5px solid transparent", accent: TEAL } },
  { note: "Crown (octagram)", props: { day: 12, isCrown: true, pulse: "lakshmi", numberColor: "#3A2E12", restingBg: "color-mix(in srgb, #FFD429 62%, var(--parchment))", border: "1.5px solid #D4AF37", accent: "#D4AF37" } },
  { note: "Eclipse (disc)", props: { day: 9, isEclipse: true, numberColor: GOLD, restingBg: "transparent", border: "1.5px solid transparent", accent: GOLD } },
  { note: "Caution (red)", props: { day: 4, filled: true, hasMode: true, numberColor: "#fff", restingBg: "#C41E3A", border: "2px solid transparent", accent: "#C41E3A" } },
  // FIRST LAW (v699): station coins are MODE-colored; the planet speaks only via the rail glyph.
  { note: "Station · Mercury", props: { day: 20, stations: ["Mercury"], numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL } },
  { note: "Station + window", props: { day: 22, stations: ["Saturn"], windows: ["Mercury"], numberColor: GOLD, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${GOLD} 62%, transparent)`, accent: GOLD } },
  { note: "Moon · full", props: { day: 6, moonPhase: "full", numberColor: GREY, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${GREY} 62%, transparent)`, accent: GREY } },
  { note: "€ prosperity", props: { day: 7, prosperity: true, numberColor: "#2E9B54", restingBg: "transparent", border: "1.5px solid color-mix(in srgb, #2E9B54 62%, transparent)", accent: "#2E9B54" } },
  { note: "Achievement ♛", props: { day: 30, achievement: true, numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL } },
  // 12/14 lesson: the matrix jumped 2 → 4 marks; the 3-mark state was the hole where the
  // glyph-overlap bug lived. EVERY mark count now has a tile (2/3/4/5).
  { note: "3 marks (the 12/14 case)", props: { day: 14, stations: ["Mercury"], windows: ["Saturn"], moonPhase: "full", numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL } },
  { note: "4 marks (overflow test)", props: { day: 24, stations: ["Saturn"], windows: ["Mercury", "Venus"], moonPhase: "full", numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL } },
  { note: "5 marks (worst case)", props: { day: 21, stations: ["Saturn"], windows: ["Mercury", "Venus"], moonPhase: "full", prosperity: true, numberColor: GOLD, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${GOLD} 62%, transparent)`, accent: GOLD } },
  { note: "Crown + station (both)", props: { day: 19, isCrown: true, pulse: "lakshmi", stations: ["Mercury"], achievement: true, numberColor: "#3A2E12", restingBg: "color-mix(in srgb, #FFD429 62%, var(--parchment))", border: "1.5px solid #D4AF37", accent: "#D4AF37" } },
  // 11/16 shape: crown + ODD mark count — the cluster must center as one unit, never lopside right.
  { note: "Crown + 3 marks (11/16)", props: { day: 16, achievement: true, stations: ["Mercury"], windows: ["Saturn"], moonPhase: "full", numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL } },
  { note: "Crown + 1 mark (odd, small)", props: { day: 2, achievement: true, prosperity: true, numberColor: GOLD, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${GOLD} 62%, transparent)`, accent: GOLD } },
  // Shadow threshold: the day a shadow opens/closes, the glyph rides the rail   // "quietly signal its descent into mania." Paired with its 2-bindi building strength.
  { note: "Shadow enter (threshold glyph)", props: { day: 11, numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL, shadows: ["Mercury"], bindis: [{ planet: "Mercury", strength: 2 }] } },
  // THE BINDI LADDER — dot count = rx strength (5 station · 4 window · 3 rx · 2 pre- · 1 post-shadow).
  { note: "Bindis · 8 (station)", props: { day: 3, stations: ["Mercury"], numberColor: TEAL, restingBg: "transparent", border: `1.5px solid color-mix(in srgb, ${TEAL} 62%, transparent)`, accent: TEAL, bindis: [{ planet: "Mercury", strength: 5 }] } },
  { note: "Bindis · 4 (mid-rx)", props: { day: 10, numberColor: GOLD, restingBg: "transparent", border: "1.5px solid transparent", accent: GOLD, bindis: [{ planet: "Mercury", strength: 3 }] } },
  { note: "Bindis · 1 (clearing)", props: { day: 28, numberColor: GREY, restingBg: "transparent", border: "1.5px solid transparent", accent: GREY, bindis: [{ planet: "Mercury", strength: 1 }] } },
  { note: "Oct/Nov · 3 tracks", props: { day: 25, numberColor: TEAL, restingBg: "transparent", border: "1.5px solid transparent", accent: TEAL, bindis: [{ planet: "Mercury", strength: 4 }, { planet: "Jupiter", strength: 3 }, { planet: "Saturn", strength: 2 }] } },
  { note: "3 tracks + today", props: { day: 26, isToday: true, filled: true, hasMode: true, numberColor: "#FBF7ED", restingBg: `color-mix(in srgb, ${TEAL} 62%, var(--parchment))`, border: "1.5px solid transparent", accent: TEAL, bindis: [{ planet: "Venus", strength: 5 }, { planet: "Mars", strength: 3 }, { planet: "Saturn", strength: 1 }] } },
  { note: "Track continuity (middle empty)", props: { day: 27, numberColor: GOLD, restingBg: "transparent", border: "1.5px solid transparent", accent: GOLD, bindis: [{ planet: "Mercury", strength: 2 }, null, { planet: "Saturn", strength: 3 }] } },
];

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

        <h2 style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--heading-ink)", margin: "2.5rem 0 0.3rem" }}>The Calendar Coin</h2>
        <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", margin: "0 0 1rem" }}>Every mark combination the one-template coin can produce — watch the "4+ marks" tile for rail overflow into neighbors.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))", gap: "0.9rem" }}>
          {COIN_CASES.map((c, i) => (
            <div key={`coin-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ paddingTop: 22, paddingBottom: 24, width: "100%", display: "flex", justifyContent: "center", borderRadius: 12, background: "var(--parchment)", border: "1px solid var(--color-border)" }}>
                <CalendarCoin {...c.props} />
              </div>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--color-muted-foreground)", textAlign: "center" }}>{c.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
