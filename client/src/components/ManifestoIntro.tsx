import { useState } from "react";

/**
 * ManifestoIntro — the first-time "what is this" gate, before the brand splash. David's Moon
 * manifesto, paced as a few elegant beats (one thought per screen) so a new/disoriented user
 * doesn't hit a wall of text, landing on the explicit thesis: the moving sky ⊗ the birth
 * chart's lens on it ⊗ the user's inner state → which task belongs to this moment, and why.
 * Shown once. The full manifesto lives in About.
 */
const BEATS: { lines: string[] }[] = [
  { lines: [
    "The Moon doesn't tell you what to do.",
    "It tells you what *kind* of moment this is.",
  ] },
  { lines: [
    "The Sun is who you are — the changeless *I am*, too bright to face head-on.",
    "But that's eternity. And a person has to live on a Tuesday.",
  ] },
  { lines: [
    "So the soul borrows the Sun's light and steps close — close enough to pull the tides, close enough to pull a body that's mostly water.",
    "That's the Moon: the *I am* turned gentle enough to look at, moving at the speed life actually changes.",
  ] },
];

// Render *emphasis* as italic.
function Line({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return <>{parts.map((p, i) => p.startsWith("*") && p.endsWith("*")
    ? <em key={i} style={{ fontStyle: "italic", color: "#fff" }}>{p.slice(1, -1)}</em>
    : <span key={i}>{p}</span>)}</>;
}

export default function ManifestoIntro({ onBegin }: { onBegin: () => void }) {
  const [i, setI] = useState(0);
  const total = BEATS.length + 1; // + the thesis card
  const last = i === total - 1;

  return (
    <div className="fixed inset-0 z-[140] flex flex-col" style={{ background: "radial-gradient(120% 90% at 50% 12%, #12142a 0%, #06060c 62%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        {i < BEATS.length ? (
          <div key={i} style={{ animation: "velea-rise 0.7s ease both" }}>
            {BEATS[i].lines.map((ln, k) => (
              <p key={k} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: k === 0 ? "1.55rem" : "1.25rem", lineHeight: 1.5, color: "rgba(255,255,255,0.9)", margin: k ? "1.1rem 0 0" : 0, fontWeight: k === 0 ? 700 : 400 }}>
                <Line text={ln} />
              </p>
            ))}
          </div>
        ) : (
          <div key="thesis" style={{ animation: "velea-rise 0.7s ease both" }}>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.35rem", fontWeight: 700, color: "#fff", lineHeight: 1.35, margin: 0 }}>
              Velea reads three things at once —
            </p>
            <p style={{ fontSize: "1.12rem", lineHeight: 1.65, color: "rgba(255,255,255,0.85)", margin: "1rem 0 0" }}>
              <strong style={{ color: "#fff" }}>The sky</strong> as it moves right now. <strong style={{ color: "#fff" }}>Your birth chart</strong> — the lens that bends that sky into <em style={{ fontStyle: "italic", color: "#fff" }}>your</em> meaning. And <strong style={{ color: "#fff" }}>how you actually are</strong> today.
            </p>
            <p style={{ fontSize: "1.12rem", lineHeight: 1.65, color: "rgba(255,255,255,0.85)", margin: "1rem 0 0" }}>
              Where those three meet is data. Velea uses it to tell you which of your tasks belongs to this moment — and why.
            </p>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: "1.5rem 0 0", letterSpacing: "0.02em" }}>
              Not prediction. Timing.
            </p>
          </div>
        )}
      </div>

      {/* dots + advance */}
      <div className="px-7" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 2rem)", maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: "1.4rem" }}>
          {Array.from({ length: total }, (_, k) => (
            <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k === i ? "#fff" : "rgba(255,255,255,0.28)", transition: "width 0.25s" }} />
          ))}
        </div>
        <button
          onClick={() => (last ? onBegin() : setI(i + 1))}
          style={{ width: "100%", minHeight: 56, borderRadius: 16, border: last ? "none" : "1px solid rgba(255,255,255,0.28)", background: last ? "#fff" : "transparent", color: last ? "#0a0a12" : "#fff", fontSize: "1.08rem", fontWeight: 700, cursor: "pointer" }}
        >
          {last ? "Begin" : "Continue"}
        </button>
        {!last && (
          <button onClick={onBegin} style={{ width: "100%", marginTop: "0.7rem", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", cursor: "pointer", padding: "0.4rem" }}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
