import { useEffect, useState } from "react";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";
import { pickGreeting } from "@/lib/greeting";

/**
 * WelcomeScreen — the post-login moment for everyone. A single full-bleed image (the sunset shell)
 * with the viewer's own time-of-day greeting + first name, animated in gently, then it fades away to
 * the app. Tap to skip. Replaces the branded etymology splash as the welcome.
 */
export default function WelcomeScreen({ firstName, onDone }: { firstName: string | null; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useDarkChromeWhile(true, "#93a8c0"); // match the image's sky so there's no bar mismatch at the top
  const greeting = pickGreeting(new Date(), firstName);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 3400);
    const done = setTimeout(onDone, 4100);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="app-shell-height"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, cursor: "pointer",
        background: "#93a8c0",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 680ms ease",
      }}
    >
      {/* The image — a slow, gentle drift-in (fade + a touch of scale) so it settles rather than pops. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/welcome-sunset.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          animation: "velea-sky-in 5s ease-out both",
        }}
      />

      {/* Greeting — the viewer's own time-of-day line + first name, resting over the open sky. */}
      <div
        style={{
          position: "absolute", top: "17%", left: 0, right: 0,
          display: "flex", justifyContent: "center", padding: "0 1.5rem",
          animation: "velea-rise 1.1s cubic-bezier(0.2,0.8,0.2,1) 0.5s both",
        }}
      >
        <h1
          style={{
            margin: 0, textAlign: "center",
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 8.5vw, 3rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "#ffffff",
            textShadow: "0 2px 18px rgba(30,40,70,0.45)",
          }}
        >
          {greeting}
        </h1>
      </div>
    </div>
  );
}
