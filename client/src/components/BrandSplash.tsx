import { useEffect, useState } from "react";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";

const GOLD = "#C9A84C";

/**
 * BrandSplash — the post-login moment. The gold logo rises, the Khmer វេលា morphs
 * into the English "Velea", the meaning is spelled out, and finally the night sky +
 * mountains settle in behind the words. Dark stage in both themes so the sky reads.
 * Auto-dismisses (~6.8s) or taps to skip.
 */
export default function BrandSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useDarkChromeWhile(true, "#0a131e"); // dark chrome so no white bar under the night sky

  // THE FOURTH BEAT (David 2026-07-18: "the shell on the water is the 4th beat with the
  // whole etymology") — gate → credentials → through → THE SHELL: the open shell holding
  // the light IS វេលាល្អ, the golden moment, settling in behind its own name. One day,
  // one night — same clock as the gate.
  const isDay = (() => { const h = new Date().getHours(); return h >= 6 && h < 18; })();
  const art = isDay ? "/shell-sunset.jpg" : "/shell-night.jpg";

  useEffect(() => {
    const img = new Image(); img.src = art; // warm the finale while the words play
    const fade = setTimeout(() => setLeaving(true), 6000);
    const done = setTimeout(onDone, 6800);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone, art]);

  return (
    <div
      onClick={onDone}
      className="app-shell-height"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, cursor: "pointer",
        // David's weld (2026-07-18): the fill above the art IS the art's own sky — sampled from
        // each shell's top edge (night #0d0c19, sunset #85839f), so image and fill meet seamlessly.
        background: isDay ? "#85839f" : "#0d0c19",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 640ms ease",
      }}
    >
      {/* The shell on the water — WELDED to the bottom of the screen, full width, shown whole
          (David: "the image is welded to the bottom and the color of the sky is filled in on
          top"). The sky fill above becomes the greeting's negative space. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${art})`,
          backgroundSize: "100% auto",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          animation: "velea-sky-in 1.8s ease 2.7s both",
        }}
      />
      {/* Legibility scrim — TOP-DOWN only (the words live in the sky now): darkens the greeting's
          ground, fades out before the shell so the art stays clean and unmuted. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: isDay
            ? "linear-gradient(180deg, rgba(10,19,30,0.55) 0%, rgba(10,19,30,0.32) 45%, transparent 72%)"
            : "linear-gradient(180deg, rgba(6,5,14,0.4) 0%, rgba(6,5,14,0.2) 45%, transparent 72%)",
          animation: "velea-sky-in 1.8s ease 2.7s both",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", height: "100%",
          // The greeting seats in the SKY — the negative space above the welded shell —
          // instead of centering over the art.
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
          padding: "clamp(3rem, 11dvh, 6.5rem) 2rem 2rem", textAlign: "center",
        }}
      >
        <img
          src="/velea-mark-gold.png"
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
              fontFamily: "'Moul', 'Hanuman', serif", // Moul = heavy Khmer display, mirrors the English logo weight
              fontSize: "clamp(1.9rem, 9.5vw, 2.7rem)",
              lineHeight: 1.35,
              color: GOLD,
              animation: "velea-rise 0.7s cubic-bezier(0.2,0.8,0.2,1) 0.4s both, velea-morph-out 0.8s ease 1.9s forwards",
            }}
          >
            វេលា
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

        {/* Meaning — the etymology (វេលា time + ល្អ good → the golden moment), light on the sky. */}
        <div
          style={{
            marginTop: "2rem", maxWidth: "30rem",
            display: "flex", flexDirection: "column", gap: "0.65rem",
            animation: "velea-rise 0.75s cubic-bezier(0.2,0.8,0.2,1) 2.6s both",
          }}
        >
          {[
            { km: "វេលា", roman: "ve-lea", gloss: "time" },
            { km: "ល្អ", roman: "l'or", gloss: "good" },
          ].map((row) => (
            <p key={row.roman} style={{ margin: 0, display: "flex", alignItems: "baseline", justifyContent: "center", flexWrap: "wrap", gap: "0.55rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.4, textShadow: "0 1px 10px rgba(4,10,18,0.75)" }}>
              <span lang="km" style={{ fontFamily: "'Hanuman', serif", fontSize: "1.55rem", color: GOLD }}>{row.km}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ fontStyle: "italic", opacity: 0.82, fontSize: "1.05rem" }}>{row.roman}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.09em", fontSize: "1.02rem" }}>{row.gloss}</span>
            </p>
          ))}
          {/* The compound — the payoff */}
          <div style={{ marginTop: "0.5rem", paddingTop: "0.9rem", borderTop: "1px solid rgba(201,168,76,0.3)" }}>
            <p style={{ margin: 0, display: "flex", alignItems: "baseline", justifyContent: "center", flexWrap: "wrap", gap: "0.55rem", color: "rgba(255,255,255,0.95)", textShadow: "0 1px 10px rgba(4,10,18,0.75)" }}>
              <span lang="km" style={{ fontFamily: "'Hanuman', serif", fontSize: "1.7rem", color: GOLD }}>វេលាល្អ</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ fontStyle: "italic", opacity: 0.85, fontSize: "1.1rem" }}>ve-lea l'or</span>
            </p>
            <p style={{ margin: "0.55rem 0 0", textTransform: "uppercase", letterSpacing: "0.13em", fontSize: "clamp(0.95rem, 4vw, 1.15rem)", color: GOLD, fontWeight: 600, lineHeight: 1.4 }}>
              the golden moment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
