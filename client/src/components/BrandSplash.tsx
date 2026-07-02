import { useEffect, useState } from "react";

const GOLD = "#C9A84C";

/**
 * BrandSplash — the post-login moment. The gold logo rises, the Khmer លវេលា morphs
 * into the English "Velea" (both gold), and the meaning is spelled out below in the
 * theme's foreground color. Auto-dismisses (~6.2s) or taps to skip.
 */
export default function BrandSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 5400);
    const done = setTimeout(onDone, 6200);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer",
        background: "var(--background)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: leaving ? 0 : 1,
        transition: "opacity 640ms ease",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <img
        src="/velea-logo.png"
        alt=""
        width={132}
        height={132}
        style={{ objectFit: "contain", animation: "velea-logo-in 0.9s cubic-bezier(0.2,0.8,0.2,1) both", marginBottom: "1.5rem" }}
      />

      {/* Title slot — Khmer and English stacked in the same cell; Khmer morphs to English. */}
      <div style={{ display: "grid", placeItems: "center", lineHeight: 1 }}>
        <span
          lang="km"
          style={{
            gridArea: "1 / 1",
            fontFamily: "'Hanuman', serif",
            fontSize: "clamp(2.2rem, 11vw, 3rem)",
            lineHeight: 1.3,
            color: GOLD,
            animation: "velea-rise 0.7s cubic-bezier(0.2,0.8,0.2,1) 0.4s both, velea-morph-out 0.8s ease 1.9s forwards",
          }}
        >
          លវេលា
        </span>
        <span
          style={{
            gridArea: "1 / 1",
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontSize: "clamp(2.4rem, 12vw, 3.4rem)",
            fontWeight: 700,
            letterSpacing: "0.01em",
            color: GOLD,
            animation: "velea-morph-in 0.8s cubic-bezier(0.2,0.8,0.2,1) 1.9s both",
          }}
        >
          Velea
        </span>
      </div>

      {/* Meaning — foreground color (black in light, white in dark). */}
      <div
        style={{
          marginTop: "1.8rem", maxWidth: "22rem",
          animation: "velea-rise 0.75s cubic-bezier(0.2,0.8,0.2,1) 2.6s both",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--foreground)" }}>
          <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none" }}>លវេលា</span> — time
        </p>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--foreground)" }}>
          <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none" }}>លវេលាល្អ</span>{" "}
          <span style={{ textTransform: "none", fontStyle: "italic", opacity: 0.75 }}>velea l'or</span> — the auspicious, golden moment
        </p>
      </div>
    </div>
  );
}
