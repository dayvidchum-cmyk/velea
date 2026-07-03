import { useEffect, useState } from "react";

const GOLD = "#C9A84C";

/**
 * BrandSplash — the post-login moment. The gold logo rises, the Khmer វេលា morphs
 * into the English "Velea", the meaning is spelled out, and finally the night sky +
 * mountains settle in behind the words. Dark stage in both themes so the sky reads.
 * Auto-dismisses (~6.8s) or taps to skip.
 */
export default function BrandSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 6000);
    const done = setTimeout(onDone, 6800);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer",
        background: "#0a131e",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 640ms ease",
      }}
    >
      {/* Night sky + mountains — the finale, fading in behind the words. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/starry-night.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          animation: "velea-sky-in 1.8s ease 2.7s both",
        }}
      />
      {/* Soft vignette so the words stay legible over the stars. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center 42%, rgba(10,19,30,0.35) 0%, rgba(10,19,30,0.72) 100%)",
          animation: "velea-sky-in 1.8s ease 2.7s both",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "2rem", textAlign: "center",
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

        {/* Meaning — light on the dark night sky. */}
        <div
          style={{
            marginTop: "2rem", maxWidth: "28rem",
            animation: "velea-rise 0.75s cubic-bezier(0.2,0.8,0.2,1) 2.6s both",
          }}
        >
          <p style={{ margin: 0, fontSize: "clamp(1.05rem, 4.6vw, 1.3rem)", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.92)", lineHeight: 1.5 }}>
            <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none", fontSize: "1.4em" }}>វេលា</span>{" "}
            <span style={{ textTransform: "none", fontStyle: "italic", opacity: 0.8 }}>Ve-lea</span> — time
          </p>
          <p style={{ margin: "0.8rem 0 0", fontSize: "clamp(1.05rem, 4.6vw, 1.3rem)", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.92)", lineHeight: 1.5 }}>
            <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none", fontSize: "1.4em" }}>វេលាល្អ</span>{" "}
            <span style={{ textTransform: "none", fontStyle: "italic", opacity: 0.8 }}>velea l'or</span>
            <br />
            the auspicious, golden moment
          </p>
        </div>
      </div>
    </div>
  );
}
