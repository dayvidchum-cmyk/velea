import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Celestial signal — shell-ocean artwork for lunar events + planet stations. PRIVATE
 * (endpoint returns null off the allowlist). On Today it's a slim entry showing tonight's
 * real phase; tapping opens a full-screen gallery you move through, each image fading in
 * "as if the sky transmitted the signal." Its own room — Today stays clean.
 */

const SIGNALS = [
  { name: "New Moon", image: "new-moon.jpg", note: "Plant the seed. Begin in the dark." },
  { name: "Waxing Crescent", image: "waxing-crescent.jpg", note: "Intention takes form." },
  { name: "First Quarter", image: "first-quarter.jpg", note: "Push through the first resistance." },
  { name: "Waxing Gibbous", image: "waxing-gibbous.jpg", note: "Refine — almost there." },
  { name: "Full Moon", image: "full-moon.jpg", note: "Illumination. Release what's revealed." },
  { name: "Waning Gibbous", image: "waning-gibbous.jpg", note: "Gratitude. Share the harvest." },
  { name: "Last Quarter", image: "last-quarter.jpg", note: "Let go. Clear the ground." },
  { name: "Waning Crescent", image: "waning-crescent.jpg", note: "Rest. Surrender before the new." },
  { name: "Lunar Eclipse", image: "lunar-eclipse.jpg", note: "A sudden ending — the tide turns." },
  { name: "Solar Eclipse", image: "solar-eclipse.jpg", note: "A reset. A new door, unseen." },
  { name: "Mercury Retrograde", image: "mercury-rx.jpg", note: "Review, revisit, revise — the past washes back to be read again." },
];

function Gallery({ startIdx, onClose }: { startIdx: number; onClose: () => void }) {
  const [cur, setCur] = useState(startIdx);
  const s = SIGNALS[cur];
  const go = (d: number) => setCur((cur + d + SIGNALS.length) % SIGNALS.length);
  const isTonight = cur === startIdx;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#05060a" }}>
      <img key={s.image} src={`/celestial/${s.image}`} alt={s.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.66), transparent 40%, rgba(0,0,0,0.35))" }} />

      <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 0.9rem)", right: "1rem", zIndex: 3, width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={18} />
      </button>
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 1.05rem)", left: "1.1rem", pointerEvents: "none" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>◦ signal {isTonight ? "· tonight" : "· preview"}</span>
      </div>

      <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 1.6rem)", left: 0, right: 0, padding: "0 1.4rem", pointerEvents: "none" }}>
        <p style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>{s.name}</p>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{s.note}</p>
      </div>

      <button onClick={() => go(-1)} aria-label="Previous" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "38%", background: "none", border: "none", cursor: "pointer" }} />
      <button onClick={() => go(1)} aria-label="Next" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "38%", background: "none", border: "none", cursor: "pointer" }} />

      <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 0.6rem)", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, pointerEvents: "none" }}>
        {SIGNALS.map((_, i) => (
          <span key={i} style={{ width: i === cur ? 16 : 5, height: 5, borderRadius: 999, background: i === cur ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

export default function CelestialCard() {
  const { data } = trpc.celestial.today.useQuery(undefined, { staleTime: 1000 * 60 * 60 });
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const todayIdx = Math.max(0, SIGNALS.findIndex((s) => s.image === (data as any).image));
  const tonight = SIGNALS[todayIdx];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.85rem", textAlign: "left", cursor: "pointer", marginBottom: "1.5rem", padding: "0.6rem 0.7rem", borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-card)" }}
      >
        <img src={`/celestial/${tonight.image}`} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Tonight's sky · private</span>
          <span style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)" }}>{(data as any).name}</span>
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--brand-gold)", whiteSpace: "nowrap", flexShrink: 0 }}>open ›</span>
      </button>
      {open && <Gallery startIdx={todayIdx} onClose={() => setOpen(false)} />}
    </>
  );
}
