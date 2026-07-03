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

const phaseLabel = (phase: string) =>
  phase.startsWith("preshadow") ? "pre-shadow" : phase === "retrograde" ? "retrograde ℞" : phase === "direct-2" ? "stations direct" : "clears shadow";

type Hero = { image: string; kicker: string; title: string; chips: string[]; note: string };

/**
 * StageSheet — "The Stage": the whole sky for today. An image-forward hero (the full moon-phase
 * art, swipeable across any planet mid retrograde-cycle) with the reading overlaid ON the art,
 * then today's verdict, slow-planet weather, and retrogrades below.
 */
export default function StageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accent = useDayModeColor();
  const { data: stage } = trpc.sky.stage.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const { data: sky } = trpc.celestial.today.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const [activeIdx, setActiveIdx] = useState(0);
  const [skyIdx, setSkyIdx] = useState(-1); // -1 = closed; else index of the hero shown full-screen
  useDarkChromeWhile(skyIdx >= 0);
  if (!open) return null;

  const d = sky as any;
  const house: number | null = d?.moonHouse ?? null;
  const intent = d ? (PHASE_INTENT[d.name] ?? "") : "";
  const moonNote = d ? (house ? `${intent} — in your ${ORD[house]} house of ${HOUSE_THEME[house]}.` : `${intent}.`) : "";
  const moonWhere = d ? `Moon in ${d.moonSign}${house ? ` · your ${ORD[house]} house` : ""}` : "";
  const cycle = d ? (d.isEclipse ? "Eclipse today" : d.daysToNew <= d.daysToFull ? `${d.daysToNew}d to New Moon` : `${d.daysToFull}d to Full Moon`) : "";

  const heroes: Hero[] = [];
  if (d) {
    heroes.push({ image: d.image, kicker: `The Stage · ${moonWhere}`, title: d.name, chips: [cycle], note: moonNote });
    for (const s of (d.stations ?? [])) {
      heroes.push({
        image: s.image,
        kicker: `The Stage · ${s.planet}${s.house ? ` · your ${ORD[s.house]} house` : s.sign ? ` in ${s.sign}` : ""}`,
        title: s.title, chips: [phaseLabel(s.phase)], note: s.note,
      });
    }
  }
  const idx = Math.min(activeIdx, Math.max(0, heroes.length - 1));

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "var(--dialog-overlay)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col"
          style={{ maxHeight: "min(92vh, 820px)", background: "var(--color-card)", borderRadius: "var(--radius-hero)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
          <div className="overflow-y-auto">
            {/* Image-forward hero — the full art leads (moon visible). Swipe across stations; tap to go full-screen. */}
            {heroes.length > 0 && (
              <>
                <div className="no-scrollbar" style={{ position: "relative", display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
                  onScroll={(e) => setActiveIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
                  {heroes.map((h, i) => (
                    <button key={i} onClick={() => setSkyIdx(i)}
                      style={{ flex: "0 0 100%", scrollSnapAlign: "center", position: "relative", aspectRatio: "3 / 4", border: "none", padding: 0, cursor: "pointer", overflow: "hidden", display: "block", textAlign: "left", background: "#05060a" }}>
                      <img src={`/celestial/${h.image}`} alt={h.title}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", transformOrigin: "center", animation: "velea-kenburns 17s ease-in-out infinite alternate" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,6,10,0.95) 0%, rgba(5,6,10,0.55) 26%, rgba(5,6,10,0.05) 52%, transparent 66%)" }} />
                      <div style={{ position: "absolute", left: 20, right: 20, bottom: 20, animation: "velea-rise 0.7s ease both" }}>
                        <p style={{ margin: 0, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.82)" }}>{h.kicker}</p>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "1.85rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.65)", lineHeight: 1.05 }}>{h.title}</p>
                        <p style={{ margin: "0.4rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.45, textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>{h.note}</p>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem", alignItems: "center" }}>
                          {h.chips.map((c, j) => <span key={j} style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", padding: "0.15rem 0.55rem", borderRadius: 999 }}>{c}</span>)}
                          {i === 0 && heroes.length > 1 && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>swipe →</span>}
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>tap to expand ↗</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {/* Grab handle — the reachable dismiss affordance up top */}
                  <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 3 }}>
                    <div onClick={onClose} style={{ width: 42, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.55)", pointerEvents: "auto", cursor: "pointer" }} />
                  </div>
                  <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 12, right: 12, zIndex: 3, width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.42)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={17} />
                  </button>
                </div>
                {heroes.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "9px 0 3px" }}>
                    {heroes.map((_, i) => <span key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 999, background: i === idx ? accent : "var(--color-border)", transition: "width 0.2s" }} />)}
                  </div>
                )}
              </>
            )}

            {!stage ? (
              <p className="text-sm px-5 py-6" style={{ color: "var(--color-muted-foreground)" }}>Reading the sky…</p>
            ) : (
              <>
                {stage.verdict && (
                  <div style={{ padding: "1rem 1.25rem", background: `color-mix(in srgb, ${accent} 8%, var(--color-card))`, borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
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
                <div style={{ padding: "0.9rem 1.25rem 0.5rem" }}>
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
                        <GlossaryLink key={r.planet} term="Retrograde (Vakri)" underline={false} className="text-xs font-semibold"
                          style={{ display: "inline-block", color: pc, background: `color-mix(in srgb, ${pc} 14%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${pc} 42%, transparent)`, borderRadius: 999, padding: "0.15rem 0.55rem" }}
                          extra={r.house ? <>Right now: <strong>{r.planet}</strong> is retrograde in your <strong>{RX_ORD[r.house]} house</strong>{RX_HOUSE_THEME[r.house] ? ` — ${RX_HOUSE_THEME[r.house]}` : ""}. The review lands here.</> : undefined}
                        >{r.planet} ℞</GlossaryLink>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Reachable close — the corner X is a thumb-killer on a tall sheet */}
                <div style={{ padding: "0.4rem 1.25rem 1.15rem" }}>
                  <button onClick={onClose} style={{ width: "100%", padding: "0.7rem", borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-secondary)", color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen immersive art for the tapped hero */}
      {skyIdx >= 0 && heroes[skyIdx] && (
        <div className="app-shell-height" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, background: "#05060a" }}>
          <img src={`/celestial/${heroes[skyIdx].image}`} alt={heroes[skyIdx].title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 44%)" }} />
          <button onClick={() => setSkyIdx(-1)} aria-label="Close" style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 0.9rem)", right: "1rem", width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
          <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 1.6rem)", left: 0, right: 0, padding: "0 1.4rem", pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>{heroes[skyIdx].kicker}</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "1.9rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{heroes[skyIdx].title}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{heroes[skyIdx].note}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)" }}>{heroes[skyIdx].chips.join(" · ")}</p>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
