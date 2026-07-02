import { useEffect, useState } from "react";

/**
 * BrandSplash — the post-login moment. Tells the Velea / លវេលា story once, then
 * fades into the app. Auto-dismisses (~3.2s) or taps to skip.
 */
export default function BrandSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Everything is revealed by ~2s; hold well past that so it can be read, then fade.
    const fade = setTimeout(() => setLeaving(true), 5600);
    const done = setTimeout(onDone, 6500);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);

  const rise = (delay: number) => ({
    animation: `velea-rise 0.75s cubic-bezier(0.2,0.8,0.2,1) both`,
    animationDelay: `${delay}s`,
  });

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer",
        background: "var(--background)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: leaving ? 0 : 1,
        transition: "opacity 620ms ease",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <img
        src="/velea-logo.png"
        alt=""
        width={92}
        height={92}
        style={{ objectFit: "contain", animation: "velea-logo-in 0.9s cubic-bezier(0.2,0.8,0.2,1) both", marginBottom: "1.5rem" }}
      />
      <div style={{ ...rise(0.35), fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif", fontSize: "clamp(2.4rem, 12vw, 3.4rem)", fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1, color: "var(--foreground)" }}>
        Velea
      </div>
      <div lang="km" style={{ ...rise(0.7), fontFamily: "'Hanuman', serif", fontSize: "clamp(2rem, 10vw, 2.8rem)", lineHeight: 1.3, color: "#C9A84C", marginTop: "0.6rem" }}>
        លវេលា
      </div>
      <div style={{ ...rise(1.15), marginTop: "1.6rem", maxWidth: "22rem" }}>
        <p style={{ margin: 0, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
          <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none" }}>លវេលា</span> — time
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A84C" }}>
          <span lang="km" style={{ fontFamily: "'Hanuman', serif", textTransform: "none" }}>លវេលាល្អ</span> — the auspicious, golden moment
        </p>
      </div>
    </div>
  );
}
