import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { GlossaryLink } from "@/components/GlossaryPopover";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";

const RX_ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const RX_PLANET_COLOR: Record<string, string> = {
  Sun: "#E0912F", Moon: "#9AA7C7", Mars: "#D0553E", Mercury: "#3E9E6E",
  Jupiter: "#D9A441", Venus: "#D97FA8", Saturn: "#5E7CB0", Rahu: "#8C7AAE", Ketu: "#B0784E",
};
const RX_HOUSE_THEME: Record<number, string> = {
  1: "self & body", 2: "voice & values", 3: "skill & courage", 4: "home & roots",
  5: "creativity & heart", 6: "work & service", 7: "partnership", 8: "depth & shared",
  9: "belief & teachers", 10: "vocation & standing", 11: "community & gains", 12: "retreat & release",
};

// Moon-phase copy (folded in from the old Tonight's Sky card).
const PHASE_INTENT: Record<string, string> = {
  "New Moon": "Plant intentions in the dark",
  "Waxing Crescent": "Take the first step",
  "First Quarter": "Push through the resistance",
  "Waxing Gibbous": "Refine — almost there",
  "Full Moon": "Illuminate and release",
  "Waning Gibbous": "Share the harvest, give thanks",
  "Last Quarter": "Let go, clear the ground",
  "Waning Crescent": "Rest, surrender before the new",
  "Lunar Eclipse": "A sudden ending — the tide turns",
  "Solar Eclipse": "A hidden reset — a new door",
};
const HOUSE_THEME: Record<number, string> = {
  1: "self & body", 2: "money & voice", 3: "skill & courage", 4: "home & roots",
  5: "creativity & heart", 6: "work & health", 7: "partnership", 8: "depth & shared resources",
  9: "belief & travel", 10: "career & standing", 11: "community & gains", 12: "rest & release",
};
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

/**
 * StageSheet — "The Stage": the whole sky for today in one place, openable from the header.
 * The moon phase (folded in from Tonight's Sky) leads as a hero, then today's verdict
 * (universal × check-in), the slow-planet weather, and retrogrades.
 */
export default function StageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accent = useDayModeColor();
  const { data: stage } = trpc.sky.stage.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const { data: sky } = trpc.celestial.today.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const [skyOpen, setSkyOpen] = useState(false);
  useDarkChromeWhile(skyOpen);
  if (!open) return null;

  const d = sky as any;
  const house: number | null = d?.moonHouse ?? null;
  const intent = d ? (PHASE_INTENT[d.name] ?? "") : "";
  const note = d ? (house ? `${intent} — in your ${ORD[house]} house of ${HOUSE_THEME[house]}.` : `${intent}.`) : "";
  const moonWhere = d ? `Moon in ${d.moonSign}${house ? ` · your ${ORD[house]} house` : ""}` : "";
  const cycle = d ? (d.isEclipse ? "Eclipse today" : d.daysToNew <= d.daysToFull ? `${d.daysToNew}d to New Moon` : `${d.daysToFull}d to Full Moon`) : "";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "var(--dialog-overlay)" }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md flex flex-col"
          style={{ maxHeight: "min(85vh, 680px)", background: "var(--color-card)", borderRadius: "var(--radius-hero)", overflow: "hidden", border: "1px solid var(--color-border)" }}
        >
          {/* Close — floats over the hero / header */}
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 12, right: 12, zIndex: 2, width: 32, height: 32, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.42)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={17} />
          </button>

          <div className="overflow-y-auto">
            {/* Moon-phase hero — the sky leads. Tap to expand into the full-screen art. */}
            {d && (
              <button
                onClick={() => setSkyOpen(true)}
                style={{ position: "relative", width: "100%", height: 190, display: "block", textAlign: "left", cursor: "pointer", border: "none", padding: 0, overflow: "hidden" }}
              >
                <img src={`/celestial/${d.image}`} alt={d.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,6,10,0.92) 4%, rgba(5,6,10,0.35) 45%, rgba(5,6,10,0.15))" }} />
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 14 }}>
                  <p style={{ margin: 0, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>The Stage · {moonWhere}</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>{d.name}</p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.16)", padding: "0.12rem 0.5rem", borderRadius: 999 }}>{cycle}</span>
                    {d.mercuryRetro && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: "rgba(192,85,62,0.5)", padding: "0.12rem 0.5rem", borderRadius: 999 }}>Mercury retrograde ℞</span>}
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", padding: "0.12rem 0.2rem" }}>tap to expand ↗</span>
                  </div>
                </div>
              </button>
            )}

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
                {/* The moon phase's meaning for you */}
                {d && note && (
                  <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--color-border)" }}>
                    <p className="text-xs font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", margin: "0 0 0.35rem" }}>The moon</p>
                    <p className="text-sm" style={{ color: "var(--foreground)", lineHeight: 1.5, margin: 0 }}>{note}</p>
                  </div>
                )}
                <div style={{ padding: "0.9rem 1.25rem 1.25rem" }}>
                  <p className="text-xs font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", margin: "0 0 0.55rem" }}>Slow-planet weather</p>
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
                      {(stage.retrogradesDetail ?? stage.retrogrades.map((p) => ({ planet: p, house: null as number | null, sign: null }))).map((r) => {
                        const pc = RX_PLANET_COLOR[r.planet] ?? "var(--foreground)";
                        return (
                        <GlossaryLink
                          key={r.planet}
                          term="Retrograde (Vakri)"
                          underline={false}
                          className="text-xs font-semibold"
                          style={{ display: "inline-block", color: pc, background: `color-mix(in srgb, ${pc} 14%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${pc} 42%, transparent)`, borderRadius: 999, padding: "0.15rem 0.55rem" }}
                          extra={r.house ? <>Right now: <strong>{r.planet}</strong> is retrograde in your <strong>{RX_ORD[r.house]} house</strong>{RX_HOUSE_THEME[r.house] ? ` — ${RX_HOUSE_THEME[r.house]}` : ""}. The review lands here.</> : undefined}
                        >{r.planet} ℞</GlossaryLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen immersive moon art (from the hero tap) */}
      {skyOpen && d && (
        <div className="app-shell-height" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, background: "#05060a" }}>
          <img src={`/celestial/${d.image}`} alt={d.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.66), transparent 42%)" }} />
          <button onClick={() => setSkyOpen(false)} aria-label="Close" style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 0.9rem)", right: "1rem", width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
          <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 1.6rem)", left: 0, right: 0, padding: "0 1.4rem", pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>Tonight · {moonWhere}</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "1.9rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{d.name}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{note}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)" }}>{cycle}{d.mercuryRetro ? " · Mercury retrograde" : ""}</p>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
