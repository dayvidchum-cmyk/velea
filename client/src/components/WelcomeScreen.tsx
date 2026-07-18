import { useEffect, useState } from "react";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";
import { pickGreeting } from "@/lib/greeting";
import { trpc } from "@/lib/trpc";

/**
 * WelcomeScreen — the post-login moment for everyone. A single full-bleed sky image with the
 * viewer's own time-of-day greeting + first name, animated in gently, then it fades to the app.
 *
 * The image tracks the hour: David's welcome shells (2026-07-18 drop, exact phone ratio
 * 3375×6000 — "so you have no excuses") sunrise → day → sunset → evening as full-bleed COVER,
 * and AT NIGHT it becomes the current Moon phase — the same phase art the Stage shows — so the
 * welcome mirrors the sky overhead. (Phone-ratio moon art is his next drop.) Tap to skip.
 */

// Local-hour → splash bucket. Aligned to the greeting-text buckets in greeting.ts so the words
// and the sky agree: dawn 5–7, day 8–16, sunset 17–18, evening 19–20, night (Moon) 21–4.
// chrome = the sampled top-strip color of each art, so the status bar melts into the sky.
function daySplash(h: number): { file: string; chrome: string } | null {
  if (h >= 5 && h <= 7) return { file: "welcome-sunrise.jpg", chrome: "#5c5476" };
  if (h >= 8 && h <= 16) return { file: "welcome-day.jpg", chrome: "#739bc8" };
  if (h >= 17 && h <= 18) return { file: "welcome-sunset.jpg", chrome: "#203356" };
  if (h >= 19 && h <= 20) return { file: "welcome-evening.jpg", chrome: "#020211" };
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

  // David's phone-ratio lunar greetings (2026-07-18) mirror the celestial basenames, so the
  // eight phases go full-bleed; anything outside the set (eclipse nights, for now) falls back
  // to the Stage art shown whole.
  const LUNAR_GREETINGS = new Set([
    "new-moon.jpg", "waxing-crescent.jpg", "first-quarter.jpg", "waxing-gibbous.jpg",
    "full-moon.jpg", "waning-gibbous.jpg", "last-quarter.jpg", "waning-crescent.jpg",
  ]);
  const moonFullBleed = !!moonFile && LUNAR_GREETINGS.has(moonFile);
  const bgSrc = isNight ? (moonFile ? (moonFullBleed ? `/welcome-moon/${moonFile}` : `/celestial/${moonFile}`) : null) : `/${day!.file}`;
  const fullBleed = !isNight || moonFullBleed;
  const chrome = isNight ? (moonFullBleed ? "#010104" : "#0a131e") : day!.chrome;
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
      style={{
        // TRUE inset — app-shell-height left a bottom strip on the PWA, and "cover"
        // beheaded the art's moon (David's 7/16 "still buggin"). The container pins to
        // all four edges; the art shows WHOLE (contain), the chrome ground fills the rest —
        // the same law as the Stage's full-screen art (v547).
        position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer",
        background: chrome,
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 680ms ease",
      }}
    >
      {/* The image — a slow, gentle drift-in so it settles rather than pops. Keyed on the src so
          it re-mounts and re-animates if the Moon resolves late. Day shells are exact phone ratio
          → full-bleed cover; the night Moon art stays contained WHOLE (fullscreen-art law) until
          its phone-ratio versions arrive. */}
      {bgSrc && (
        <div
          key={bgSrc}
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${bgSrc})`,
            backgroundSize: fullBleed ? "cover" : "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            animation: "velea-sky-in 5s ease-out both",
          }}
        />
      )}
      {/* Whisper of a top scrim under bright skies so the white greeting always reads. The lunar
          greetings' starfields are already near-black at the top — no scrim needed at night. */}
      {!isNight && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(12,18,32,0.34) 0%, rgba(12,18,32,0.16) 40%, transparent 62%)",
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
