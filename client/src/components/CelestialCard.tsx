import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";

/**
 * Tonight's Sky — the CURRENT moon phase (or eclipse) only, with the shell-ocean artwork,
 * where the Moon is in your chart (personalized house), where you are in the cycle (days
 * to the next New/Full), and any live station (Mercury Rx). Tap → full-screen. Public.
 */

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

export default function CelestialCard() {
  const { data } = trpc.celestial.today.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const [open, setOpen] = useState(false);
  useDarkChromeWhile(open); // keep the iOS chrome dark under the full-screen view
  if (!data) return null;
  const d = data as any;

  const house: number | null = d.moonHouse ?? null;
  const intent = PHASE_INTENT[d.name] ?? "";
  const note = house ? `${intent} — in your ${ORD[house]} house of ${HOUSE_THEME[house]}.` : `${intent}.`;
  const moonWhere = `Moon in ${d.moonSign}${house ? ` · your ${ORD[house]} house` : ""}`;
  const cycle = d.isEclipse ? "Eclipse today" : d.daysToNew <= d.daysToFull ? `${d.daysToNew}d to New Moon` : `${d.daysToFull}d to Full Moon`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", display: "block", textAlign: "left", cursor: "pointer", marginBottom: "1.5rem", padding: "0.8rem 0.9rem", borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <img src={`/celestial/${d.image}`} alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Tonight's sky</div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)" }}>{d.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>{moonWhere}</div>
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--brand-gold)", flexShrink: 0 }}>open ›</span>
        </div>
        <div style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "var(--foreground)", lineHeight: 1.5 }}>{note}</div>
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--brand-gold)", background: "color-mix(in srgb, var(--brand-gold) 14%, transparent)", padding: "0.15rem 0.55rem", borderRadius: 999 }}>{cycle}</span>
          {d.mercuryRetro && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#C0553E", background: "color-mix(in srgb, #C0553E 14%, transparent)", padding: "0.15rem 0.55rem", borderRadius: 999 }}>Mercury retrograde ℞</span>}
        </div>
      </button>

      {open && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#05060a" }}>
          <img src={`/celestial/${d.image}`} alt={d.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.66), transparent 42%)" }} />
          <button onClick={() => setOpen(false)} aria-label="Close" style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 0.9rem)", right: "1rem", width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
          <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 1.6rem)", left: 0, right: 0, padding: "0 1.4rem", pointerEvents: "none" }}>
            <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>Tonight · {moonWhere}</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "1.9rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{d.name}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{note}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)" }}>{cycle}{d.mercuryRetro ? " · Mercury retrograde" : ""}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
