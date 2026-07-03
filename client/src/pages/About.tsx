import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

/**
 * About / "Why the Moon" — the full manifesto, in David's words. Reachable anytime from
 * Settings; the paced first-run ManifestoIntro is the distilled gate, this is the whole thing.
 */
const REASONS: { label: string; body: string }[] = [
  { label: "The gate.", body: "Reflected sun-light. The soul made soft enough to look at directly." },
  { label: "The proximity.", body: "Closest body to us, strongest pull on a body that's mostly water. The Moon moves the tides and it moves you." },
  { label: "The playboy.", body: "The Moon is male in Vedic, and he visits his 12 wives in the course of a month. This makes the Moon's movements fast, touching everything, carrying the changing daily texture — exactly what a day trigger needs to be." },
];

export default function About() {
  const [, navigate] = useLocation();
  const serif = "'Playfair Display', Georgia, serif";
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0.5rem 1.4rem 2rem" }}>
      <button onClick={() => navigate("/settings")}
        className="inline-flex items-center gap-1 py-3" style={{ color: "var(--color-muted-foreground)", fontSize: "0.9rem", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
        <ChevronLeft size={17} /> Settings
      </button>

      <p style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "0.5rem 0 0" }}>Why the Moon</p>
      <h1 style={{ fontFamily: serif, fontSize: "2.4rem", fontWeight: 800, color: "var(--color-foreground)", margin: "0.3rem 0 0", letterSpacing: "0.02em" }}>Velea</h1>

      <div style={{ marginTop: "1.6rem", display: "flex", flexDirection: "column", gap: "1.15rem" }}>
        <p style={{ fontSize: "1.1rem", lineHeight: 1.72, color: "var(--color-foreground)", margin: 0 }}>
          In astrology, the Sun sign is who you are — the changeless <em>“I am,”</em> there before the universe had a size, too bright to face head-on. But that's eternity, and a person has to live on a Tuesday.
        </p>
        <p style={{ fontSize: "1.1rem", lineHeight: 1.72, color: "var(--color-foreground)", margin: 0 }}>
          So the soul does the one tender thing: it borrows the Sun's light and steps close. Close enough to pull the tides. Close enough to pull a body that's mostly water. And it agrees to move — through all twelve rooms, every month, never still.
        </p>
        <p style={{ fontSize: "1.15rem", lineHeight: 1.65, color: "var(--color-foreground)", margin: 0, fontFamily: serif }}>
          That's the Moon. The Sun's reflection, made gentle enough to be a gate. The <em>“I am”</em> you can't stare into, turned toward you. Restless, never in one house for long, slipping through all twelve palaces in a month — moving at the speed life actually changes.
        </p>
      </div>

      <p style={{ fontSize: "1.1rem", lineHeight: 1.72, color: "var(--color-foreground)", margin: "1.6rem 0 0" }}>
        Velea follows the Moon for three reasons that are really one:
      </p>
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {REASONS.map((r) => (
          <div key={r.label} style={{ borderLeft: "3px solid var(--color-primary)", paddingLeft: "0.9rem" }}>
            <p style={{ fontSize: "1.08rem", lineHeight: 1.6, color: "var(--color-foreground)", margin: 0 }}>
              <strong style={{ color: "var(--color-primary)", fontWeight: 800 }}>{r.label}</strong> {r.body}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "1.15rem", lineHeight: 1.7, color: "var(--color-foreground)", margin: "1.8rem 0 0", fontFamily: serif, fontWeight: 600 }}>
        That's why Vedic follows it. That's why Velea does. I built the whole engine on the one light humble enough to come close.
      </p>
    </div>
  );
}
