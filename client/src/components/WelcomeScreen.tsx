import { useEffect, useState } from "react";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";
import { pickGreeting } from "@/lib/greeting";
import { trpc } from "@/lib/trpc";

/**
 * WelcomeScreen — the post-login moment for everyone. A single full-bleed sky image with the
 * viewer's own time-of-day greeting + first name, animated in gently, then it fades to the app.
 *
 * The image tracks the hour (David's greeting_splash set): sunrise → day → sunset → evening, and
 * AT NIGHT it becomes the current Moon phase — the same phase art the Stage shows — so the welcome
 * mirrors the sky overhead. Tap to skip.
 */

// Local-hour → splash bucket. Aligned to the greeting-text buckets in greeting.ts so the words and
// the sky agree: dawn 5–7, day 8–16, sunset 17–18, evening 19–20, night (Moon) 21–4.
function daySplash(h: number): { file: string; dark: boolean } | null {
  if (h >= 5 && h <= 7) return { file: "greeting-sunrise.jpg", dark: false };
  if (h >= 8 && h <= 16) return { file: "greeting-day.jpg", dark: false };
  if (h >= 17 && h <= 18) return { file: "greeting-sunset.jpg", dark: false };
  if (h >= 19 && h <= 20) return { file: "greeting-evening.jpg", dark: true };
  return null; // 21–4 → night, the Moon carries it
}

export default function WelcomeScreen({ firstName, onDone }: { firstName: string | null; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const now = new Date();
  const day = daySplash(now.getHours());
  const isNight = day === null;

  // At night, pull the current Moon phase (same source as the Stage). Cached, so it's usually
  // instant; if it lags the ~3.4s window, the dark night ground shows and the Moon fades in.
  const { data: sky } = trpc.celestial.today.useQuery(undefined, { staleTime: 30 * 60 * 1000, enabled: isNight });
  const moonFile = isNight ? (sky as any)?.image ?? null : null;

  const bgSrc = isNight ? (moonFile ? `/celestial/${moonFile}` : null) : `/${day!.file}`;
  const chrome = isNight || day?.dark ? "#0a131e" : "#93a8c0";
  useDarkChromeWhile(true, chrome); // match the sky at the top so there's no bar mismatch

  const greeting = pickGreeting(now, firstName);

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
        background: chrome,
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 680ms ease",
      }}
    >
      {/* The image — a slow, gentle drift-in (fade + a touch of scale) so it settles rather than
          pops. Keyed on the src so it re-mounts and re-animates if the Moon resolves late. */}
      {bgSrc && (
        <div
          key={bgSrc}
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${bgSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            animation: "velea-sky-in 5s ease-out both",
          }}
        />
      )}

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
            color: "#FDFDFD",
            textShadow: "0 2px 18px rgba(30,40,70,0.45)",
          }}
        >
          {greeting}
        </h1>
      </div>
    </div>
  );
}
