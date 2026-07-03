import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Celestial signal — the shell-ocean-sky artwork for each lunar event. PRIVATE (endpoint
 * returns null off the allowlist). Opens on tonight's real phase; tap left/right to move
 * through the whole set, each fading in "as if the sky transmitted the signal."
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
];

export default function CelestialCard() {
  const { data } = trpc.celestial.today.useQuery(undefined, { staleTime: 1000 * 60 * 60 });
  const [idx, setIdx] = useState<number | null>(null);
  if (!data) return null;

  const todayIdx = Math.max(0, SIGNALS.findIndex((s) => s.image === (data as any).image));
  const cur = idx ?? todayIdx;
  const s = SIGNALS[cur];
  const isTonight = cur === todayIdx;
  const go = (d: number) => setIdx((cur + d + SIGNALS.length) % SIGNALS.length);

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: "1.5rem", aspectRatio: "3 / 4", maxHeight: 540, background: "#0a0a12" }}>
      <img key={s.image} src={`/celestial/${s.image}`} alt={s.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "velea-signal-in 0.9s ease both" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.62), transparent 42%, rgba(0,0,0,0.28))" }} />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "0.9rem 1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>◦ signal {isTonight ? "· tonight" : "· preview"}</span>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-gold)", opacity: 0.85 }}>private</span>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem 1.25rem 1.5rem", pointerEvents: "none" }}>
        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#fff", fontFamily: "'Playfair Display', Georgia, serif", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>{s.name}</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "rgba(255,255,255,0.88)", fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{s.note}</p>
      </div>

      <button onClick={() => go(-1)} aria-label="Previous signal" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "34%", background: "none", border: "none", cursor: "pointer" }} />
      <button onClick={() => go(1)} aria-label="Next signal" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "34%", background: "none", border: "none", cursor: "pointer" }} />

      <div style={{ position: "absolute", bottom: "0.5rem", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, pointerEvents: "none" }}>
        {SIGNALS.map((_, i) => (
          <span key={i} style={{ width: i === cur ? 14 : 5, height: 5, borderRadius: 999, background: i === cur ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }} />
        ))}
      </div>
    </div>
  );
}
