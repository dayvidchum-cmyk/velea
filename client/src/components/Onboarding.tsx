import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { BookOpen, X, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import VeleaMark from "./VeleaMark";
import FirstRunWelcome from "./FirstRunWelcome";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { trpc } from "@/lib/trpc";

const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
/** "1982-02-03" + "20:39" + "West Islip" → "February 3, 1982 · 8:39 PM · West Islip" */
function formatBirthLine(p: any): string | null {
  if (!p?.birthDate) return null;
  const [y, m, d] = String(p.birthDate).slice(0, 10).split("-").map(Number);
  const datePart = (m && d && y) ? `${MONTHS_FULL[m - 1]} ${d}, ${y}` : String(p.birthDate);
  let timePart = "";
  if (p.birthTime) {
    const [hh, mm] = String(p.birthTime).split(":").map(Number);
    const ap = hh >= 12 ? "PM" : "AM"; const h12 = ((hh + 11) % 12) + 1;
    timePart = ` · ${h12}:${String(mm ?? 0).padStart(2, "0")} ${ap}`;
  }
  return `${datePart}${timePart}${p.birthLocationCity ? ` · ${p.birthLocationCity}` : ""}`;
}
/** Fire the guided tour from anywhere (welcome card, Settings). */
export function startTour() { window.dispatchEvent(new Event("velea-start-tour")); }

/**
 * First-run onboarding for newcomers who only know their Western sun sign.
 * Two phases:
 *   1. Intro cards — what Velea is, where to start, that the deep tabs are optional.
 *   2. Guided tour — coachmarks pointing at the real UI on the Today page.
 * Shown once per user (gated by localStorage). Targets are tagged with
 * `data-tour="..."` attributes elsewhere in the app.
 */

const STORAGE_PREFIX = "velea_onboard_v1_";
const TASK_GUIDE_PREFIX = "velea_taskguide_v1_";
const TASK_GUIDE_EVENT = "velea-task-guide";

/** Clear the seen-flag so the intro + tour run again next time Today opens. */
export function resetOnboarding(userId: number | string | null | undefined) {
  if (userId == null) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

/** Fire the standalone "how to add a task" guide (Settings, zero-task nudge). */
export function fireTaskGuide() {
  try {
    window.dispatchEvent(new CustomEvent(TASK_GUIDE_EVENT));
  } catch {
    /* ignore */
  }
}

/** Has this user already seen the task-making guide? (auto-fire gating) */
export function hasSeenTaskGuide(userId: number | string | null | undefined): boolean {
  if (userId == null) return true; // unknown user → don't auto-fire
  try {
    return localStorage.getItem(`${TASK_GUIDE_PREFIX}${userId}`) === "1";
  } catch {
    return true;
  }
}

type Props = {
  /** Only run when the user is on Today, authenticated, and has birth data. */
  active: boolean;
  userId: number | string | null | undefined;
};

const CARDS = [
  {
    icon: VeleaMark,
    title: "Welcome to Velea",
    body: "Velea reads today's sky and turns it into one simple thing you can act on: your day mode. The whole app even tints itself to that mode's color, so you can feel what kind of day it is at a glance. No astrology knowledge required.",
  },
  {
    icon: BookOpen,
    title: "Start on Today",
    body: "Today tells you what kind of day this is — Action, Build, Selective, or Restraint — and what to focus on. If you only ever read one screen, read this one.",
  },
  {
    icon: VeleaMark,
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

// Task-making steps — used both inside the main tour (below) and as the
// standalone "how to add a task" guide (TASK_TOUR).
const TASK_STEPS: TourStep[] = [
  {
    route: "/",
    selector: '[data-tour="mode-orbs"]',
    title: "Add by mode",
    body: "Each orb is a day mode. Tap one to add a task in that mode — or open it to see what's queued there. Tasks rise on the days that match their mode.",
  },
  {
    route: "/",
    selector: '[data-tour="add-fab"]',
    title: "Add tasks — this is what turns it on",
    body: "This is the part that matters: Velea reads the sky, but it only works FOR you once you add your real tasks. Tap + to add one — a mode, a life area, a due date, a recurrence — and Velea times and ranks it onto the days that fit. Without tasks, it's all analysis and no action.",
  },
];

// The standalone task-making guide (fired from Settings, on a first zero-task
// day, and as a one-time FAB coachmark).
const TASK_TOUR: TourStep[] = TASK_STEPS;

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
    selector: '[data-tour="current-location"]',
    title: "Set your current location",
    body: "This is where you are RIGHT NOW — separate from where you were born, and it's what makes today's timing and transits accurate. Tap it whenever you travel; if it's wrong, the whole day's read is off.",
  },
  {
    route: "/",
    selector: '[data-tour="current-state"]',
    title: "Check in — how are you today?",
    body: "Tell Velea your real state — energy, clarity, mood. The moment you save, your tasks re-rank to fit how you actually are right now, not just what the sky says.",
  },
  {
    route: "/astrology",
    tab: "natal",
    selector: '[data-tour="natal-chart"]',
    title: "Your birth chart",
    body: "The sky at the moment you were born, in the Vedic (sidereal) zodiac — built from your birth date, time, and place, so everything Velea tells you rests on it. If any of that's off, fix it in your profile and the whole chart recomputes. Your signs may differ from Western astrology — tap “What is a natal chart?” to see why.",
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
  ...TASK_STEPS,
  {
    route: "/",
    selector: '[data-tour="today-mode"]',
    title: "Start here each day",
    body: "That's the full picture. Day to day you only need Today — everything else is here whenever you want to understand the “why.” Enjoy.",
  },
];

// Per-page tours — each teaches its own page the first time you land there. Single
// page each (no confusing cross-page jumps), pointing only at elements that exist now.
const PAGE_TOURS: { route: string; key: string; steps: TourStep[] }[] = [
  {
    route: "/",
    key: "today",
    steps: [
      { selector: '[data-tour="today-mode"]', title: "Your day's mode", body: "Velea reads today's sky — moon sign, nakshatra, tithi, and your ruling time lord — and distills it into one mode for the day. This card is that signal; tap it to follow the reasoning." },
      { selector: '[data-tour="mode-orbs"]', title: "Four day-modes", body: "Action, Build, Selective, Restraint. Tap an orb to add a task in that mode — tasks rise on the days that match." },
      { selector: '[data-tour="current-state"]', title: "Tune your day", body: "Tell Velea where you are and how you're feeling. It folds that in so the guidance fits your real day." },
      { selector: '[data-tour="panchang-terms"]', title: "Tap to learn any term", body: "See a word underlined in gold — a nakshatra, a tithi, a planet? Tap it for a plain-language definition. The whole app is glossary-linked, so you never have to leave to look something up." },
      { selector: '[data-tour="add-fab"]', title: "Add anything — and use the tool", body: "Tap + to add a task with its mode, life area, and due date. And really use it: dump your whole to-do list in, flag each one, make projects for the big things. Then, day to day, Velea decides your best next move for you. Feed it little and it stays just a pretty astrology reading — the magic is in actually using it." },
    ],
  },
  {
    route: "/profection",
    key: "chart",
    steps: [
      { selector: '[data-tour="chart-tabs"]', title: "Three lenses on your chart", body: "Time Lord (the planet running your year), Natal (your birth chart), and Dasha (your long life chapters). Optional depth — Today is all you need day to day." },
      { selector: '[data-tour="profection-wheel"]', title: "Your Time Lord's path", body: "Each ring is a year of your life and the sign your ascendant profects into — sign by sign, from birth to 120. The gold Velea mark below the strip is today." },
      { selector: '[data-tour="meridian"]', title: "Your dharma axis", body: "The Meridian tracks slow planets crossing your MC/IC — the larger chapters of your public calling and private roots. When one's active it names the chapter, the antardasha carrying it, and where it's headed. Tap “What's this?” anytime." },
      { selector: '[data-tour="current-state"]', title: "Always in the header", body: "Your location and current state ride along at the top of every page, quietly tuning the guidance." },
    ],
  },
];

export default function Onboarding({ active, userId }: Props) {
  const accent = useDayModeColor();
  const [location, navigate] = useLocation();

  // Server-persisted tour state ({ seen: string[], enabled }). Reliable across
  // devices and iOS PWA localStorage clears — that's why it used to re-fire.
  const tourState = trpc.settings.getTourState.useQuery(undefined, { enabled: userId != null, staleTime: 60_000 });
  const activeProfile = trpc.profiles.getActive.useQuery(undefined, { enabled: userId != null, staleTime: 60_000 });
  const locationData = trpc.settings.getLocation.useQuery(undefined, { enabled: userId != null, staleTime: 60_000 });
  const utils = trpc.useUtils();
  const markSeen = trpc.settings.markTourSeen.useMutation({
    onSuccess: () => { utils.settings.getTourState.invalidate(); },
  });
  const setToursEnabled = trpc.settings.setToursEnabled.useMutation({
    onSuccess: () => { utils.settings.getTourState.invalidate(); },
  });

  // The active per-page tour, plus the standalone "how to add a task" guide.
  const [running, setRunning] = useState<{ key: string; steps: TourStep[] } | null>(null);
  const [tourIndex, setTourIndex] = useState(0);
  const [taskGuide, setTaskGuide] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const taskKey = userId != null ? `${TASK_GUIDE_PREFIX}${userId}` : null;

  // Standalone task guide — fired via window event (Settings, zero-task nudge).
  useEffect(() => {
    const onFire = () => setTaskGuide((on) => (running ? on : true));
    window.addEventListener(TASK_GUIDE_EVENT, onFire);
    return () => window.removeEventListener(TASK_GUIDE_EVENT, onFire);
  }, [running]);

  // Explicit "start the tour" — from the welcome card or Settings. Opt-in only.
  useEffect(() => {
    const onStart = () => {
      const pageTour = PAGE_TOURS.find((p) => p.route === location) ?? PAGE_TOURS.find((p) => p.route === "/");
      if (pageTour) { setTaskGuide(false); setTourIndex(0); setRunning({ key: pageTour.key, steps: pageTour.steps }); }
    };
    window.addEventListener("velea-start-tour", onStart);
    return () => window.removeEventListener("velea-start-tour", onStart);
  }, [location]);

  // Run the current page's tour the first time the user lands there — but ONLY after the
  // welcome has been dismissed AND the user opted into tours (enabled). No forced overlays.
  useEffect(() => {
    if (!active || userId == null || running || taskGuide) return;
    const data = tourState.data;
    if (!data || !data.enabled || !data.seen.includes("welcome")) return;
    const pageTour = PAGE_TOURS.find((p) => p.route === location);
    if (!pageTour || data.seen.includes(pageTour.key)) return;
    const t = setTimeout(() => { setTourIndex(0); setRunning({ key: pageTour.key, steps: pageTour.steps }); }, 700);
    return () => clearTimeout(t);
  }, [active, userId, running, taskGuide, tourState.data, location]);

  const finishTour = useCallback(() => {
    setRunning((r) => { if (r) markSeen.mutate({ key: r.key }); return null; });
  }, [markSeen]);

  const finishTaskGuide = useCallback(() => {
    if (taskKey) { try { localStorage.setItem(taskKey, "1"); } catch { /* ignore */ } }
    setTaskGuide(false);
  }, [taskKey]);

  // First-run welcome — shown once on Today, before any tour. Replaces the auto-forced tour;
  // drives birth-data confirmation + current-location, then OFFERS the tour.
  const prof = activeProfile.data as any;
  const showWelcome = !welcomeDismissed && active && userId != null && !running && !taskGuide
    && !!tourState.data && !tourState.data.seen.includes("welcome") && location === "/";
  if (showWelcome) {
    return (
      <FirstRunWelcome
        name={prof?.name ?? ""}
        birthLine={formatBirthLine(prof)}
        locationSet={!!(locationData.data as any)?.city}
        locationLabel={(locationData.data as any)?.city ?? null}
        onFixBirth={() => navigate("/profiles")}
        onSetLocation={() => window.dispatchEvent(new Event("velea-open-location"))}
        onTakeTour={() => { setWelcomeDismissed(true); markSeen.mutate({ key: "welcome" }); setToursEnabled.mutate({ enabled: true }); startTour(); }}
        onExplore={() => { setWelcomeDismissed(true); markSeen.mutate({ key: "welcome" }); setToursEnabled.mutate({ enabled: false }); }}
      />
    );
  }

  if (running) {
    return (
      <TourLayer
        accent={accent}
        index={tourIndex}
        setIndex={setTourIndex}
        steps={running.steps}
        onFinish={finishTour}
      />
    );
  }

  if (taskGuide) {
    return (
      <TourLayer
        accent={accent}
        index={tourIndex}
        setIndex={setTourIndex}
        steps={TASK_TOUR}
        onFinish={finishTaskGuide}
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
  steps = TOUR,
}: {
  accent: string;
  index: number;
  setIndex: (n: number) => void;
  onFinish: () => void;
  steps?: TourStep[];
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState<{ w: number; h: number }>({ w: 300, h: 170 });
  // While a step's target hasn't mounted yet (data still loading after a tab
  // switch), show a loading beat instead of an empty centered tooltip.
  const [waiting, setWaiting] = useState(true);
  const [location, navigate] = useLocation();
  const step = steps[index];
  const isLast = index === steps.length - 1;

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
        window.dispatchEvent(new CustomEvent("velea-tour-tab", { detail: step.tab }));
      }
      if (step.expand) {
        window.dispatchEvent(new CustomEvent("velea-tour-expand", { detail: step.expand }));
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
            {steps.map((_, i) => (
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

          {/* Skip lives inside the card — reachable, away from the phone's top UI */}
          <button
            onClick={onFinish}
            className="w-full text-center text-xs font-medium mt-4 pt-3"
            style={{ color: "var(--color-muted-foreground)", borderTop: "1px solid var(--color-border)", pointerEvents: "auto" }}
          >
            Skip the tour
          </button>
      </div>
    </div>
  );
}
