import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { fireTaskGuide, hasSeenTaskGuide } from "@/components/Onboarding";
import ProseLoading from "@/components/ProseLoading";
import KeptReadings from "@/components/KeptReadings";
import VeleaLorMark from "@/components/VeleaLorMark";
import OctagramMark from "@/components/OctagramMark";
import { ChevronLeft, ChevronRight, BookOpen, Plus, ChevronDown, Pin, Moon, Sunrise, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useFullSpectrum } from "@/hooks/useFullSpectrum";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";
import ModeOrb from "@/components/ModeOrb";
import ModeOrbSheet from "@/components/ModeOrbSheet";
import SignpostSheet from "@/components/SignpostSheet";
import { useSettingsContext } from "@/contexts/SettingsContext";

import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_TINT, MODE_CARD_BG, MODE_SOLID, MODE_RGBA, autoTextColors } from "../../../shared/types";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import { evaluateRestGate } from "../../../shared/rest-gate";
import type { Task } from "../../../drizzle/schema";
import AppHeader from "@/components/AppHeader";
import GlossaryText from "@/components/GlossaryText";
import { GlossaryLink } from "@/components/GlossaryPopover";
import WhyNowSheet from "@/components/WhyNowSheet";
import { createPortal } from "react-dom";
import AddToHomeScreenNote from "@/components/AddToHomeScreenNote";
import MasterModeCard from "@/components/MasterModeCard";
import HoraCard from "@/components/HoraCard";
import MeridianWhisper from "@/components/MeridianWhisper";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Planetary glyphs for the Time Lord (Sun's is the circle-dot, its alchemical symbol).

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Retrograde planets → their glyph + color for the calendar strip. Two tunings so the
// small glyphs read on the mode-tinted tiles: BRIGHT on dark + Full Spectrum, DEEP on light.
// ︎ forces TEXT presentation — without it iOS renders ♀/♂ as color emoji (a different
// font with its own baseline + it ignores our color), which threw the strip's alignment off.
const PLANET_GLYPH: Record<string, string> = { Mercury: "☿︎", Venus: "♀︎", Mars: "♂︎", Jupiter: "♃︎", Saturn: "♄︎" };
// One symbol font for all five so they share metrics and sit on the same line.
const PLANET_GLYPH_FONT = '"Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols", "Noto Sans Symbols2", sans-serif';
const PLANET_RETRO_COLOR: { bright: Record<string, string>; deep: Record<string, string> } = {
  bright: { Mercury: "#85CDB5", Venus: "#F7A8B4", Mars: "#E8556B", Jupiter: "#E6C33A", Saturn: "#33A1FF" },
  deep:   { Mercury: "#2E8B6E", Venus: "#C65A72", Mars: "#BD0039", Jupiter: "#9A7E00", Saturn: "#0E74D4" },
};

// Day-mode coin colors, ONE palette for the always-light calendar (David 2026-07-11): appearance
// mode no longer changes the surface, so it no longer changes these. BRIGHT/true mode colors — they
// read fine on the light background (David: bright gold is fine on white). A FILLED coin's NUMBER is
// a very dark tonal version of the same color (darkenOklch), not white — more elegant, and it lets
// the fill stay bright, gold included.
const MODE_DOT: Record<string, string> = {
  Action:     "oklch(0.70 0.18 150)",  // green
  Build:      "oklch(0.80 0.15 92)",   // bright gold
  Restraint:  "oklch(0.68 0.09 14)",   // rose
  Selective:  "oklch(0.68 0.08 225)",  // teal
  Flex:       "oklch(0.72 0.10 280)",  // purple
  Activate:   "oklch(0.70 0.18 150)",
  ACTION:     "oklch(0.70 0.18 150)",
  BUILD:      "oklch(0.80 0.15 92)",
  RESTRAINT:  "oklch(0.68 0.09 14)",
  "SELECTIVE ACTION": "oklch(0.68 0.08 225)",
};

/** Adds an alpha value to an oklch() color string, e.g. "oklch(0.72 0.16 145)" → "oklch(0.72 0.16 145 / 0.15)" */
function withAlpha(oklch: string, alpha: number): string {
  // If it's already a CSS variable or non-oklch value, fall back to a neutral tint
  if (!oklch.startsWith("oklch(")) return `oklch(0.5 0 0 / ${alpha})`;
  return oklch.replace(")", ` / ${alpha})`);
}

/** Darkens an oklch() color by scaling its lightness, e.g. for hover/press fills. */
function darkenOklch(oklch: string, factor: number): string {
  const m = oklch.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return oklch;
  const L = Math.max(0, parseFloat(m[1]) * factor);
  return `oklch(${L.toFixed(3)} ${m[2]} ${m[3]})`;
}

// Planner-specific mode colors — now identical to shared since shared was fixed to gold
const PLANNER_MODE_OKLCH: Record<TaskMode, string> = {
  ...MODE_OKLCH,
};

const PLANNER_MODE_TINT: Record<TaskMode, string> = {
  ...MODE_TINT,
};

// Plain-language day-mode reference shown at the bottom of Today (collapsible),
// to help decide which tasks fit which mode. Mirrors the Glossary "Modes" entries.

// Task → AddTaskSheet's editTask shape. One mapping for every edit entry point (was duplicated
// three times — general, pinned, aligned — each a ~15-field literal that could drift apart).
function toSheetTask(t: any) {
  return {
    id: String(t.id),
    title: t.title,
    mode: t.mode,
    priority: t.priority === "High" ? 3 : t.priority === "Medium" ? 2 : 1,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : undefined,
    isPinned: t.isPinned,
    wealthFlow: t.wealthFlow ?? false,
    projectId: t.projectId ?? null,
    cognitiveLoad: t.cognitiveLoad ?? null,
    physicalLoad: t.physicalLoad ?? null,
    creativeRequired: t.creativeRequired ?? null,
    socialRequired: t.socialRequired ?? null,
    emotionalLoad: t.emotionalLoad ?? null,
    notes: t.notes ?? null,
    recurrence: t.recurrence ?? null,
    lifeAreas: t.lifeAreas ?? null,
  };
}

export default function Planner() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettingsContext();

  // `today` is reactive so midnight rollover (with the app left open) advances the whole
  // hero — mode AND prose — to the new day, instead of freezing the read at page-load day.
  const [today, setToday] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (toDateStr(now) === toDateStr(today)) return;
      // Only carry the user forward if they were sitting on "today"; leave a manually
      // selected past/future date alone.
      setSelectedDate((sd) => (sd === toDateStr(today) ? toDateStr(now) : sd));
      setToday(now);
    };
    const id = setInterval(check, 60_000);
    window.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { clearInterval(id); window.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, [today]);
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false); // recorder collapsed — no big empty box by default

  // Task list state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // Edit sheets for the curated daily lists (ported from the retired Today page)
  const [heroOpen, setHeroOpen] = useState(true);
  const [signpostOpen, setSignpostOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  // Orb sheets reflect TODAY (not the calendar-selected date).
  const [orbSheetMode, setOrbSheetMode] = useState<TaskMode | null>(null);
  const [quickAddMode, setQuickAddMode] = useState<TaskMode | null>(null);
  // "Plan ahead" planning tools are collapsed by default — today-first.
  const [planOpen, setPlanOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false); // both task lists ship collapsed — the hero is the only open block
  const [alignedOpen, setAlignedOpen] = useState(false);
  const [whyNowTask, setWhyNowTask] = useState<any>(null); // the aligned task whose "Why now?" pop-up is open
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [openModeGroups, setOpenModeGroups] = useState<Set<string>>(new Set());
  const [completedOpen, setCompletedOpen] = useState(false);

  function getHouseSuffix(n: number | undefined): string {
    if (!n) return "th";
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
  }

  const yearMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: monthPanchang = [] } = trpc.panchang.byMonth.useQuery({ yearMonth });
  const { data: selectedPanchang, isFetching: panchangFetching } = trpc.panchang.byDate.useQuery({ date: selectedDate });
  // Today's panchang is needed to know the current day mode for auto-assigning on pin
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  // Crown days — the PERSONAL apex (your chart's tara+chandra+transits align), shown as
  // a gold crown badge + gold border on the calendar. (Golden days were removed.)
  const { data: crownData } = trpc.crown.forMonth.useQuery(
    { year: viewDate.getFullYear(), month: viewDate.getMonth() + 1 },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );
  // Collective sky labels — Mercury's course (David follows the WHOLE course; the ±3
  // days around each station are the worst) + eclipse days. One glyph, three
  // intensities: faint ☿ across the retrograde, stronger in station windows, full on
  // station day. Eclipses get the dark disc.
  const { data: skyMarks } = trpc.sky.monthMarks.useQuery({ yearMonth }, { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 });
  // Every retrograde planet's marks, collapsed to a per-date list for the glyph strip.
  // Each planet contributes at most one state per day; strongest wins: station > window
  // > rx > shadow. `detail` feeds the tap popup.
  const retroByDate = useMemo(() => {
    const rank: Record<string, number> = { "station-retro": 5, "station-direct": 5, window: 4, rx: 3, shadow: 1 };
    const map = new Map<string, { planet: string; state: string; detail: string }[]>();
    const add = (date: string, planet: string, state: string, detail: string) => {
      let arr = map.get(date);
      if (!arr) { arr = []; map.set(date, arr); }
      const existing = arr.find((e) => e.planet === planet);
      if (existing) { if (rank[state] > rank[existing.state]) { existing.state = state; existing.detail = detail; } }
      else arr.push({ planet, state, detail });
    };
    for (const p of skyMarks?.retro ?? []) {
      for (const s of p.stations) add(s.date, p.planet, s.type === "turns retrograde" ? "station-retro" : "station-direct", s.type === "turns retrograde" ? "stations retrograde" : "stations direct");
      for (const d of p.windowDays) add(d, p.planet, "window", "station window — the roughest days");
      for (const d of p.retroDays) add(d, p.planet, "rx", "retrograde");
      for (const d of p.preShadowDays) add(d, p.planet, "shadow", "in its pre-shadow");
      for (const d of p.postShadowDays) add(d, p.planet, "shadow", "in its post-shadow");
      for (const d of p.shadowEnterDays) add(d, p.planet, "shadow", "enters its shadow");
      for (const d of p.shadowExitDays) add(d, p.planet, "shadow", "clears its shadow");
    }
    const order = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
    for (const arr of Array.from(map.values())) arr.sort((a, b) => order.indexOf(a.planet) - order.indexOf(b.planet));
    return map;
  }, [skyMarks]);
  // The retrograde planets present ANYWHERE this month, in canonical order — each gets a fixed
  // track slot under the coins so its span reads as one continuous horizontal line across days.
  const monthRetroPlanets = useMemo(() => {
    const present = new Set<string>((skyMarks?.retro ?? []).map((p) => p.planet));
    return ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].filter((p) => present.has(p));
  }, [skyMarks]);
  const eclipseByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of skyMarks?.eclipses ?? []) m.set(e.date, e.type);
    return m;
  }, [skyMarks]);
  const crownByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rating === "crown") m.set(d.date, d.why ?? "");
    return m;
  }, [crownData]);
  // Personal-weather gate, calendar edition: a personal CAUTION day is contained to Restraint
  // (mirrors server applyWeatherGate — the day sheet/hero get the same clamp server-side, so
  // tile color and prose always agree). See server/panchang/interpreter.ts.
  const cautionByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rating === "caution") m.set(d.date, d.why ?? "");
    return m;
  }, [crownData]);
  const cautionSet = useMemo(() => new Set(cautionByDate.keys()), [cautionByDate]);
  // Golden days — the COLLECTIVE potential (panchang day-quality, no chart needed), brought
  // back as a golden BORDER on the calendar. Crown days = a golden day + the crown badge on top.
  const { data: goldenData } = trpc.sky.goldenDays.useQuery(
    { yearMonth: `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}` },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );
  const goldenSet = useMemo(() => new Set<string>((goldenData?.potential ?? []) as string[]), [goldenData]);
  // Tapped crown day's popup — stores the cell's viewport anchor so the popup can render
  // fixed-to-viewport (never clipped by the calendar card's overflow).
  const [crownTip, setCrownTip] = useState<{ date: string; kind: "crown" | "golden" | "caution" | "retro" | "eclipse"; why: string; cx: number; top: number; bottom: number; accent: string } | null>(null);
  // Scroll-anchor: selecting a date re-renders the hero card ABOVE the calendar, whose height change
  // would otherwise shove the calendar and "jump" the screen. We capture the calendar's viewport top
  // on tap and restore it in a layout effect so the tapped cell stays visually put.
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const ignoreScrollRef = useRef(false);
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    scrollAnchorRef.current = null;
    if (anchor == null || !calendarRef.current) return;
    const pin = () => {
      if (!calendarRef.current) return;
      const delta = calendarRef.current.getBoundingClientRect().top - anchor;
      if (Math.abs(delta) > 0.5) { ignoreScrollRef.current = true; window.scrollBy(0, delta); }
    };
    pin();
    // The day card above loads ASYNC after the tap — it collapses then re-grows, yanking the
    // page up and back. Keep the tapped cell pinned through that churn: re-correct on every
    // body resize for ~1.2s, then stand down.
    const until = performance.now() + 1200;
    let corrections = 0; // damp: iOS floats the fixed nav during scrollBy storms — few, meaningful corrections only
    const ro = new ResizeObserver(() => {
      if (performance.now() > until || corrections >= 3) { ro.disconnect(); return; }
      if (!calendarRef.current) return;
      const delta = calendarRef.current.getBoundingClientRect().top - anchor;
      if (Math.abs(delta) > 2) { corrections++; ignoreScrollRef.current = true; window.scrollBy(0, delta); }
    });
    ro.observe(document.body);
    const stop = window.setTimeout(() => ro.disconnect(), 1300);
    return () => { ro.disconnect(); window.clearTimeout(stop); };
  }, [selectedDate]);
  // Crown popup dismissal WITHOUT a scroll-blocking backdrop (that froze the page): close on an
  // outside pointer-down, on user scroll (the anchor correction's programmatic scroll is ignored
  // once), and on resize. The popup is anchored to a captured rect, so any real scroll should close it.
  useEffect(() => {
    if (!crownTip) return;
    const onScroll = () => { if (ignoreScrollRef.current) { ignoreScrollRef.current = false; return; } setCrownTip(null); };
    const onResize = () => setCrownTip(null);
    const onDown = (e: Event) => { const t = e.target as Element | null; if (!(t && t.closest && t.closest("[data-crowntip]"))) setCrownTip(null); };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onDown);
      window.clearTimeout(id);
    };
  }, [crownTip?.date]);
  const todayTaskMode = todayPanchang
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const { data: allTasks = [], isSuccess: tasksLoaded } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });

  // First zero-task day → nudge the standalone "how to add a task" guide, once.
  const taskGuideFiredRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !tasksLoaded || taskGuideFiredRef.current) return;
    if (allTasks.length !== 0) return;
    if (hasSeenTaskGuide(user?.id)) return;
    taskGuideFiredRef.current = true;
    const t = setTimeout(() => fireTaskGuide(), 900);
    return () => clearTimeout(t);
  }, [isAuthenticated, tasksLoaded, allTasks.length, user?.id]);

  // Ranked-for-today suggestions powering the "Aligned for today" list (ported from Home).
  const todayDateStr = useMemo(() => today.toISOString().split("T")[0], [today]);
  const { data: rankedTasks } = trpc.tasks.rankedForToday.useQuery(
    {
      todayMode: todayTaskMode ?? "Build",
      todayDate: todayDateStr,
      todayHouse: todayPanchang?.houseActivated ?? undefined,
      verdictShapesRanking: settings.verdictShapesRanking,
      meridianLift: settings.meridianLift,
    },
    { enabled: isAuthenticated && !!todayTaskMode }
  );
  // Today's check-in → the Rest gate (shared/rest-gate). A floor reading ("empty on every
  // axis") flips the "Aligned for today" surface from a task list to a rest card + a single
  // opt-in "one small thing" — rest is the aligned move, above the collective sky.
  const REST_TEAL = "#178F9E"; // Restore/Selective teal — the rest-gate accent
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const restGate = useMemo(() => evaluateRestGate(todayCheckIn as any), [todayCheckIn]);
  const [restOptIn, setRestOptIn] = useState(false);
  const { data: savedReflection } = trpc.reflections.get.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );
  // LLM daily signal (Glance) — the SAME cached source the Today/Home hero uses.
  // Only fetched when the selected date is today, so the Planner hero mirrors
  // Home's cached content exactly (same profileId + local date string = same
  // cache key). Other calendar dates keep the deterministic composed narrative,
  // which also avoids triggering on-demand LLM generation per calendar click.
  const { data: activeProfile } = trpc.profiles.getActive.useQuery();
  const glanceProfileId = activeProfile?.id;
  // The prose generates for ANY selected date (server-caches per profile+date, so
  // re-selecting a day is free). The mode card and its narrative both track selectedDate.
  const { data: glance, isFetching: glanceFetching } = trpc.narrative.glance.useQuery(
    { profileId: glanceProfileId as number, date: selectedDate },
    { enabled: !!glanceProfileId, staleTime: 1000 * 60 * 30 },
  );
  const glanceContent = glance?.content ?? null;

  const utils = trpc.useUtils();

  // Refresh today's reading — regenerates the daily read and CACHES it (no nowMs = not a
  // moment/ephemeral read), so the new one persists and returns on reload (David's expectation).
  // Each tap is a fresh Sonnet call, so the button is admin-gated in the UI.
  const [refreshingRead, setRefreshingRead] = useState(false);
  const updateToMoment = async () => {
    if (!glanceProfileId) return;
    setRefreshingRead(true);
    try {
      const res = await utils.narrative.glance.fetch({ profileId: glanceProfileId, date: selectedDate, refresh: true });
      utils.narrative.glance.setData({ profileId: glanceProfileId, date: selectedDate }, res);
    } finally {
      setRefreshingRead(false);
    }
  };

  const saveReflection = trpc.reflections.upsert.useMutation({
    onSuccess: () => {
      setReflectionSaved(true);
      setTimeout(() => setReflectionSaved(false), 2000);
      utils.reflections.get.invalidate({ date: selectedDate });
    },
  });

  const createMutation = trpc.tasks.create.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      const optimistic = {
        id: -Date.now(),
        userId: 0,
        profileId: null,
        title: input.title,
        mode: input.mode ?? "Build",
        priority: input.priority ?? "Medium",
        isPinned: input.isPinned ?? false,
        isCompleted: false,
        completedAt: null,
        dueDate: input.dueDate ?? null,
        wealthFlow: input.wealthFlow ?? false,
        projectId: input.projectId ?? null,
        projectName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtaskTotal: 0,
        subtaskCompleted: 0,
      } as Task & { subtaskTotal: number; subtaskCompleted: number; projectName: string | null };
      utils.tasks.list.setData(undefined, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to add task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === input.id ? ({ ...t, ...input } as typeof t) : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to update task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.pinnedForToday.invalidate();
      utils.tasks.rankedForToday.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.rankedForToday.invalidate();
    },
  });

  const purgeCompleted = trpc.tasks.purgeCompleted.useMutation({
    onSuccess: ({ removed }) => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.dueList.invalidate();
      toast.success(removed > 0 ? `Cleared ${removed} completed task${removed > 1 ? "s" : ""}` : "No completed tasks to clear");
    },
    onError: () => toast.error("Failed to clear completed tasks"),
  });

  const toggleComplete = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isCompleted: isCompleted ?? t.isCompleted } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const togglePin = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isPinned }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isPinned: isPinned ?? t.isPinned } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      utils.tasks.list.setData(undefined, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete task");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const handleSave = (data: { title: string; mode: TaskMode; priority: TaskPriority; isPinned: boolean; dueDate?: string | null }) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, ...data });
    } else {
      createMutation.mutate(data);
    }
    setEditTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setSheetOpen(true);
  };

  const panchangByDate = useMemo(() => {
    const map: Record<string, typeof monthPanchang[0]> = {};
    for (const p of monthPanchang) map[p.date] = p;
    return map;
  }, [monthPanchang]);

  const selectedTaskMode = selectedPanchang
    ? PANCHANG_TO_TASK_MODE[selectedPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const isFlexDay = (selectedPanchang?.mode as string) === "Flex" || (selectedPanchang?.mode as string) === "FLEX";

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const matchedTasks = useMemo(() => {
    const now = Date.now();
    const notSnoozed = allTasks.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
    const base = isFlexDay
      ? notSnoozed.filter((t) => (t.mode === "Build" || t.mode === "Action") && !t.isCompleted)
      : selectedTaskMode
      ? notSnoozed.filter((t) => t.mode === selectedTaskMode && !t.isCompleted)
      : [];
    return base
      .sort((a, b) => {
        // Pinned first, then by priority
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      })
      .slice(0, 3);
  }, [allTasks, selectedTaskMode, isFlexDay]);

  // Orb counts reflect TODAY, derived from the single allTasks source so there is
  // no extra fetch. Mirrors server tasks.modeCounts / tasks.dueList semantics.
  const orbModeCounts = useMemo(() => {
    const now = Date.now();
    const active = allTasks.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
    return {
      Restraint: active.filter((t) => t.mode === "Restraint" && !t.isCompleted).length,
      Build: active.filter((t) => t.mode === "Build" && !t.isCompleted).length,
      Selective: active.filter((t) => t.mode === "Selective" && !t.isCompleted).length,
      Action: active.filter((t) => t.mode === "Action" && !t.isCompleted).length,
    } as Record<TaskMode, number>;
  }, [allTasks]);

  // Priority sort order (title-case to match DB enum)
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  // Today's mode color for the curated daily lists (ported from Home).
  const todayModeColor = todayTaskMode ? MODE_OKLCH[todayTaskMode] : "var(--color-border)";

  // Pinned for Now: explicitly pinned, not completed, sorted by priority.
  const pinnedForNow = useMemo(() => {
    const now = Date.now();
    const localToday = toDateStr(new Date());
    // Due tasks (overdue or due TODAY) auto-populate To Do alongside the user's pins — the ONLY
    // thing that ever lands here automatically (the Due orb was retired). A pinned-and-due task
    // shows once via the OR.
    const isDueNow = (t: any) => {
      if (!t.dueDate) return false;
      const due = typeof t.dueDate === "string" ? t.dueDate.slice(0, 10) : toDateStr(new Date(t.dueDate));
      return due <= localToday;
    };
    return allTasks
      .filter((t) =>
        !t.isCompleted &&
        (!t.snoozedUntil || t.snoozedUntil <= now) &&
        (t.isPinned || isDueNow(t))
      )
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority ?? "Low"] ?? 2;
        const pb = PRIORITY_RANK[b.priority ?? "Low"] ?? 2;
        return pa - pb;
      });
  }, [allTasks]);

  // Aligned for Today: ranked tasks that are NOT already pinned (avoid duplication),
  // limited by the user's todayTaskLimit. Display order follows the backend score.
  const alignedForToday = useMemo(() => {
    if (!rankedTasks) return [];
    const pinnedIds = new Set(pinnedForNow.map((t) => t.id));
    // Respect the optimistic `list` state (updated instantly on complete/delete) so
    // an aligned task leaves the list the moment it's tapped — instead of waiting for
    // rankedForToday to refetch from the (slow) server.
    const liveById = new Map(allTasks.map((t) => [t.id, t]));
    const limit = settings.todayTaskLimit;
    // Motivation is the master gate: when drive is on the floor (1–2), a demanding task
    // (anything above pure-low load) doesn't just rank lower — it shouldn't be *shown* as
    // aligned at all (seeing it creates friction). Only gentle, low-friction tasks survive.
    const lowMotivation = ((todayCheckIn as any)?.motivation ?? 5) <= 2;
    const isDemanding = (t: any) =>
      (t.cognitiveLoad && t.cognitiveLoad !== "Low") ||
      (t.physicalLoad && t.physicalLoad !== "Low") ||
      (t.emotionalLoad && t.emotionalLoad !== "Low") ||
      t.creativeRequired || t.socialRequired;
    const filtered = rankedTasks.filter((t) => {
      if (pinnedIds.has(t.id)) return false;
      // Only trust the live list once it has loaded, so a cold/slow list load
      // doesn't briefly hide everything.
      if (tasksLoaded) {
        const live = liveById.get(t.id);
        if (!live || live.isCompleted) return false; // deleted or just-completed
        if (lowMotivation && isDemanding(live)) return false; // motivation master-gate
      } else if (lowMotivation && isDemanding(t)) {
        return false;
      }
      return true;
    });
    return limit === "unlimited" ? filtered : filtered.slice(0, Number(limit));
  }, [rankedTasks, pinnedForNow, allTasks, tasksLoaded, settings.todayTaskLimit, todayCheckIn]);

  // Alignment-with-today per task (from the scored list), so Do Now / pinned tasks
  // can show their fit even though the floor forces them to the top. Off-mode tasks
  // aren't scored today → low alignment (20 ≈ 1 dot).
  const alignmentById = useMemo(() => {
    const m = new Map<number, number>();
    (rankedTasks ?? []).forEach((t: any) => { if (typeof t.alignment === "number") m.set(t.id, t.alignment); });
    return m;
  }, [rankedTasks]);

  // Calendar
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  useEffect(() => { setReflection(savedReflection?.content ?? ""); }, [savedReflection?.content, selectedDate]);

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const todayTaskModeForGradient = todayPanchang
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const modeRgba = todayTaskModeForGradient ? MODE_RGBA[todayTaskModeForGradient] : MODE_RGBA.Build;

  // Hero gradient for selected date
  const selectedTaskModeForHero = selectedPanchang
    ? PANCHANG_TO_TASK_MODE[selectedPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const heroGradient = selectedTaskModeForHero === 'Action'
    ? 'var(--velea-action-gradient)'
    : selectedTaskModeForHero === 'Build'
    ? 'var(--velea-build-gradient)'
    : selectedTaskModeForHero === 'Selective'
    ? 'var(--velea-selective-gradient)'
    : selectedTaskModeForHero === 'Restraint'
    ? 'var(--velea-restraint-gradient)'
    : selectedPanchang
    ? `rgba(${selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba}, 0.25)`
    : 'var(--card)';
  // Angled card gradient — reads flatter/cleaner on short cards (e.g. the collapsed
  // Time Lord pill) than the tall 180deg hero gradient.
  const heroCardGradient = selectedTaskModeForHero === 'Action'
    ? 'var(--velea-action-card-gradient)'
    : selectedTaskModeForHero === 'Build'
    ? 'var(--velea-build-card-gradient)'
    : selectedTaskModeForHero === 'Selective'
    ? 'var(--velea-selective-card-gradient)'
    : selectedTaskModeForHero === 'Restraint'
    ? 'var(--velea-restraint-card-gradient)'
    : heroGradient;
  const selectedModeRgba = selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba;
  // The day card is (re)loading for the selected date — used to visibly mark the whole box as pending.
  const dayCardLoading = panchangFetching || glanceFetching;

  // Calendar card: use today's mode color for strip header + border
  const calModeColor = todayTaskMode ? MODE_SOLID[todayTaskMode] : '#888';
  const [fullSpectrum] = useFullSpectrum();

  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div
        className="container py-6 space-y-5 relative z-10"
      >
      {/* Shared app header — hero layout identical to Today page */}
      <AppHeader
        heroMode={{ qualifier: todayPanchang?.qualifier ?? null }}
      />

      {isAuthenticated && <AddToHomeScreenNote />}
      {isAuthenticated && <MeridianWhisper />}

      {/* ── HERO DAY MODE CARD — the primary read, first thing after the header ── */}
      {selectedPanchang ? (
        <div className="relative z-10">
          <div
            data-tour="today-mode"
            className="relative overflow-hidden"
            style={{
              borderRadius: '28px',
              padding: '1.75rem 1.75rem 1.5rem',
              background: heroGradient,
              minHeight: heroOpen ? '280px' : undefined,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Loading: a pulsing ring around the whole box so it's obvious the read for this date is
                on its way (not an empty/finished card). */}
            {dayCardLoading && (
              <div
                className="animate-pulse"
                aria-hidden
                style={{ position: 'absolute', inset: 0, borderRadius: '28px', border: '2px solid rgba(255,255,255,0.65)', pointerEvents: 'none', zIndex: 3 }}
              />
            )}
            {/* Header row — admin "update to the moment" (LEFT corner) + DATE label (toggles) + caret
                (RIGHT corner). The refresh lives OPPOSITE the caret with the date between them, so the
                two tap targets never crowd — reaching for one can't catch the other. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', marginBottom: '0.25rem' }}>
              {/* Premium preview (admin only): regenerate the read to this moment. */}
              {user?.role === "admin" && glanceProfileId && glanceContent && (
                <button
                  type="button"
                  onClick={updateToMoment}
                  disabled={refreshingRead}
                  title="Refresh today's reading"
                  aria-label="Refresh today's reading"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <RefreshCw size={14} className={refreshingRead ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setHeroOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.50)',
                  }}
                >
                  {selectedDate === toDateStr(today) ? "TODAY'S MODE" : `${selectedPanchang.dayOfWeek}, ${selectedPanchang.date}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setHeroOpen((v) => !v)}
                aria-label={heroOpen ? 'Collapse' : 'Expand'}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <ChevronDown
                  size={13}
                  style={{ color: 'rgba(0,0,0,0.45)', transform: heroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                />
              </button>
            </div>

            {/* GIANT MODE NAME */}
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
                fontSize: 'clamp(3.5rem, 16vw, 5rem)',
                fontWeight: 700,
                lineHeight: 1,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '-0.02em',
                marginBottom: '0.65rem',
              }}
            >
              {selectedTaskModeForHero ?? selectedPanchang.mode}
            </h2>

            {/* Qualifier — the filtered-down mode (e.g. "Cautious Selective") */}
            {(() => {
              const q = (selectedPanchang as any).qualifier as string | undefined;
              const base = selectedTaskModeForHero ?? selectedPanchang.mode;
              if (!q || q === base) return null;
              return (
                <p
                  style={{
                    fontSize: 'clamp(0.8rem, 3.4vw, 1rem)',
                    fontWeight: 400,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.82)',
                    marginTop: '-0.35rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  {q}
                </p>
              );
            })()}

            {/* The day turns — literal star switch flipped (or will flip) the mode mid-day */}
            {(selectedPanchang as any).turnsAtNote && (
              <p style={{ fontSize: 'clamp(0.72rem, 3vw, 0.85rem)', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginTop: '-0.3rem', marginBottom: '0.85rem' }}>
                {(selectedPanchang as any).turnsAtNote}
              </p>
            )}

            {/* Why this today? — opens the three-layer signpost (sky ⊗ your chart ⊗ you) */}
            <button
              type="button"
              onClick={() => setSignpostOpen(true)}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: '999px',
                padding: '0.3rem 0.8rem',
                marginBottom: '1rem',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              Why this today?
              <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', color: 'rgba(255,255,255,0.95)' }} />
            </button>

            {heroOpen && (<>
            {/* Narrative paragraph — the personalized read stands on its own; the
                templated mode instruction is intentionally omitted (redundant). */}
            {(() => {
              // Only the generated read — never fabricated/hard-coded prose. If it isn't
              // ready, show the loading shimmer; if genuinely absent, show nothing.
              const narrative = glanceContent?.narrative;
              if (!narrative) {
                return glanceFetching
                  ? <div style={{ marginBottom: '1.25rem' }}><ProseLoading label="Crafting today's reading — this can take up to a minute the first time…" /></div>
                  : null;
              }
              const paras = narrative.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
              const shown = whyOpen ? paras : paras.slice(-1);
              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  {shown.map((para, i) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: "'Inter', ui-sans-serif, sans-serif",
                        fontSize: 'clamp(0.8rem, 3.2vw, 0.875rem)',
                        lineHeight: 1.65,
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 400,
                        marginBottom: '0.65rem',
                      }}
                    >
                      <GlossaryText>{para}</GlossaryText>
                    </p>
                  ))}
                  {paras.length > 1 && (
                    <button
                      onClick={() => setWhyOpen((v) => !v)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em',
                        color: 'rgba(255,255,255,0.98)', textDecoration: 'underline',
                        textUnderlineOffset: '3px', display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      {whyOpen ? 'Hide' : 'THE FULL READ'}
                      <ChevronDown
                        size={12}
                        style={{ color: 'rgba(255,255,255,0.98)', transform: whyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                      />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Panchang mini row */}
            <div data-tour="panchang-terms" className="flex items-center gap-4 flex-wrap" style={{ marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-1.5">
                <Moon size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                {selectedPanchang.nakshatraTransitionTime && selectedPanchang.nakshatraAfterTransition ? (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                    <GlossaryLink term={selectedPanchang.nakshatraAtSunrise ?? ''}>{selectedPanchang.nakshatraAtSunrise}</GlossaryLink>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> → </span>
                    <GlossaryLink term={selectedPanchang.nakshatraAfterTransition ?? ''}>{selectedPanchang.nakshatraAfterTransition}</GlossaryLink>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> {selectedPanchang.nakshatraTransitionTime}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}><GlossaryLink term={selectedPanchang.nakshatra ?? ''}>{selectedPanchang.nakshatra}</GlossaryLink></span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>☽</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}><GlossaryLink term={selectedPanchang.moonSign ?? ''}>{selectedPanchang.moonSign}</GlossaryLink></span>
              </div>
              {selectedPanchang.sunriseLocal && (
                <div className="flex items-center gap-1.5">
                  <Sunrise size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{selectedPanchang.sunriseLocal}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>◑</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}><GlossaryLink term={(selectedPanchang.tithi ?? '').replace(/^(shukla|krishna)\s+/i, '')}>{selectedPanchang.tithi}</GlossaryLink></span>
              </div>
            </div>

            {/* Italic question — ONLY the generated one; no hard-coded per-mode fallback. */}
            {glanceContent?.question && (
            <p
              style={{
                marginTop: 'auto',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: '80ch',
                paddingTop: '1rem',
                fontFamily: "'Inter', ui-sans-serif, sans-serif",
                fontStyle: 'italic',
                fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.8)',
                textAlign: 'center',
                textWrap: 'balance',
              }}
            >
              {glanceContent.question}
            </p>
            )}

            {/* Kept Readings — at the very bottom, under the day's final question: pin this reading
                + link to the timestamped archive (gated teaser). */}
            {glanceProfileId && glanceContent?.narrative && (
              <KeptReadings profileId={glanceProfileId} date={selectedDate} />
            )}
            </>)}
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 relative z-10">
          {panchangFetching ? (
            <ProseLoading color="var(--color-muted-foreground)" label="Reading the day…" />
          ) : (
            <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>No panchang data for this date.</p>
          )}
        </div>
      )}

      {/* ── CALENDAR & REFLECTIONS (collapsed by default — low cognitive load). The toggle also
          gates Time Lord Movement + the reflection journal, so the label names them — "Calendar"
          alone hid the journal. ── */}
      <button
        onClick={() => setPlanOpen((v) => !v)}
        className="flex items-center gap-2 w-full py-2 transition-all relative z-10"
      >
        <span
          className="text-sm font-bold uppercase"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
        >
          Calendar &amp; Reflections
        </span>
        <ChevronDown
          size={13}
          style={{
            color: "var(--color-muted-foreground)",
            transform: planOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>
      {planOpen && (
        <div className="space-y-5">
      {/* ── 1. CALENDAR ── */}
      <div
        ref={calendarRef}
        className="relative z-10 overflow-hidden"
        style={{
          borderRadius: "16px",
          // Soft sliver frame — a 1px hairline at low opacity of the day-mode color (David).
          border: `1px solid color-mix(in srgb, ${calModeColor} 38%, transparent)`,
          // David's law (2026-07-11): the calendar body is ALWAYS #FDFDFD — appearance mode never
          // touches it. The coins carry all the color; the surface stays a clean light foundation.
          background: "#FDFDFD",
        }}
      >
        {/* Month header — the colored band is gone (David); month/year/arrows sit on the light
            surface as dark gray. The thin colored border around the whole calendar stays. */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded-full transition-all duration-150 active:scale-95"
            style={{ color: "#555", background: "rgba(0,0,0,0.05)" }}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-baseline gap-2">
            <h2
              style={{
                fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "#2a2a2a",
                letterSpacing: "0.01em",
              }}
            >
              {MONTHS[viewDate.getMonth()]}
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#2a2a2a",
                letterSpacing: "0.1em",
              }}
            >
              {viewDate.getFullYear()}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-1 rounded-full transition-all duration-150 active:scale-95"
            style={{ color: "#555", background: "rgba(0,0,0,0.05)" }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {/* Calendar body */}
        <div className="px-4 pt-1 pb-6">

        <div className="grid grid-cols-7 mb-3">
          {DAYS.map((d, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold tracking-wide py-1"
              style={{ color: "#9a9a9a", letterSpacing: "0.04em" }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" style={{ rowGap: "1.3rem" }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = `${yearMonth}-${String(day).padStart(2, "0")}`;
            const panchang = panchangByDate[dateStr];
            const isToday = dateStr === toDateStr(today);
            const isCrown = crownByDate.has(dateStr);
            const isGolden = goldenSet.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const modeColor = panchang ? MODE_DOT[cautionSet.has(dateStr) ? "Restraint" : panchang.mode] : undefined;
            const hasMode = !!modeColor;
            // Whole cell is tinted by the day's mode — far more legible than a tiny
            // dot, and selected/today get a stronger fill + solid border. Dark mode
            // needs more saturation: the low-alpha tints wash out on the dark bg.
            // Full Spectrum is ALWAYS a dark surface — appearance may never leak into it
            // (standing FS law). Every dark-vs-light branch below uses this, not raw theme.
            const isDark = theme === "dark" || fullSpectrum;
            // Full Spectrum paints the card gold, so the low-alpha tints composite over gold and go
            // muddy (teal→dull, rose→brown, gold→olive). Push the fill toward opaque there so each
            // day reads as its true, vibrant mode color instead of a muddied blend with the surface.
            const tintAlpha = fullSpectrum
              ? (isSelected ? 0.65 : 0.45)
              : (isSelected ? (isDark ? 0.78 : 0.55) : isToday ? (isDark ? 0.6 : 0.62) : (isDark ? 0.34 : 0.20));
            const accent = modeColor ?? "var(--color-foreground)";
            const GOLD_BRIGHT = "#F2C21C"; // saturated gold — golden-day border
            const CAUTION_RED = "#FF1F1F"; // fire-engine red — unmissable on every appearance setting (David)
            const ECLIPSE_RING = "#6E5AA6"; // muted violet — echoes the eclipse disc's cosmic indigo
            // Retrograde planets active this day → the bottom glyph strip (rendered below).
            const retroToday = retroByDate.get(dateStr);
            const stationsToday = retroToday?.filter((e) => e.state === "station-retro" || e.state === "station-direct") ?? [];
            // The calendar surface is always light now, so the retro glyphs/strip always use the
            // deep (light-bg) palette — the bright variant would wash out on white in dark/FS mode.
            const retroColor = PLANET_RETRO_COLOR.deep;
            // TODAY uses the normal theme-aware tint (a touch stronger via tintAlpha's isToday branch)
            // plus its white border + bold number — no longer force-darkened. The old dark fill existed
            // so a white Velea mark would read, but that mark was removed from today (v154); keeping the
            // dark fill made the date number always-white regardless of light/dark appearance.
            // TODAY = the mode color at FULL strength (darkening gold made it read brown);
            // the number color is contrast-picked, so gold days carry a dark number and
            // teal/green/wine days keep white.
            // David's coin model (2026-07-11): the calendar is ALWAYS light, and a coin is FILLED with
            // its day-mode color only for TODAY or the date the user presses. Every other day is an
            // OUTLINE — a ring in the day-mode color, with the number in that same color. No more white
            // today-border: today is simply the filled coin.
            const filled = (isToday || isSelected) && hasMode;
            // A FILLED coin's number is a very dark TONAL version of the day-mode color — more elegant
            // than flat white (David), and it lets the fill stay bright (esp. Build's gold). An OUTLINE
            // coin's number is the mode color itself, on white.
            const darkInk = darkenOklch(accent, 0.5);
            const numberColor = filled ? darkInk : hasMode ? accent : "var(--color-muted-foreground)";
            const restingBg = filled ? accent : "transparent";
            const hoverBg = hasMode ? accent : "var(--color-secondary)";
            const pressBg = hasMode ? darkenOklch(accent, 0.85) : "var(--color-border)";

            return (
              <button
                key={dateStr}
                onClick={(e) => {
                  // Anchor the calendar so the hero-card re-render above doesn't jump the screen.
                  scrollAnchorRef.current = calendarRef.current?.getBoundingClientRect().top ?? null;
                  setSelectedDate(dateStr);
                  // Crown days AND golden days pop a bubble; tapping the open day (or a plain day) closes it.
                  const isCaution = cautionSet.has(dateStr);
                  const isEclipseDay = eclipseByDate.has(dateStr);
                  const isRetroDay = retroByDate.has(dateStr);
                  if (crownTip?.date === dateStr || (!isCrown && !isGolden && !isCaution && !isEclipseDay && !isRetroDay)) { setCrownTip(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  const kind = isCrown ? "crown" : isGolden ? "golden" : isCaution ? "caution" : isEclipseDay ? "eclipse" : "retro";
                  let why = isCrown ? (crownByDate.get(dateStr) ?? "") : isCaution && !isGolden ? (cautionByDate.get(dateStr) ?? "") : "";
                  if (kind === "eclipse") why = eclipseByDate.get(dateStr) ?? "";
                  setCrownTip({ date: dateStr, kind: kind as any, why, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, accent: kind === "caution" ? CAUTION_RED : accent });
                }}
                className="flex flex-col items-center transition-all duration-150"
                style={{ width: "100%", gap: "0.2rem" }}
              >
                {/* The round date coin. */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    aspectRatio: "1 / 1",
                    width: "100%",
                    maxWidth: "2rem",
                    borderRadius: 999,
                    transition: "background 150ms",
                    color: numberColor,
                    background: restingBg,
                    // David 2026-07-11: day-mode rings REMOVED. A regular day is just its colored
                    // number (or, for today / the pressed day, a filled coin). A ring survives ONLY on
                    // the days that earn one: caution (red), knot/crown (gold), golden (gold), and
                    // station (the day-mode color, around the planet glyph).
                    border: cautionSet.has(dateStr)
                      ? `2px solid ${CAUTION_RED}`
                      : eclipseByDate.has(dateStr)
                      ? `2px solid ${ECLIPSE_RING}`
                      : isCrown
                      ? `2px solid ${GOLD_BRIGHT}`
                      : isGolden
                      ? `2px solid ${GOLD_BRIGHT}`
                      : stationsToday.length
                      ? `1.5px solid ${accent}`
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = darkInk; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = restingBg; e.currentTarget.style.color = numberColor; }}
                  onMouseDown={(e) => { e.currentTarget.style.background = pressBg; if (hasMode) e.currentTarget.style.color = darkInk; }}
                  onMouseUp={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = darkInk; }}
                >
                  {isCrown ? (
                    // The knot mark — the OUTLINE gold octagram (with its centre bindu), sized to
                    // fill the coin. The day is the mark.
                    <OctagramMark size={28} color={GOLD_BRIGHT} strokeWidth={1.6} style={{ filter: "drop-shadow(0 0 4px rgba(242,194,28,0.6))", pointerEvents: "none" }} />
                  ) : eclipseByDate.has(dateStr) ? (
                    // Eclipse day: the dark gold-rimmed disc IN PLACE of the number — the day is the mark.
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: "#160f26", border: "1.5px solid #F2C21C", boxShadow: "0 0 6px rgba(242,194,28,0.55)", pointerEvents: "none", display: "inline-block" }} />
                  ) : stationsToday.length ? (
                    // Station day: the turning planet's glyph replaces the number, in the DAY-MODE
                    // color — same as the ring (David). Grid place-centers the em-box; the symbol
                    // font's ink sits above its own baseline, so a small translateY drops it to the
                    // optical centre of the ring. (Tune the em value if it reads high/low.)
                    <span style={{ display: "grid", gridAutoFlow: "column", gap: 2, placeItems: "center", width: "100%", height: "100%", lineHeight: 1, pointerEvents: "none" }}>
                      {stationsToday.map((e) => (
                        <span key={e.planet} style={{
                          fontFamily: PLANET_GLYPH_FONT,
                          fontSize: stationsToday.length > 1 ? "1.3rem" : "1.75rem",
                          fontWeight: 800,
                          lineHeight: 1,
                          color: accent,
                          transform: "translateY(0.09em)",
                        }}>{PLANET_GLYPH[e.planet]}</span>
                      ))}
                    </span>
                  ) : (
                    <span style={{ color: "inherit", fontWeight: filled ? 700 : 600, fontSize: "1rem" }}>
                      {day}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* (Annual reminder line removed — the Time Lord Movement section below renders it in full.) */}
      </div>{/* end calendar body */}
      </div>{/* end calendar card */}

      {/* Crown-day popup — PORTALED to document.body so it is never a descendant of the
          overflow:hidden calendar card (the ROOT cause of the clipping). Anchored to the
          tapped cell via a captured viewport rect, clamped to the screen, flipped above/
          below by viewport half. Cannot be clipped on any row / month / screen. */}
      {crownTip && createPortal((() => {
        const W = 220;
        const left = Math.max(8, Math.min(crownTip.cx - W / 2, window.innerWidth - W - 8));
        const above = crownTip.top > window.innerHeight * 0.5;
        const vpos = above
          ? { bottom: Math.round(window.innerHeight - crownTip.top + 10) }
          : { top: Math.round(crownTip.bottom + 10) };
        const accent = crownTip.accent;
        const caretLeft = Math.max(14, Math.min(crownTip.cx - left, W - 14));
        return (
          <div
            data-crowntip
            style={{
              position: "fixed", left, width: W, ...vpos, zIndex: 81, textAlign: "left",
              background: `color-mix(in srgb, ${accent} 22%, var(--color-card))`,
              border: `2px solid ${accent}`, borderRadius: "var(--radius-card)",
              padding: "0.7rem 0.8rem", fontSize: "0.74rem", lineHeight: 1.45, color: "var(--color-foreground)",
              fontWeight: 400, boxShadow: `0 12px 34px rgba(0,0,0,0.4), 0 0 0 4px color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
          >
            {/* Speech-bubble caret in the day's mode color, pointing back at the tapped day */}
            <span style={{
              position: "absolute", left: caretLeft, width: 0, height: 0, transform: "translateX(-50%)",
              borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
              ...(above ? { bottom: -8, borderTop: `8px solid ${accent}` } : { top: -8, borderBottom: `8px solid ${accent}` }),
            }} />
            {crownTip.kind === "crown" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#F2C21C", boxShadow: "0 0 5px rgba(242,194,28,0.75)", display: "inline-block" }} /> Knot Day
                </span>
                These are days when the universal sky and your chart line up with unusual force. What arrives may look like a gift or a rupture &mdash; but it carries weight, and it moves you where you&rsquo;re meant to go.
                {goldenSet.has(crownTip.date) && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    Also a golden day &mdash; your knot is the apex of a bright shared sky.
                  </span>
                )}
                {crownTip.why && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    {crownTip.why}
                  </span>
                )}
              </>
            ) : crownTip.kind === "golden" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                  <VeleaLorMark size={14} color="#C9A84C" /> Golden day
                </span>
                A bright day in the shared sky &mdash; favorable for everyone.
              </>
            ) : crownTip.kind === "eclipse" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: "#160f26", border: "1.5px solid #F2C21C", display: "inline-block" }} /> {crownTip.why === "solar" ? "Solar" : "Lunar"} eclipse
                </span>
                The light breaks its own rules today &mdash; a volatile sky. Watch, don&rsquo;t launch; what surfaces is information.
              </>
            ) : crownTip.kind === "retro" ? (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.35rem" }}>
                  Retrograde sky
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {(retroByDate.get(crownTip.date) ?? []).map((e) => {
                    const col = (theme === "dark" || fullSpectrum) ? PLANET_RETRO_COLOR.bright[e.planet] : PLANET_RETRO_COLOR.deep[e.planet];
                    return (
                      <span key={e.planet} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ color: col, fontFamily: PLANET_GLYPH_FONT, fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>{PLANET_GLYPH[e.planet]}</span>
                        <span><b style={{ color: col }}>{e.planet}</b> {e.detail}.</span>
                      </span>
                    );
                  })}
                </span>
              </>
            ) : (
              <>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#FF1F1F", marginBottom: "0.25rem" }}>
                  Unaligned day
                </span>
                The sky pulls against your chart today &mdash; contain, don&rsquo;t begin. Nothing forward, nothing new.
                {crownTip.why && (
                  <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                    {crownTip.why}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })(), document.body)}

      {/* (The per-date "Due this day" list was removed — the always-visible Due orb + its sheet are
          the single due surface now, instead of a second one hidden inside the collapsed Calendar.) */}

      {/* (Current Time Lord Movement removed from Today — it lives on the Chart page.) */}

      {/* Reflections — recorder collapsed by default (no big empty box until you choose to write). */}
      {isAuthenticated && (
        <div className="relative z-10">
          <button
            onClick={() => setReflectionOpen((v) => !v)}
            className="flex items-center gap-2 mb-2 w-full"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
          >
            <BookOpen size={12} style={{ color: "var(--color-muted-foreground)" }} />
            <p
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              What happened on {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}?
            </p>
            <ChevronDown size={13} style={{ marginLeft: "auto", flexShrink: 0, color: "var(--color-muted-foreground)", transform: reflectionOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
          </button>
          {reflectionOpen && (
          <div className="glass-card p-3">
            <textarea
              className="w-full bg-transparent text-sm resize-none outline-none leading-relaxed"
              style={{ color: "var(--color-foreground)", minHeight: "80px", caretColor: "var(--foreground)" }}
              placeholder="Write a reflection for this day…"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              {saveReflection.isError && (
                <p className="text-xs" style={{ color: "oklch(0.70 0.15 25)" }}>Failed to save. Try again.</p>
              )}
              <div className="ml-auto">
                <button
                  onClick={() => saveReflection.mutate(
                    { date: selectedDate, content: reflection },
                    { onError: () => {} }
                  )}
                  disabled={saveReflection.isPending || reflection === (savedReflection?.content ?? "")}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    letterSpacing: "0.02em",
                    background: reflectionSaved ? "var(--secondary)" : "var(--input)",
                    color: "var(--foreground)",
                    border: `1px solid var(--border)`,
                  }}
                >
                  {saveReflection.isPending ? "Saving…" : reflectionSaved ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

        {/* View reflection log — bottom of Plan ahead */}
        {isAuthenticated && (
          <button
            onClick={() => navigate("/reflections")}
            className="flex items-center gap-2 w-full py-2 transition-opacity hover:opacity-70"
          >
            <BookOpen size={14} style={{ color: "var(--color-muted-foreground)" }} />
            <span
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              View reflection log
            </span>
          </button>
        )}

        </div>
      )}

      {/* Time Master / Hora — the moment tiles, moved BELOW Calendar & Reflections so the calendar
          and reflections sit directly under the day card (David 2026-07-11). */}
      {isAuthenticated && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
          <MasterModeCard />
          <HoraCard />
        </div>
      )}

      {/* ── MODE ORBS (reflect TODAY) ── */}
      {isAuthenticated && (
        <div className="relative z-10">
          <button
            onClick={() => setAllTasksOpen((v) => !v)}
            className="flex items-center gap-2 mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              All Tasks{settings.showOrbCounts ? ` (${allTasks.filter((t) => !t.isCompleted).length})` : ""}
            </h3>
            <ChevronDown
              size={13}
              style={{ color: "var(--color-muted-foreground)", transform: allTasksOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>
          <div className="flex justify-around items-end" data-tour="mode-orbs">
            {(["Restraint", "Build", "Selective", "Action"] as TaskMode[]).map((m) => (
              <ModeOrb
                key={m}
                mode={m}
                count={orbModeCounts[m] ?? 0}
                active={todayTaskMode === m}
                showCount={settings.showOrbCounts}
                onClick={() => {
                  const count = orbModeCounts[m] ?? 0;
                  if (count === 0) {
                    setQuickAddMode(m);
                  } else {
                    setOrbSheetMode(m);
                  }
                }}
              />
            ))}
            {/* (Due orb retired — due tasks now auto-populate the To Do list below.) */}
          </div>

          {/* All-tasks accordion — collapsible groups by mode (the old Planner view) */}
          {allTasksOpen && (
            <div className="mt-4 space-y-2">
              {(["Restraint", "Build", "Selective", "Action"] as TaskMode[]).map((m) => {
                // Snoozed tasks are INCLUDED here (unlike the ranked "today" list) so the
                // expanded All-Tasks view is the full picture — they sink to the bottom of
                // their mode group and render dimmed.
                const groupTasks = allTasks
                  .filter((t) => t.mode === m && !t.isCompleted)
                  .sort((a, b) => {
                    const sa = a.snoozedUntil && a.snoozedUntil > Date.now() ? 1 : 0;
                    const sb = b.snoozedUntil && b.snoozedUntil > Date.now() ? 1 : 0;
                    return sa - sb;
                  });
                const open = openModeGroups.has(m);
                const groupColor = PLANNER_MODE_OKLCH[m];
                return (
                  <div key={m} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                    <button
                      onClick={() =>
                        setOpenModeGroups((cur) => {
                          const n = new Set(cur);
                          n.has(m) ? n.delete(m) : n.add(m);
                          return n;
                        })
                      }
                      className="w-full flex items-center justify-between px-3 py-2.5"
                      style={{ background: "var(--color-secondary)" }}
                    >
                      <span className="text-xs font-bold uppercase" style={{ color: groupColor, letterSpacing: "0.04em" }}>
                        {m} {settings.showOrbCounts && <span style={{ color: "var(--color-muted-foreground)" }}>({groupTasks.length})</span>}
                      </span>
                      <ChevronDown
                        size={13}
                        style={{ color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                      />
                    </button>
                    {open &&
                      (groupTasks.length === 0 ? (
                        <p className="text-xs px-3 py-3" style={{ color: "var(--color-muted-foreground)" }}>No {m} tasks.</p>
                      ) : (
                        <div className="p-2 space-y-2">
                          {groupTasks.map((task) => {
                            const snoozed = !!(task.snoozedUntil && task.snoozedUntil > Date.now());
                            return (
                            <div key={task.id} style={snoozed ? { opacity: 0.55 } : undefined}>
                            <SwipeableTaskRow
                              onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                              onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                              isCompleted={task.isCompleted}
                              isPinned={task.isPinned}
                              modeColor={groupColor}
                            >
                              <TaskItem
                                task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                                onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                                onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                                onDelete={() => deleteMutation.mutate({ id: task.id })}
                                onEdit={(t: Task) => handleEdit(t)}
                                dayMode={todayTaskMode}
                              />
                            </SwipeableTaskRow>
                            </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pinned for Now — explicit user pins (ported from the retired Today page) */}
      {isAuthenticated && (
        <div className="relative z-10">
          <button
            onClick={() => setPinnedOpen((v) => !v)}
            className="flex items-center gap-2 w-full mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              To Do
            </h3>
            <ChevronDown
              size={13}
              style={{ color: "var(--color-muted-foreground)", transform: pinnedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>

          {pinnedOpen && (pinnedForNow.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}
            >
              <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>Nothing pinned yet.</p>
              <p className="text-sm mt-1.5" style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: 1.55 }}>
                This list is entirely yours — pin any task (tap the 📌) to keep it right here, in focus. Velea suggests; you decide.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedForNow.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => handleEdit(t)}
                    dayMode={todayTaskMode}
                    alignment={alignmentById.get(task.id) ?? 20}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Aligned for Today — system-ranked suggestions (ported from the retired Today page) */}
      {isAuthenticated && !!todayTaskMode && (
        <div className="relative z-10">
          <button
            onClick={() => setAlignedOpen((v) => !v)}
            className="flex items-center gap-2 w-full mb-3"
          >
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              Aligned for today
            </h3>
            <ChevronDown
              size={13}
              style={{ color: "var(--color-muted-foreground)", transform: alignedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
            />
          </button>

          {alignedOpen && (restGate.tripped ? (
            <div
              className="p-4 rounded-lg"
              style={{ background: `color-mix(in srgb, ${REST_TEAL} 12%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${REST_TEAL} 34%, transparent)` }}
            >
              <p className="text-sm font-bold" style={{ color: REST_TEAL, marginBottom: "0.3rem" }}>Restore today.</p>
              <p className="text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.55 }}>
                {restGate.reason} The aligned move today isn't a task — it's rest. Water, air, a little quiet; come back when there's more in the tank.
              </p>
              {alignedForToday.length > 0 && (!restOptIn ? (
                <button
                  onClick={() => setRestOptIn(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: `color-mix(in srgb, ${REST_TEAL} 16%, transparent)`, color: REST_TEAL, border: `1px solid color-mix(in srgb, ${REST_TEAL} 40%, transparent)`, fontSize: "0.8rem", fontWeight: 700 }}
                >
                  Show me one small thing
                </button>
              ) : (
                <div className="mt-3">
                  <SwipeableTaskRow
                    onSwipeLeft={() => updateMutation.mutate({ id: alignedForToday[0].id, isCompleted: !alignedForToday[0].isCompleted })}
                    onSwipeRight={() => deleteMutation.mutate({ id: alignedForToday[0].id })} rightMode="delete"
                    isCompleted={alignedForToday[0].isCompleted}
                    isPinned={alignedForToday[0].isPinned}
                    modeColor={REST_TEAL}
                  >
                    <TaskItem
                      task={alignedForToday[0] as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                      onToggleComplete={() => updateMutation.mutate({ id: alignedForToday[0].id, isCompleted: !alignedForToday[0].isCompleted })}
                      onTogglePin={() => updateMutation.mutate({ id: alignedForToday[0].id, isPinned: !alignedForToday[0].isPinned })}
                      onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                      onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                      onDelete={() => deleteMutation.mutate({ id: alignedForToday[0].id })}
                      onEdit={(t: Task) => handleEdit(t)}
                      dayMode={todayTaskMode}
                      alignment={(alignedForToday[0] as any).alignment ?? alignmentById.get(alignedForToday[0].id)}
                      compact
                    />
                  </SwipeableTaskRow>
                </div>
              ))}
            </div>
          ) : alignedForToday.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm">No suggestions for today's mode.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Add tasks tagged {todayTaskMode} to see recommendations here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alignedForToday.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => deleteMutation.mutate({ id: task.id })} rightMode="delete"
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onCyclePriority={(id, next) => updateMutation.mutate({ id, priority: next })}
                    onSetIntent={(id, next) => updateMutation.mutate({ id, intent: next })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => handleEdit(t)}
                    dayMode={todayTaskMode}
                    alignment={(task as any).alignment ?? alignmentById.get(task.id)}
                    compact
                  />
                  {/* The reasoning lives behind an obvious "Why now?" — the card stays clean */}
                  {(((task as any).reasons?.length > 0) || ((task as any).layerBubbles?.length > 0)) && (
                    <button
                      onClick={() => setWhyNowTask(task)}
                      className="mx-3 mb-2 mt-0.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${todayModeColor} 14%, var(--color-card))`, color: todayModeColor, border: `1px solid color-mix(in srgb, ${todayModeColor} 34%, transparent)`, fontSize: "0.8rem", fontWeight: 700 }}
                    >
                      Why now? →
                    </button>
                  )}
                </SwipeableTaskRow>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── COMPLETED (moved below the Planner section, per request) ── */}
      {isAuthenticated && (() => {
        const completed = allTasks.filter((t) => t.isCompleted);
        return (
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCompletedOpen((v) => !v)} className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
                  Completed{settings.showOrbCounts || completed.length > 0 ? ` (${completed.length})` : ""}
                </h3>
                <ChevronDown
                  size={13}
                  style={{ color: "var(--color-muted-foreground)", transform: completedOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                />
              </button>
              {completed.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Permanently delete ${completed.length} completed task${completed.length > 1 ? "s" : ""}? This can't be undone.`)) {
                      purgeCompleted.mutate();
                    }
                  }}
                  disabled={purgeCompleted.isPending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-50"
                  style={{ color: "#c0504d", border: "1px solid var(--color-border)" }}
                >
                  {purgeCompleted.isPending ? "Clearing…" : "Clear all"}
                </button>
              )}
            </div>

            {completedOpen && (completed.length === 0 ? (
              <div className="p-4 text-center rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--input)", border: "1px solid var(--border)" }}>
                <p className="text-sm">No completed tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completed.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    onSwipeLeft={() => deleteMutation.mutate({ id: task.id })}
                    onSwipeRight={() => updateMutation.mutate({ id: task.id, isCompleted: false })}
                    isCompleted={task.isCompleted}
                    isPinned={task.isPinned}
                    modeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                  >
                    <TaskItem
                      task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                      onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned })}
                      onDelete={() => deleteMutation.mutate({ id: task.id })}
                      onEdit={(t: Task) => handleEdit(t)}
                      dayMode={todayTaskMode}
                    />
                  </SwipeableTaskRow>
                ))}
              </div>
            ))}
          </div>
        );
      })()}


      {/* Mode Orb Sheet */}
      {orbSheetMode && (
        <ModeOrbSheet
          mode={orbSheetMode}
          open={!!orbSheetMode}
          onClose={() => setOrbSheetMode(null)}
        />
      )}

      {/* Quick Add Sheet (mode-orb shortcut) — preselect the orb's mode you tapped, so adding from
          the Restraint orb starts the task in Restraint (was silently defaulting to Build). */}
      {quickAddMode && (
        <AddTaskSheet
          open={!!quickAddMode}
          onClose={() => setQuickAddMode(null)}
          initialMode={quickAddMode}
          editTask={undefined}
        />
      )}

      {/* (Pinned + Aligned edits now route through handleEdit → the single Add/Edit sheet below.) */}

      {/* Why-now pop-up for an aligned task */}
      <WhyNowSheet task={whyNowTask} modeColor={todayModeColor} onClose={() => setWhyNowTask(null)} />

      {/* Due Orb Sheet */}

      {/* Why-this-today Signpost Sheet */}
      <SignpostSheet open={signpostOpen} onClose={() => setSignpostOpen(false)} mode={selectedTaskModeForHero ?? undefined} />

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null); }}
        editTask={editTask ? toSheetTask(editTask) : undefined}
      />


      </div>
    </div>
  );
}
