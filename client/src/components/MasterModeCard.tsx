import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import VeleaLorMark from "./VeleaLorMark";
import LockedFeatureCard from "./LockedFeatureCard";

/**
 * Master Mode — Pancha Pakshi hourly timing. PRIVATE (endpoint returns null off the
 * allowlist). Collapsible: the header + current window always show; the full ten-period
 * timeline expands on tap, so it's a glance by default and depth on demand.
 */

// Aligned with the Day Mode palette (shared/types MODE_SOLID): Succeed→gold (Build, the
// auspicious peak), Action→green (Action), Restore→teal (Selective), Caution→rose (Restraint,
// a gentle hold — friction is data, not punishment). Energize→lime bridges gold into green.
const CAT_COLOR: Record<string, string> = {
  Succeed: "#D4AF37", Energize: "#86C440", Action: "#318a55", Restore: "#178F9E", Caution: "#B15F71",
};
const CAT_NOTE: Record<string, string> = {
  Succeed: "Most auspicious — act.",
  Energize: "Second-strongest — push.",
  Action: "Effort & work — be on the move.",
  Restore: "Avoid initiating — conserve, recover, maintenance only.",
  Caution: "Silence & letting go — not for action.",
};

// Golden hour: when the hora lord and the bird agree, the lord names WHAT it's good for —
// the natal houses it rules + occupies — colored by where it's transiting now.
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_SHORT: Record<number, string> = {
  1: "self & body", 2: "worth & money", 3: "skill & siblings", 4: "home & roots",
  5: "creativity & heart", 6: "work & service", 7: "partnership", 8: "depth & the hidden",
  9: "belief & travel", 10: "career & standing", 11: "gains & community", 12: "rest & release",
};
function favorsHouses(g: any): number[] {
  const set = new Set<number>(g.rulesHouses ?? []);
  if (g.occupiesHouse) set.add(g.occupiesHouse);
  return Array.from(set).sort((a, b) => a - b);
}
const glossHouses = (hs: number[]) => hs.map((h) => `${HOUSE_SHORT[h]} (${ORD[h]})`).join(", ");
function conditionLine(g: any): string {
  const bits: string[] = [];
  if (["exalted", "moolatrikona", "own", "friend"].includes(g.dignity)) bits.push(`${g.dignity} — strong`);
  if (g.retrograde) bits.push("retrograde — good for reworking, not new starts");
  if (!bits.length) bits.push(`in ${g.transitSign}`);
  return bits.join(" · ");
}

export default function MasterModeCard() {
  const [expanded, setExpanded] = useState(false);
  const { data: access } = trpc.masterMode.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  // Pancha Pakshi yamas run sunrise→sunrise, so before today's sunrise (the small hours) the
  // LIVE cycle is yesterday's night — today's data doesn't contain "now" yet, and the card would
  // go blank ("ran out of today's windows"). Fetch both days; use whichever actually brackets now.
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  const { data: todayData } = trpc.masterMode.today.useQuery({ date: dateStr }, { staleTime: 1000 * 60 * 10, enabled: entitled });
  const { data: yestData } = trpc.masterMode.today.useQuery({ date: yestStr }, { staleTime: 1000 * 60 * 10, enabled: entitled });

  // Public but locked: everyone sees the tile; non-entitled users get the lock + explainer popup.
  if (access && !entitled) {
    return (
      <LockedFeatureCard
        title="Time Master"
        teaser="Your golden hours — the times the sky most favors your action, hour by hour."
        detail="Time Master reads the Pañcapakṣi birds against the planetary hour to find your golden windows — the hours the sky most favors what you do, tuned to your own chart. It's a premium layer, not yet unlocked on your account."
      />
    );
  }

  const nowMs = Date.now();
  const bracketsNow = (d: any) => d?.periods?.some((p: any) => nowMs >= p.startMs && nowMs < p.endMs);
  const data = bracketsNow(todayData) ? todayData : bracketsNow(yestData) ? yestData : todayData;
  if (!data) return null;

  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const current = data.periods.find((p) => nowMs >= p.startMs && nowMs < p.endMs);
  const g = (data as any).goldenNow;

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "0.85rem 0.9rem", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header line — VeleaMark + name + golden badge (the golden hour keeps its hierarchy
          right here, at the top, beside the mark and name), then the expand chevron. */}
      <button onClick={() => setExpanded((e) => !e)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground)", whiteSpace: "nowrap" }}>Time Master</span>
        {g?.isGolden && (
          <VeleaLorMark size={15} color="#D4AF37" style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
        )}
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} style={{ color: "var(--color-muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--color-muted-foreground)" }} />}
        </span>
      </button>
      {/* Prefix with YOU: the bird is the viewer's own Pañcapakṣi bird (fixed from birth), not a
          rotating "current" bird — a bare bird name read as ambiguous. */}
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.56rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>You : {data.bird}</p>

      {expanded && current && (
        <div style={{ marginTop: "0.6rem" }}>
          <p style={{ margin: 0, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Now</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "1rem", fontWeight: 800, color: CAT_COLOR[current.category], lineHeight: 1.1 }}>{current.category}</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.66rem", color: "var(--color-muted-foreground)" }}>until {fmt(current.endMs)}</p>

          {g?.isGolden ? (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", fontWeight: 800, color: "#D4AF37", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "0.3rem" }}><VeleaLorMark size={14} color="#D4AF37" style={{ flexShrink: 0 }} /> Golden hour — {g.horaLord}</p>
          ) : g ? (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.66rem", fontWeight: 600, color: "#C9A84C", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {g.nextGoldenMs ? (
                <><VeleaLorMark size={12} color="#C9A84C" style={{ flexShrink: 0 }} /> Next · {fmt(g.nextGoldenMs)}–{fmt(g.nextGoldenEndMs)}</>
              ) : "No golden window left"}
            </p>
          ) : null}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "0.7rem" }}>
          {current && <p style={{ margin: "0 0 0.55rem", fontSize: "0.72rem", color: "var(--foreground)", lineHeight: 1.35 }}>{CAT_NOTE[current.category]}</p>}
          {g?.isGolden && (
            <div style={{ marginBottom: "0.6rem", paddingBottom: "0.6rem", borderBottom: "1px dashed color-mix(in srgb, #D4AF37 55%, transparent)" }}>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--foreground)" }}>Your bird and the hour agree.</p>
              {favorsHouses(g).length > 0 && (
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.74rem", color: "var(--foreground)" }}>Favors {glossHouses(favorsHouses(g))}.</p>
              )}
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>{g.horaLord} {conditionLine(g)}.</p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>Now transiting your {ORD[g.transitHouse]} — {HOUSE_SHORT[g.transitHouse]}.</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {data.periods.map((p, i) => {
              const isNow = current && p.startMs === current.startMs;
              const past = nowMs >= p.endMs;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.2rem", borderRadius: 8, background: isNow ? `color-mix(in srgb, ${CAT_COLOR[p.category]} 12%, transparent)` : "transparent", opacity: past && !isNow ? 0.45 : 1 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: CAT_COLOR[p.category], flexShrink: 0 }} />
                  <span style={{ fontSize: "0.66rem", color: "var(--color-muted-foreground)", width: "3.9rem", flexShrink: 0 }}>{fmt(p.startMs)}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: isNow ? 700 : 500, color: isNow ? CAT_COLOR[p.category] : "var(--foreground)" }}>{p.category}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
