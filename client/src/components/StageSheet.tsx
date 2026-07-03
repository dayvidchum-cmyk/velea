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

type Hero = { image: string; kicker: string; title: string; chips: string[]; note: string; primary?: boolean };

const SCRIM = "linear-gradient(to top, rgba(5,6,10,0.95) 0%, rgba(5,6,10,0.82) 30%, rgba(5,6,10,0.45) 62%, rgba(5,6,10,0.12) 100%)";

/**
 * StageSheet — "The Stage": each sky image IS the card. A full-image scrim carries all the
 * reading (phase · meaning · today's call · slow-planet weather) over the illustration; the
 * only thing in the window below is the retrograde chips. Swipe across the moon + any planet
 * mid retrograde-cycle. X (top-right) closes.
 */
export default function StageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accent = useDayModeColor();
  const { data: stage } = trpc.sky.stage.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const { data: sky } = trpc.celestial.today.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: open });
  const [activeIdx, setActiveIdx] = useState(0);
  const [skyIdx, setSkyIdx] = useState(-1);
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
    heroes.push({ image: d.image, kicker: `The Stage · ${moonWhere}`, title: d.name, chips: [cycle], note: moonNote, primary: true });
    for (const s of (d.stations ?? [])) {
      heroes.push({
        image: s.image,
        kicker: `The Stage · ${s.planet}${s.house ? ` · your ${ORD[s.house]} house` : s.sign ? ` in ${s.sign}` : ""}`,
        title: s.title, chips: [phaseLabel(s.phase)], note: s.note,
      });
    }
  }
  const idx = Math.min(activeIdx, Math.max(0, heroes.length - 1));

  const closeBtn = (onTap: () => void) => (
    <button onClick={onTap} aria-label="Close" style={{ position: "absolute", top: "0.9rem", right: "0.9rem", zIndex: 5, width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.45)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <X size={17} />
    </button>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "var(--dialog-overlay)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col"
          style={{ maxHeight: "min(92vh, 840px)", background: "var(--color-card)", borderRadius: "var(--radius-hero)", overflow: "hidden", border: "1px solid var(--color-border)", position: "relative" }}>

          {closeBtn(onClose)}

          <div className="overflow-y-auto">
            {/* Each image IS the card — full-image scrim carries all the reading */}
            {heroes.length > 0 && (
              <>
                <div className="no-scrollbar" style={{ position: "relative", display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", alignItems: "stretch" }}
                  onScroll={(e) => setActiveIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
                  {heroes.map((h, i) => (
                    <button key={i} onClick={() => setSkyIdx(i)}
                      style={{ flex: "0 0 100%", scrollSnapAlign: "center", position: "relative", minHeight: "min(70vh, 600px)", border: "none", padding: 0, cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", textAlign: "left", background: "#05060a" }}>
                      <img src={`/celestial/${h.image}`} alt={h.title}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 22%", transformOrigin: "center", animation: "velea-kenburns 18s ease-in-out infinite alternate" }} />
                      <div style={{ position: "absolute", inset: 0, background: SCRIM }} />
                      <div style={{ position: "relative", padding: "1.5rem 1.4rem 1.5rem", animation: "velea-rise 0.7s ease both" }}>
                        <p style={{ margin: 0, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.82)" }}>{h.kicker}</p>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "1.85rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.65)", lineHeight: 1.05 }}>{h.title}</p>
                        <p style={{ margin: "0.4rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.94)", lineHeight: 1.45, textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}>{h.note}</p>

                        {/* Day-level reading rides on the primary (moon) image */}
                        {h.primary && stage?.verdict && (
                          <div style={{ marginTop: "1rem", paddingTop: "0.9rem", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
                            <p style={{ margin: 0, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Today's call</p>
                            <p style={{ margin: "0.1rem 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#fff", textShadow: "0 1px 10px rgba(0,0,0,0.8)", lineHeight: 1.15 }}>{stage.verdict.call}</p>
                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "rgba(255,255,255,0.86)", lineHeight: 1.45, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>{stage.verdict.summary}</p>
                            {stage.verdict.forPersonal && stage.verdict.forCollective && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.6rem" }}>
                                {[["High-stakes / personal", stage.verdict.forPersonal], ["Launches / sends", stage.verdict.forCollective]].map(([label, body]) => (
                                  <div key={label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 9, padding: "0.45rem 0.6rem" }}>
                                    <p style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", margin: 0 }}>{label}</p>
                                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.94)", lineHeight: 1.4, margin: "0.1rem 0 0" }}>{body}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!stage.verdict.hasCheckIn && (
                              <p style={{ fontSize: "0.78rem", color: "#fff", margin: "0.55rem 0 0", fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>Tap "Current State" (top right) to check in for your full call.</p>
                            )}
                          </div>
                        )}
                        {h.primary && stage && stage.signals.length > 0 && (
                          <div style={{ marginTop: "1rem", paddingTop: "0.9rem", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
                            <p style={{ margin: "0 0 0.4rem", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Slow-planet weather</p>
                            {stage.signals.map((sig, k) => (
                              <p key={k} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.4, margin: k ? "0.35rem 0 0" : 0, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                                <span style={{ color: sig.direction === "favor" ? "#7ED0A0" : "#E6B96A", fontWeight: 700 }}>·</span> {sig.summary}
                              </p>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.9rem", alignItems: "center" }}>
                          {h.chips.map((c, j) => <span key={j} style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", padding: "0.15rem 0.55rem", borderRadius: 999 }}>{c}</span>)}
                          {i === 0 && heroes.length > 1 && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>swipe →</span>}
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>tap for full art ↗</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {heroes.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "9px 0 3px" }}>
                    {heroes.map((_, i) => <span key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 999, background: i === idx ? accent : "var(--color-border)", transition: "width 0.2s" }} />)}
                  </div>
                )}
              </>
            )}

            {/* The only thing left in the window: the retrograde planet chips */}
            {stage && stage.retrogrades.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", padding: "0.9rem 1.25rem 1.15rem" }}>
                <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Retrograde:</span>
                {(stage.retrogradesDetail ?? stage.retrogrades.map((p) => ({ planet: p, house: null as number | null, sign: null }))).map((r) => {
                  const pc = RX_PLANET_COLOR[r.planet] ?? "var(--foreground)";
                  return (
                  <GlossaryLink key={r.planet} term="Retrograde (Vakri)" underline={false} className="text-xs font-semibold"
                    style={{ display: "inline-block", color: pc, background: `color-mix(in srgb, ${pc} 14%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${pc} 42%, transparent)`, borderRadius: 999, padding: "0.2rem 0.6rem" }}
                    extra={r.house ? <>Right now: <strong>{r.planet}</strong> is retrograde in your <strong>{RX_ORD[r.house]} house</strong>{RX_HOUSE_THEME[r.house] ? ` — ${RX_HOUSE_THEME[r.house]}` : ""}. The review lands here.</> : undefined}
                  >{r.planet} ℞</GlossaryLink>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen immersive art for the tapped hero */}
      {skyIdx >= 0 && heroes[skyIdx] && (
        <div className="app-shell-height" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, background: "#05060a" }}>
          <img src={`/celestial/${heroes[skyIdx].image}`} alt={heroes[skyIdx].title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 44%)" }} />
          {closeBtn(() => setSkyIdx(-1))}
          <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 1.6rem)", left: 0, right: 0, padding: "0 1.4rem", pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>{heroes[skyIdx].kicker}</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "1.9rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{heroes[skyIdx].title}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{heroes[skyIdx].note}</p>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
