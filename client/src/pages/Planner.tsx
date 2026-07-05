import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { fireTaskGuide, hasSeenTaskGuide } from "@/components/Onboarding";
import ProseLoading from "@/components/ProseLoading";
import { ChevronLeft, ChevronRight, BookOpen, Plus, ChevronDown, Pin, Moon, Sunrise, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useFullSpectrum } from "@/hooks/useFullSpectrum";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ModeTag from "@/components/ModeTag";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";
import ModeOrb from "@/components/ModeOrb";
import ModeOrbSheet from "@/components/ModeOrbSheet";
import SignpostSheet from "@/components/SignpostSheet";
import DueOrbSheet from "@/components/DueOrbSheet";
import { useSettingsContext } from "@/contexts/SettingsContext";

import { PANCHANG_TO_TASK_MODE, PRIORITY_EXCLAIM, MODE_OKLCH, MODE_TINT, MODE_CARD_BG, MODE_CARD_GRADIENT, MODE_SOLID, MODE_DARK, MODE_RGBA } from "../../../shared/types";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import type { Task } from "../../../drizzle/schema";
import AppHeader from "@/components/AppHeader";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import GlossaryText from "@/components/GlossaryText";
import { GlossaryLink } from "@/components/GlossaryPopover";
import WhyNowSheet from "@/components/WhyNowSheet";
import { createPortal } from "react-dom";
import AddToHomeScreenNote from "@/components/AddToHomeScreenNote";
import MasterModeCard from "@/components/MasterModeCard";
import HoraCard from "@/components/HoraCard";
import MeridianWhisper from "@/components/MeridianWhisper";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Planetary glyphs for the Time Lord (Sun's is the circle-dot, its alchemical symbol).
const PLANET_GLYPH: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};
const GLYPH_FONT = "'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols2',serif";

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MODE_DOT: Record<string, string> = {
  Action:     "oklch(0.70 0.18 150)",  // clearer green
  Build:      "oklch(0.80 0.15 92)",
  Restraint:  "oklch(0.65 0.12 15)",
  Selective:  "oklch(0.66 0.13 230)",  // bluer teal, distinct from green
  Flex:       "oklch(0.72 0.10 280)",
  Activate:   "oklch(0.70 0.18 150)",
  ACTION:     "oklch(0.70 0.18 150)",
  BUILD:      "oklch(0.80 0.15 92)",
  RESTRAINT:  "oklch(0.65 0.12 15)",
  "SELECTIVE ACTION": "oklch(0.66 0.13 230)",
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
const DAY_MODE_DEFS: { mode: TaskMode; essence: string; bestFor: string[]; avoid: string[] }[] = [
  {
    mode: "Action",
    essence: "Visible movement. The day favors initiating, publishing, reaching out, and making decisions.",
    bestFor: ["Publishing or launching", "Outreach and first contact", "Making decisions", "Starting something new"],
    avoid: ["Endless prep", "Waiting for perfect conditions", "Second-guessing"],
  },
  {
    mode: "Build",
    essence: "Preparation and systems. The day favors strengthening the container — drafting, editing, and setup — over going public.",
    bestFor: ["Drafting and editing", "Setup and organizing", "Planning and research", "Fixing what's broken"],
    avoid: ["Launching or big public asks", "Forcing visibility", "Cold outreach"],
  },
  {
    mode: "Selective",
    essence: "Advance, don't initiate. The day favors moving existing threads forward — warm leads, live conversations, follow-ups — not brand-new fronts.",
    bestFor: ["Following up on warm leads", "Active conversations", "Advancing work in motion", "Finishing one thing"],
    avoid: ["Cold starts", "Opening many new fronts", "Broad untargeted outreach"],
  },
  {
    mode: "Restraint",
    essence: "Contain and stabilize. The day favors repair, rest, and reducing exposure — finish rather than start, and don't force outcomes.",
    bestFor: ["Repair and cleanup", "Resting and recovering", "Finishing rather than starting", "Quiet behind-the-scenes work"],
    avoid: ["Launching or going public", "Confrontation or high-stakes asks", "Forcing outcomes"],
  },
];

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

  // Task list state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // Edit sheets for the curated daily lists (ported from the retired Today page)
  const [editPinnedTask, setEditPinnedTask] = useState<Task | null>(null);
  const [editAlignedTask, setEditAlignedTask] = useState<Task | null>(null);
  const [heroOpen, setHeroOpen] = useState(true);
  const [signpostOpen, setSignpostOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // Orb sheets reflect TODAY (not the calendar-selected date).
  const [orbSheetMode, setOrbSheetMode] = useState<TaskMode | null>(null);
  const [quickAddMode, setQuickAddMode] = useState<TaskMode | null>(null);
  const [dueSheetOpen, setDueSheetOpen] = useState(false);
  // "Plan ahead" planning tools are collapsed by default — today-first.
  const [planOpen, setPlanOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [alignedOpen, setAlignedOpen] = useState(true);
  const [whyNowTask, setWhyNowTask] = useState<any>(null); // the aligned task whose "Why now?" pop-up is open
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [openModeGroups, setOpenModeGroups] = useState<Set<string>>(new Set());
  const [completedOpen, setCompletedOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [openModeDef, setOpenModeDef] = useState<string | null>(null);

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
  const crownByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of (crownData?.days ?? []) as any[]) if (d.rating === "crown") m.set(d.date, d.why ?? "");
    return m;
  }, [crownData]);
  // Golden days — the COLLECTIVE potential (panchang day-quality, no chart needed), brought
  // back as a golden BORDER on the calendar. Crown days = a golden day + the crown badge on top.
  const { data: goldenData } = trpc.sky.goldenDays.useQuery(
    { yearMonth: `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}` },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );
  const goldenSet = useMemo(() => new Set<string>((goldenData?.potential ?? []) as string[]), [goldenData]);
  // Tapped crown day's popup — stores the cell's viewport anchor so the popup can render
  // fixed-to-viewport (never clipped by the calendar card's overflow).
  const [crownTip, setCrownTip] = useState<{ date: string; why: string; cx: number; top: number; bottom: number } | null>(null);
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
      personalEnergy: settings.personalEnergy,
      todayHouse: todayPanchang?.houseActivated ?? undefined,
      verdictShapesRanking: settings.verdictShapesRanking,
      meridianLift: settings.meridianLift,
    },
    { enabled: isAuthenticated && !!todayTaskMode }
  );
  const { data: savedReflection } = trpc.reflections.get.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );
  const { data: timeLordData } = trpc.panchang.timeLordInfluence.useQuery(
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

  // "Update to the moment" — the daily read is stable, this regenerates it hora-aware
  // right now (server never writes it to the daily cache). Each tap is a fresh Sonnet
  // call, so the button is admin-gated in the UI: a preview of a premium Master Mode /
  // Time Master upsell. Push the result straight into the on-screen query; don't
  // invalidate, so the stable daily read returns on the next natural load.
  const [refreshingRead, setRefreshingRead] = useState(false);
  const updateToMoment = async () => {
    if (!glanceProfileId) return;
    setRefreshingRead(true);
    try {
      const res = await utils.narrative.glance.fetch({ profileId: glanceProfileId, date: selectedDate, refresh: true, nowMs: Date.now() });
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

  const dueTasks = useMemo(() => {
    const now = Date.now();
    return allTasks.filter((t) => t.dueDate === selectedDate && !t.isCompleted && (!t.snoozedUntil || t.snoozedUntil <= now));
  }, [allTasks, selectedDate]);

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

  const orbDueCount = useMemo(() => {
    const now = Date.now();
    return allTasks.filter((t) => t.dueDate && !t.isCompleted && (!t.snoozedUntil || t.snoozedUntil <= now)).length;
  }, [allTasks]);

  // Priority sort order (title-case to match DB enum)
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  // Today's mode color for the curated daily lists (ported from Home).
  const todayModeColor = todayTaskMode ? MODE_OKLCH[todayTaskMode] : "var(--color-border)";

  // Pinned for Now: explicitly pinned, not completed, sorted by priority.
  const pinnedForNow = useMemo(() => {
    const now = Date.now();
    return allTasks
      .filter((t) =>
        t.isPinned &&
        !t.isCompleted &&
        (!t.snoozedUntil || t.snoozedUntil <= now)
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
    const filtered = rankedTasks.filter((t) => {
      if (pinnedIds.has(t.id)) return false;
      // Only trust the live list once it has loaded, so a cold/slow list load
      // doesn't briefly hide everything.
      if (tasksLoaded) {
        const live = liveById.get(t.id);
        if (!live || live.isCompleted) return false; // deleted or just-completed
      }
      return true;
    });
    return limit === "unlimited" ? filtered : filtered.slice(0, Number(limit));
  }, [rankedTasks, pinnedForNow, allTasks, tasksLoaded, settings.todayTaskLimit]);

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
  const selectedModeColor = selectedTaskModeForHero ? MODE_OKLCH[selectedTaskModeForHero] : 'var(--color-border)';
  const selectedModeRgba = selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba;

  // Calendar card: use today's mode color for strip header + border
  const calModeColor = todayTaskMode ? MODE_SOLID[todayTaskMode] : '#888';
  const [fullSpectrum] = useFullSpectrum();

  return (
    <div className="min-h-screen w-full relative">
      {/* Soft ombré in today's day-mode color, from the left — ONLY in Full Spectrum. In normal
          light/dark mode it read as a light leak, so it's gated off there. Low, dark-value wash. */}
      {fullSpectrum && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background:
              `linear-gradient(100deg, color-mix(in srgb, ${calModeColor} 26%, transparent) 0%, color-mix(in srgb, ${calModeColor} 9%, transparent) 34%, transparent 62%)`,
          }}
        />
      )}
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
      {/* Time Master + Hora as two compact tiles, side by side (private/admin). */}
      {isAuthenticated && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start", marginBottom: "1.5rem" }}>
          <MasterModeCard />
          <HoraCard />
        </div>
      )}

      {/* ── WHAT ARE DAY MODES? — a small link that opens a pop-up (was a big card at the top) ── */}
      {isAuthenticated && modesOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "var(--dialog-overlay)" }} onClick={() => setModesOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 20, padding: "1.3rem", maxHeight: "82vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "0.7rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: todayModeColor }}>What are day modes?</span>
              <button onClick={() => setModesOpen(false)} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: "var(--color-secondary)", color: "var(--color-foreground)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            </div>
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.5, marginBottom: "0.35rem" }}>
                A day mode is Velea's read of what today's sky favors — the kind of work that flows with the day instead of against it. The Moon moving through your chart sets it. Here's what each of the four means and which tasks fit.
              </p>
              {DAY_MODE_DEFS.map(({ mode, essence, bestFor, avoid }) => {
                const color = PLANNER_MODE_OKLCH[mode];
                const open = openModeDef === mode;
                return (
                  <div key={mode} style={{ borderRadius: "14px", border: "1px solid var(--color-border)", background: "var(--color-card)", overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenModeDef(open ? null : mode)}
                      className="w-full flex items-center justify-between"
                      style={{ padding: "0.8rem 1rem" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <span style={{ width: 9, height: 9, borderRadius: 999, background: color, flexShrink: 0 }} />
                        <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{mode}</span>
                      </span>
                      <ChevronDown
                        size={14}
                        style={{ color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                      />
                    </button>
                    {open && (
                      <div style={{ padding: "0 1rem 1rem" }}>
                        <p className="text-sm" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.55, marginBottom: "0.85rem" }}>
                          {essence}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-bold uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color, marginBottom: "0.4rem" }}>Best for</p>
                            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              {bestFor.map((t) => (
                                <li key={t} className="text-xs" style={{ color: "var(--foreground)", lineHeight: 1.4 }}>{t}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--color-muted-foreground)", marginBottom: "0.4rem" }}>Ease off</p>
                            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              {avoid.map((t) => (
                                <li key={t} className="text-xs" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Small link to open the day-modes pop-up (replaces the big card that used to sit here) */}
      {isAuthenticated && (
        <button
          onClick={() => setModesOpen(true)}
          className="relative z-10 mb-2 inline-flex items-center gap-1"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", color: todayModeColor, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.82 }}
        >
          What are day modes? <span aria-hidden style={{ fontSize: "0.85rem", opacity: 0.9 }}>ⓘ</span>
        </button>
      )}

      {/* ── 3. HERO DAY MODE CARD ── */}
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
            {/* Header row — DATE label (toggles) + admin "update to the moment" + caret */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                {/* Premium preview (admin only): regenerate the read to this moment. */}
                {user?.role === "admin" && glanceProfileId && glanceContent && (
                  <button
                    type="button"
                    onClick={updateToMoment}
                    disabled={refreshingRead}
                    title="Update to the moment"
                    aria-label="Update to the moment"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center' }}
                  >
                    <RefreshCw size={14} className={refreshingRead ? 'animate-spin' : ''} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHeroOpen((v) => !v)}
                  aria-label={heroOpen ? 'Collapse' : 'Expand'}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronDown
                    size={13}
                    style={{ color: 'rgba(0,0,0,0.45)', transform: heroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                  />
                </button>
              </div>
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
                  ? <div style={{ marginBottom: '1.25rem' }}><ProseLoading /></div>
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

      {/* ── CALENDAR (collapsed by default — low cognitive load) ── */}
      <button
        onClick={() => setPlanOpen((v) => !v)}
        className="flex items-center gap-2 w-full py-2 transition-all relative z-10"
      >
        <span
          className="text-sm font-bold uppercase"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
        >
          Calendar
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
        className="relative z-10 overflow-hidden"
        style={{
          borderRadius: "16px",
          border: `2px solid ${calModeColor}`,
          background: "var(--color-card)",
        }}
      >
        {/* Colored strip header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: calModeColor }}
        >
          <button
            onClick={prevMonth}
            className="p-1 rounded-full transition-all duration-150 active:scale-95"
            style={{ color: "white", background: "rgba(255,255,255,0.18)" }}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-baseline gap-2">
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
                fontSize: "1rem",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.04em",
              }}
            >
              {MONTHS[viewDate.getMonth()]}
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.1em",
              }}
            >
              {viewDate.getFullYear()}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-1 rounded-full transition-all duration-150 active:scale-95"
            style={{ color: "white", background: "rgba(255,255,255,0.18)" }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {/* Calendar body */}
        <div className="p-4">

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold tracking-wide py-1"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = `${yearMonth}-${String(day).padStart(2, "0")}`;
            const panchang = panchangByDate[dateStr];
            const isToday = dateStr === toDateStr(today);
            const isCrown = crownByDate.has(dateStr);
            const isGolden = goldenSet.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const modeColor = panchang ? MODE_DOT[panchang.mode] : undefined;
            const hasMode = !!modeColor;
            // Whole cell is tinted by the day's mode — far more legible than a tiny
            // dot, and selected/today get a stronger fill + solid border. Dark mode
            // needs more saturation: the low-alpha tints wash out on the dark bg.
            const isDark = theme === "dark";
            // Full Spectrum paints the card gold, so the low-alpha tints composite over gold and go
            // muddy (teal→dull, rose→brown, gold→olive). Push the fill toward opaque there so each
            // day reads as its true, vibrant mode color instead of a muddied blend with the surface.
            const tintAlpha = fullSpectrum
              ? (isSelected ? 0.65 : 0.50)
              : (isSelected ? (isDark ? 0.78 : 0.55) : isToday ? (isDark ? 0.5 : 0.34) : (isDark ? 0.34 : 0.20));
            const accent = modeColor ?? "var(--color-foreground)";
            const GOLD_BRIGHT = "#E7C766"; // crown badge + border accent
            // TODAY renders at the saturated (pressed) tint so the white Velea mark reads;
            // other days keep the light mode tint.
            const restingBg = hasMode
              ? (isToday ? darkenOklch(accent, 0.64) : withAlpha(accent, tintAlpha))
              : (isSelected || isToday ? "var(--color-secondary)" : "transparent");
            const hoverBg = hasMode ? (isToday ? darkenOklch(accent, 0.58) : darkenOklch(accent, 0.82)) : "var(--color-secondary)";
            const pressBg = hasMode ? (isToday ? darkenOklch(accent, 0.5) : darkenOklch(accent, 0.64)) : "var(--color-border)";

            return (
              <button
                key={dateStr}
                onClick={(e) => {
                  setSelectedDate(dateStr);
                  if (!isCrown || crownTip?.date === dateStr) { setCrownTip(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  setCrownTip({ date: dateStr, why: crownByDate.get(dateStr) ?? "", cx: r.left + r.width / 2, top: r.top, bottom: r.bottom });
                }}
                className="flex items-center justify-center rounded-lg transition-all duration-150 relative"
                style={{
                  minHeight: "2.1rem",
                  color: hasMode ? "var(--color-foreground)" : undefined,
                  background: restingBg,
                  border: (isCrown || isGolden)
                    ? `2px solid ${GOLD_BRIGHT}`
                    : isSelected
                    ? `1.5px solid ${accent}`
                    : isToday
                    ? `1.5px solid ${withAlpha(accent, 0.55)}`
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = restingBg; if (hasMode) e.currentTarget.style.color = "var(--color-foreground)"; }}
                onMouseDown={(e) => { e.currentTarget.style.background = pressBg; if (hasMode) e.currentTarget.style.color = "#fff"; }}
                onMouseUp={(e) => { e.currentTarget.style.background = hoverBg; if (hasMode) e.currentTarget.style.color = "#fff"; }}
              >
                {/* Crown badge — the personal apex (crown.forMonth). Gold crown + gold border. */}
                {isCrown && (
                  <img
                    src="/crown.png"
                    alt=""
                    width={11}
                    height={11}
                    style={{ position: "absolute", top: "3px", right: "3px", pointerEvents: "none", filter: "drop-shadow(0 0.5px 1px rgba(0,0,0,0.35))" }}
                  />
                )}
                <span
                  className="text-xs"
                  style={{
                    color: hasMode ? "inherit" : "var(--color-muted-foreground)",
                    fontWeight: isSelected || isToday ? 700 : 600,
                  }}
                >
                  {day}
                </span>
              </button>
            );
          })}
        </div>

        {/* Annual reminder — merged inside calendar card */}
        {timeLordData && (
          <>
            <div
              className="mt-4"
              style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}
            >
              <p
                className="text-xs leading-relaxed italic"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {(timeLordData as any).timeLord} year · House {(timeLordData as any).activatedHouse} · {(timeLordData as any).activatedSign} · {(timeLordData as any).houseThemes}
              </p>
            </div>
          </>
        )}
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
          ? { bottom: Math.round(window.innerHeight - crownTip.top + 8) }
          : { top: Math.round(crownTip.bottom + 8) };
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={() => setCrownTip(null)} />
            <div
              style={{
                position: "fixed", left, width: W, ...vpos, zIndex: 81, textAlign: "left",
                background: "var(--color-card)", border: "1px solid #E7C766", borderRadius: "var(--radius-card)",
                padding: "0.7rem 0.8rem", fontSize: "0.74rem", lineHeight: 1.45, color: "var(--color-foreground)",
                fontWeight: 400, boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#C9A84C", marginBottom: "0.25rem" }}>
                <img src="/crown.png" alt="" width={14} height={14} style={{ display: "inline-block", verticalAlign: "-2px" }} /> Crown day
              </span>
              An auspicious day for you, a Velea&rsquo;lor. What will you do today?
              {crownTip.why && (
                <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                  {crownTip.why}
                </span>
              )}
            </div>
          </>
        );
      })(), document.body)}

      {/* Due this day — tied to the calendar's selected date */}
      {isAuthenticated && dueTasks.length > 0 && (
        <div className="relative z-10">
          <p
            className="text-sm font-bold uppercase mb-2"
            style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
          >
            Due this day
          </p>
          <div className="space-y-2">
            {dueTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleEdit(task)}
                className="flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all active:scale-[0.98]"
                style={{ background: MODE_CARD_GRADIENT[task.mode as TaskMode] ?? "var(--color-card)", border: "none" }}
              >
                <span
                  className="text-xs font-bold flex-shrink-0"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  {PRIORITY_EXCLAIM[task.priority as TaskPriority] ?? "!"}
                </span>
                <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.95)" }}>{task.title}</span>
                <ModeTag mode={task.mode} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. TIME LORD MOVEMENT ── */}
      {selectedPanchang && (
        <div
          className="relative z-10 overflow-hidden"
          style={{
            borderRadius: "var(--radius-card)",
            background: heroCardGradient,
          }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setTlOpen((v) => !v)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(timeLordData as any)?.timeLord && PLANET_GLYPH[(timeLordData as any).timeLord] && (
                <span style={{ fontFamily: GLYPH_FONT, fontSize: '1rem', lineHeight: 1, color: 'rgba(255,255,255,0.96)' }}>
                  {PLANET_GLYPH[(timeLordData as any).timeLord]}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.96)',
                }}
              >
                Current Time Lord Movement
              </span>
            </span>
            <ChevronDown
              size={14}
              style={{
                color: 'rgba(255,255,255,0.6)',
                transform: tlOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            />
          </button>
          {tlOpen && (
            <div className="px-5 pb-5">
              <TimeLordMovement selectedDate={selectedDate} variant="immersive" accentColor={selectedModeColor} darkColor={selectedTaskModeForHero ? MODE_DARK[selectedTaskModeForHero] : undefined} />
            </div>
          )}
        </div>
      )}

      {/* Reflections */}
      {isAuthenticated && (
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={12} style={{ color: "var(--color-muted-foreground)" }} />
            <p
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              What happened on {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}?
            </p>
          </div>
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
              All Tasks ({allTasks.filter((t) => !t.isCompleted).length})
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
            {/* Due orb */}
            <button
              onClick={() => setDueSheetOpen(true)}
              className="flex flex-col items-center gap-1.5 group transition-all duration-200 cursor-pointer"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold transition-all duration-200 opacity-80 group-hover:opacity-100 group-hover:scale-105"
                style={{
                  background: "oklch(0.55 0.14 250)",
                  color: "oklch(1 0 0)",
                }}
              >
                <span className="text-sm font-bold">
                  {!settings.showOrbCounts ? (
                    <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>●</span>
                  ) : orbDueCount === 0 ? "+" : orbDueCount}
                </span>
              </div>
              <span
                className="text-xs font-bold uppercase"
                style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
              >
                Due
              </span>
            </button>
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
                        {m} <span style={{ color: "var(--color-muted-foreground)" }}>({groupTasks.length})</span>
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
                                onEdit={(t: Task) => setEditPinnedTask(t)}
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
                    onEdit={(t: Task) => setEditPinnedTask(t)}
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

          {alignedOpen && (alignedForToday.length === 0 ? (
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
                    onEdit={(t: Task) => setEditAlignedTask(t)}
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
                  Completed ({completed.length})
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
                      onEdit={(t: Task) => setEditPinnedTask(t)}
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

      {/* Quick Add Sheet (zero-count orb shortcut) */}
      {quickAddMode && (
        <AddTaskSheet
          open={!!quickAddMode}
          onClose={() => setQuickAddMode(null)}
          editTask={undefined}
        />
      )}

      {/* Edit Pinned Task Sheet */}
      {editPinnedTask && (
        <AddTaskSheet
          open={!!editPinnedTask}
          onClose={() => setEditPinnedTask(null)}
          editTask={editPinnedTask ? { id: String(editPinnedTask.id), title: editPinnedTask.title, mode: editPinnedTask.mode, priority: editPinnedTask.priority === 'High' ? 3 : editPinnedTask.priority === 'Medium' ? 2 : 1, dueDate: editPinnedTask.dueDate ? new Date(editPinnedTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editPinnedTask.isPinned, wealthFlow: (editPinnedTask as any).wealthFlow ?? false, projectId: (editPinnedTask as any).projectId ?? null, cognitiveLoad: (editPinnedTask as any).cognitiveLoad ?? null, physicalLoad: (editPinnedTask as any).physicalLoad ?? null, creativeRequired: (editPinnedTask as any).creativeRequired ?? null, socialRequired: (editPinnedTask as any).socialRequired ?? null, emotionalLoad: (editPinnedTask as any).emotionalLoad ?? null, notes: (editPinnedTask as any).notes ?? null, recurrence: (editPinnedTask as any).recurrence ?? null, lifeAreas: (editPinnedTask as any).lifeAreas ?? null } : undefined}
        />
      )}

      {/* Edit Aligned Task Sheet */}
      {editAlignedTask && (
        <AddTaskSheet
          open={!!editAlignedTask}
          onClose={() => setEditAlignedTask(null)}
          editTask={editAlignedTask ? { id: String(editAlignedTask.id), title: editAlignedTask.title, mode: editAlignedTask.mode, priority: editAlignedTask.priority === 'High' ? 3 : editAlignedTask.priority === 'Medium' ? 2 : 1, dueDate: editAlignedTask.dueDate ? new Date(editAlignedTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editAlignedTask.isPinned, wealthFlow: (editAlignedTask as any).wealthFlow ?? false, projectId: (editAlignedTask as any).projectId ?? null, cognitiveLoad: (editAlignedTask as any).cognitiveLoad ?? null, physicalLoad: (editAlignedTask as any).physicalLoad ?? null, creativeRequired: (editAlignedTask as any).creativeRequired ?? null, socialRequired: (editAlignedTask as any).socialRequired ?? null, emotionalLoad: (editAlignedTask as any).emotionalLoad ?? null, notes: (editAlignedTask as any).notes ?? null, recurrence: (editAlignedTask as any).recurrence ?? null, lifeAreas: (editAlignedTask as any).lifeAreas ?? null } : undefined}
        />
      )}

      {/* Why-now pop-up for an aligned task */}
      <WhyNowSheet task={whyNowTask} modeColor={todayModeColor} onClose={() => setWhyNowTask(null)} />

      {/* Due Orb Sheet */}
      <DueOrbSheet open={dueSheetOpen} onClose={() => setDueSheetOpen(false)} />

      {/* Why-this-today Signpost Sheet */}
      <SignpostSheet open={signpostOpen} onClose={() => setSignpostOpen(false)} mode={selectedTaskModeForHero ?? undefined} />

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null); }}
         editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: editTask.wealthFlow ?? false, projectId: editTask.projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null, recurrence: (editTask as any).recurrence ?? null, lifeAreas: (editTask as any).lifeAreas ?? null } : undefined}
      />


      </div>
    </div>
  );
}
