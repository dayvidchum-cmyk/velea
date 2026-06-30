import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Sparkles, Sun, Compass, X, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useDayModeColor } from "@/hooks/useDayModeColor";

/**
 * First-run onboarding for newcomers who only know their Western sun sign.
 * Two phases:
 *   1. Intro cards — what Velea is, where to start, that the deep tabs are optional.
 *   2. Guided tour — coachmarks pointing at the real UI on the Today page.
 * Shown once per user (gated by localStorage). Targets are tagged with
 * `data-tour="..."` attributes elsewhere in the app.
 */

const STORAGE_PREFIX = "kala_onboard_v1_";

/** Clear the seen-flag so the intro + tour run again next time Today opens. */
export function resetOnboarding(userId: number | string | null | undefined) {
  if (userId == null) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

type Props = {
  /** Only run when the user is on Today, authenticated, and has birth data. */
  active: boolean;
  userId: number | string | null | undefined;
};

const CARDS = [
  {
    icon: Sparkles,
    title: "Welcome to Velea",
    body: "Velea reads today's sky and turns it into one simple thing you can act on: your day mode. The whole app even tints itself to that mode's color, so you can feel what kind of day it is at a glance. No astrology knowledge required.",
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
  /** Navigate here before showing the step (if not already there). */
  route?: string;
  /** Switch the Chart page tab via a window event. */
  tab?: "natal" | "profection" | "dasha";
  /** Open a collapsible synthesis section on Today via a window event. */
  expand?: "why" | "timelord";
};

const TOUR: TourStep[] = [
  {
    route: "/",
    selector: '[data-tour="today-mode"]',
    expand: "why",
    title: "How Velea thinks",
    body: "This card is the whole engine in one place. Velea reads today's sky — moon sign, nakshatra, tithi, and the ruling time lord — and synthesizes it into a single mode for your day. Tap “see full breakdown” to follow the reasoning step by step.",
  },
  {
    route: "/",
    selector: '[data-tour="time-lord"]',
    expand: "timelord",
    title: "Time Lord Movement",
    body: "A Time Lord is simply the planet that rules your current stretch of time — the lord of your year in both Vedic (dasha) and Hellenistic (annual profection) astrology. This card shows which planet is in charge right now and how today's transiting planets are contacting it.",
  },
  {
    route: "/",
    selector: '[data-tour="current-state"]',
    title: "Tune your day",
    body: "Tell Velea where you are and how you're feeling. It folds that into the guidance so it fits your real day.",
  },
  {
    route: "/astrology",
    tab: "natal",
    selector: '[data-tour="natal-chart"]',
    title: "Your birth chart",
    body: "The sky at the moment you were born, in the Vedic (sidereal) zodiac. Your signs may differ from Western astrology — tap “What is a natal chart?” above the chart to see why.",
  },
  {
    route: "/astrology",
    tab: "profection",
    selector: '[data-tour="profection"]',
    title: "This year's focus",
    body: "Profection points to the area of life that's lit up for you this year, and the planet running the show — your annual headline.",
  },
  {
    route: "/astrology",
    tab: "profection",
    selector: '[data-tour="time-lord-transits"]',
    title: "Where the pressure comes from",
    body: "Here's the source of the daily nudge: how slow-moving planets are currently touching the lords of your time periods. This is what tilts your mode day to day.",
  },
  {
    route: "/astrology",
    tab: "dasha",
    selector: '[data-tour="dasha"]',
    title: "Your life chapter",
    body: "Dasha is the long arc — the multi-year planetary periods you're living through, your karmic schedule this lifetime. New to it? Tap “What are Dashas?” at the top to see how the periods work.",
  },
  {
    route: "/",
    selector: '[data-tour="today-mode"]',
    title: "Start here each day",
    body: "That's the full picture. Day to day you only need Today — everything else is here whenever you want to understand the “why.” Enjoy.",
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
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState<{ w: number; h: number }>({ w: 300, h: 170 });
  // While a step's target hasn't mounted yet (data still loading after a tab
  // switch), show a loading beat instead of an empty centered tooltip.
  const [waiting, setWaiting] = useState(true);
  const [location, navigate] = useLocation();
  const step = TOUR[index];
  const isLast = index === TOUR.length - 1;

  // Drive the app to the right place for this step: navigate routes, switch the
  // Chart tab, and open Today's collapsible synthesis sections.
  useEffect(() => {
    if (step.route && location !== step.route) {
      navigate(step.route);
    }
    // Tab + expand are window events the pages listen for. The destination page
    // may mount its listener slightly after navigation, so fire a few times.
    const fire = () => {
      if (step.tab) {
        window.dispatchEvent(new CustomEvent("kala-tour-tab", { detail: step.tab }));
      }
      if (step.expand) {
        window.dispatchEvent(new CustomEvent("kala-tour-expand", { detail: step.expand }));
      }
    };
    const delays = step.route && location !== step.route ? [120, 350, 650, 1000] : [0, 200];
    const timers = delays.map((d) => setTimeout(fire, d));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const measure = useCallback(() => {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.selector]);

  // When the step changes, bring the target into view (scrolling if needed) and
  // measure it. The target may mount late — after navigation, a tab switch, or a
  // data fetch — so we poll until it appears, showing a loading beat meanwhile.
  useLayoutEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    let settleTimers: ReturnType<typeof setTimeout>[] = [];

    // Returns true once the target exists (and has been measured).
    const tryMeasure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return false;
      }
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Fixed elements (e.g. the bottom nav) are always in view — never scroll
      // for them. For normal content, only scroll when it's near an edge.
      const isFixed = (() => {
        let node: HTMLElement | null = el;
        while (node) {
          if (getComputedStyle(node).position === "fixed") return true;
          node = node.parentElement;
        }
        return false;
      })();
      if (!isFixed && (r.top < 80 || r.bottom > vh - 80)) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      measure();
      return true;
    };

    const onFound = () => {
      setWaiting(false);
      // Re-measure a few times to catch expand/scroll animations settling.
      settleTimers = [120, 350, 700].map((d) => setTimeout(measure, d));
    };

    if (tryMeasure()) {
      onFound();
    } else {
      setWaiting(true);
      let attempts = 0;
      pollId = setInterval(() => {
        attempts += 1;
        if (tryMeasure()) {
          if (pollId) clearInterval(pollId);
          pollId = null;
          onFound();
        } else if (attempts >= 50) {
          // ~7.5s elapsed — give up and let the centered fallback show.
          if (pollId) clearInterval(pollId);
          pollId = null;
          setWaiting(false);
        }
      }, 150);
    }

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      if (pollId) clearInterval(pollId);
      settleTimers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step.selector, index]);

  // Keep the measured tooltip size in sync so we can clamp it on-screen.
  useLayoutEffect(() => {
    if (tipRef.current) {
      const r = tipRef.current.getBoundingClientRect();
      setTipSize({ w: r.width, h: r.height });
    }
  }, [index, rect]);

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

  // Position the tooltip relative to the hole, then clamp it inside the
  // viewport so it can never land off-screen behind the scroll-locked overlay.
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const gap = 14;
  const margin = 12;

  let tipTop: number;
  let tipLeft: number;
  if (hole) {
    const below = hole.top + hole.height + gap;
    const above = hole.top - gap - tipSize.h;
    if (below + tipSize.h <= vh - margin) {
      tipTop = below; // fits below the target
    } else if (above >= margin) {
      tipTop = above; // otherwise above
    } else {
      tipTop = vh - tipSize.h - margin; // last resort: pin to bottom
    }
    tipTop = Math.min(Math.max(margin, tipTop), Math.max(margin, vh - tipSize.h - margin));
    tipLeft = Math.min(Math.max(margin, hole.left), Math.max(margin, vw - tipSize.w - margin));
  } else {
    tipTop = Math.max(margin, (vh - tipSize.h) / 2);
    tipLeft = Math.max(margin, (vw - tipSize.w) / 2);
  }

  // Loading beat — the step's panel is still mounting/fetching.
  if (waiting) {
    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.62)", pointerEvents: "auto" }}
      >
        <div
          className="flex flex-col items-center gap-3 px-7 py-6 rounded-2xl"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          }}
        >
          <Loader2 size={22} className="animate-spin" style={{ color: accent }} />
          <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>
            Loading your chart…
          </p>
        </div>
        <button
          onClick={onFinish}
          className="absolute top-5 right-5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
        >
          Skip tour
        </button>
      </div>
    );
  }

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
        ref={tipRef}
        className="absolute px-5 py-4 rounded-2xl w-[300px] max-w-[calc(100vw-24px)]"
        style={{
          top: tipTop,
          left: tipLeft,
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          transition: "top 200ms ease, left 200ms ease",
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
