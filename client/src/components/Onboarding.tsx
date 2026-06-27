import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Sparkles, Sun, Compass, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useDayModeColor } from "@/hooks/useDayModeColor";

/**
 * First-run onboarding for newcomers who only know their Western sun sign.
 * Two phases:
 *   1. Intro cards — what Kala is, where to start, that the deep tabs are optional.
 *   2. Guided tour — coachmarks pointing at the real UI on the Today page.
 * Shown once per user (gated by localStorage). Targets are tagged with
 * `data-tour="..."` attributes elsewhere in the app.
 */

const STORAGE_PREFIX = "kala_onboard_v1_";

type Props = {
  /** Only run when the user is on Today, authenticated, and has birth data. */
  active: boolean;
  userId: number | string | null | undefined;
};

const CARDS = [
  {
    icon: Sparkles,
    title: "Welcome to Kala",
    body: "Kala reads today's sky and turns it into one simple thing you can act on: your day mode. No astrology knowledge required.",
  },
  {
    icon: Sun,
    title: "Start on Today",
    body: "Today tells you what kind of day this is — Action, Build, Selective, or Restraint — and what to focus on. If you only ever read one screen, read this one.",
  },
  {
    icon: Compass,
    title: "Go deeper when you're curious",
    body: "Chart, Profection, and Dasha reveal the astrology underneath. They're optional — ignore them until you want to explore. Today is all you need to begin.",
  },
];

type TourStep = {
  selector: string;
  title: string;
  body: string;
};

const TOUR: TourStep[] = [
  {
    selector: '[data-tour="today-mode"]',
    title: "Your day mode",
    body: "Kala distills today's sky into one instruction. Read this first each morning — it sets the tone for everything else.",
  },
  {
    selector: '[data-tour="current-state"]',
    title: "Tune your day",
    body: "Tell Kala where you are and how you're feeling. It adjusts your guidance to match.",
  },
  {
    selector: '[data-tour="chart-nav"]',
    title: "Go deeper here",
    body: "Your full birth chart, this year's focus, and the planetary chapter you're living through all live under Chart. Explore whenever you're curious.",
  },
];

export default function Onboarding({ active, userId }: Props) {
  const accent = useDayModeColor();
  const storageKey = userId != null ? `${STORAGE_PREFIX}${userId}` : null;

  // phase: null = not running, "cards" = intro deck, "tour" = coachmarks
  const [phase, setPhase] = useState<"cards" | "tour" | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);

  // Decide whether to show on mount / when becoming active.
  useEffect(() => {
    if (!active || !storageKey) return;
    if (phase !== null) return;
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "1";
    } catch {
      seen = false;
    }
    if (!seen) {
      // Small delay so the Today page has painted before we dim it.
      const t = setTimeout(() => setPhase("cards"), 450);
      return () => clearTimeout(t);
    }
  }, [active, storageKey, phase]);

  const finish = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }
    setPhase(null);
  }, [storageKey]);

  if (phase === "cards") {
    return (
      <CardsDeck
        accent={accent}
        index={cardIndex}
        setIndex={setCardIndex}
        onSkip={finish}
        onDone={() => {
          setTourIndex(0);
          setPhase("tour");
        }}
      />
    );
  }

  if (phase === "tour") {
    return (
      <TourLayer
        accent={accent}
        index={tourIndex}
        setIndex={setTourIndex}
        onFinish={finish}
      />
    );
  }

  return null;
}

// ── Intro cards ───────────────────────────────────────────────────────────────

function CardsDeck({
  accent,
  index,
  setIndex,
  onSkip,
  onDone,
}: {
  accent: string;
  index: number;
  setIndex: (n: number) => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const card = CARDS[index];
  const Icon = card.icon;
  const isLast = index === CARDS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-7 relative"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={onSkip}
          aria-label="Skip"
          className="absolute top-4 right-4 p-1 rounded-full transition-colors"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <X size={18} />
        </button>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}
        >
          <Icon size={26} />
        </div>

        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--color-foreground)" }}
        >
          {card.title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
          {card.body}
        </p>

        {/* Dots */}
        <div className="flex items-center gap-1.5 mt-6 mb-5">
          {CARDS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === index ? "20px" : "6px",
                background: i === index ? accent : "var(--color-border)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          {index > 0 ? (
            <button
              onClick={() => setIndex(index - 1)}
              className="text-sm font-semibold inline-flex items-center gap-1 px-3 py-2 rounded-full"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <button
              onClick={onSkip}
              className="text-sm font-medium px-3 py-2 rounded-full"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Skip
            </button>
          )}

          <button
            onClick={() => (isLast ? onDone() : setIndex(index + 1))}
            className="text-sm font-semibold inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-transform active:scale-95"
            style={{ background: accent, color: "#fff" }}
          >
            {isLast ? "Show me around" : "Next"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Guided tour ────────────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };

function TourLayer({
  accent,
  index,
  setIndex,
  onFinish,
}: {
  accent: string;
  index: number;
  setIndex: (n: number) => void;
  onFinish: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const step = TOUR[index];
  const isLast = index === TOUR.length - 1;

  const measure = useCallback(() => {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.selector]);

  useLayoutEffect(() => {
    measure();
    // Re-measure shortly after, in case layout/fonts settle.
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const next = () => (isLast ? onFinish() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));

  // Spotlight padding around the target.
  const pad = 8;
  const hole = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Decide whether the tooltip sits above or below the target.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const placeBelow = hole ? hole.top + hole.height < vh * 0.6 : true;

  return (
    <div className="fixed inset-0 z-[120]" style={{ pointerEvents: "auto" }}>
      {/* Dimming + spotlight hole via a giant box-shadow. */}
      {hole ? (
        <div
          className="absolute"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: "14px",
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 2px ${accent}`,
            transition: "all 240ms cubic-bezier(0.23,1,0.32,1)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.62)" }} />
      )}

      {/* Tooltip card */}
      <div
        className="absolute px-5 py-4 rounded-2xl max-w-[300px]"
        style={{
          ...(hole
            ? placeBelow
              ? { top: hole.top + hole.height + 14 }
              : { top: Math.max(16, hole.top - 14), transform: "translateY(-100%)" }
            : { top: "50%", transform: "translateY(-50%)" }),
          left: hole
            ? Math.min(Math.max(16, hole.left), (typeof window !== "undefined" ? window.innerWidth : 400) - 316)
            : 16,
          right: hole ? undefined : 16,
          margin: hole ? undefined : "0 auto",
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
        }}
      >
        <h3 className="text-sm font-bold mb-1" style={{ color: accent }}>
          {step.title}
        </h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--color-foreground)" }}>
          {step.body}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TOUR.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === index ? "16px" : "6px",
                  background: i === index ? accent : "var(--color-border)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {index > 0 && (
              <button
                onClick={back}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="text-xs font-semibold px-4 py-1.5 rounded-full transition-transform active:scale-95"
              style={{ background: accent, color: "#fff" }}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Skip-all */}
      <button
        onClick={onFinish}
        className="absolute top-5 right-5 text-xs font-semibold px-3 py-1.5 rounded-full"
        style={{ background: "rgba(0,0,0,0.4)", color: "#fff", pointerEvents: "auto" }}
      >
        Skip tour
      </button>
    </div>
  );
}
