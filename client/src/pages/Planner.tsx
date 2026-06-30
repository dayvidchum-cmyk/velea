import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, BookOpen, Plus, ChevronDown, Pin, Moon, Sunrise } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ModeTag from "@/components/ModeTag";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";
import ModeOrb from "@/components/ModeOrb";
import ModeOrbSheet from "@/components/ModeOrbSheet";
import DueOrbSheet from "@/components/DueOrbSheet";
import { useSettingsContext } from "@/contexts/SettingsContext";

import { PANCHANG_TO_TASK_MODE, PRIORITY_EXCLAIM, MODE_OKLCH, MODE_TINT, MODE_CARD_BG, MODE_CARD_GRADIENT, MODE_SOLID, MODE_DARK, MODE_RGBA } from "../../../shared/types";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import type { Task } from "../../../drizzle/schema";
import AppHeader from "@/components/AppHeader";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { composeNarrative } from "@/lib/narrative-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

export default function Planner() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettingsContext();

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Task list state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // Edit sheets for the curated daily lists (ported from the retired Today page)
  const [editPinnedTask, setEditPinnedTask] = useState<Task | null>(null);
  const [editAlignedTask, setEditAlignedTask] = useState<Task | null>(null);
  const [heroOpen, setHeroOpen] = useState(true);
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
  const { data: selectedPanchang } = trpc.panchang.byDate.useQuery({ date: selectedDate });
  // Today's panchang is needed to know the current day mode for auto-assigning on pin
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const todayTaskMode = todayPanchang
    ? PANCHANG_TO_TASK_MODE[todayPanchang.mode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const { data: allTasks = [] } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });

  // Ranked-for-today suggestions powering the "Aligned for today" list (ported from Home).
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: rankedTasks } = trpc.tasks.rankedForToday.useQuery(
    {
      todayMode: todayTaskMode ?? "Build",
      todayDate: todayDateStr,
      personalEnergy: settings.personalEnergy,
      todayHouse: todayPanchang?.houseActivated ?? undefined,
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
  const { data: glance } = trpc.narrative.glance.useQuery(
    { profileId: glanceProfileId as number, date: selectedDate },
    { enabled: !!glanceProfileId, staleTime: 1000 * 60 * 30 },
  );
  const glanceContent = glance?.content ?? null;

  const utils = trpc.useUtils();

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
    const limit = settings.todayTaskLimit;
    const filtered = rankedTasks.filter((t) => !pinnedIds.has(t.id));
    return limit === "unlimited" ? filtered : filtered.slice(0, Number(limit));
  }, [rankedTasks, pinnedForNow, settings.todayTaskLimit]);

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
    ? 'var(--kala-action-gradient)'
    : selectedTaskModeForHero === 'Build'
    ? 'var(--kala-build-gradient)'
    : selectedTaskModeForHero === 'Selective'
    ? 'var(--kala-selective-gradient)'
    : selectedTaskModeForHero === 'Restraint'
    ? 'var(--kala-restraint-gradient)'
    : selectedPanchang
    ? `rgba(${selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba}, 0.25)`
    : 'var(--card)';
  const selectedModeColor = selectedTaskModeForHero ? MODE_OKLCH[selectedTaskModeForHero] : 'var(--color-border)';
  const selectedModeRgba = selectedTaskModeForHero ? MODE_RGBA[selectedTaskModeForHero] : modeRgba;

  // Calendar card: use today's mode color for strip header + border
  const calModeColor = todayTaskMode ? MODE_SOLID[todayTaskMode] : '#888';

  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div
        className="container py-6 space-y-5 relative z-10"
      >
      {/* Shared app header — hero layout identical to Today page */}
      <AppHeader heroMode={{ qualifier: todayPanchang?.qualifier ?? null }} />


      {/* ── 3. HERO DAY MODE CARD ── */}
      {selectedPanchang ? (
        <div className="relative z-10">
          <div
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
            {/* DATE label — toggles the day card open/closed */}
            <button
              type="button"
              onClick={() => setHeroOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: '0.25rem' }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,0,0,0.50)',
                }}
              >
                {selectedDate === toDateStr(today) ? "TODAY'S MODE" : `${selectedPanchang.dayOfWeek}, ${selectedPanchang.date}`}
              </span>
              <ChevronDown
                size={13}
                style={{ color: 'rgba(0,0,0,0.45)', transform: heroOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
              />
            </button>

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

            {heroOpen && (<>
            {/* Instruction */}
            <p
              style={{
                fontSize: '0.9375rem',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: '1rem',
              }}
            >
              {selectedPanchang.instruction}
            </p>

            {/* Narrative paragraph */}
            {(() => {
              const paras = (glanceContent?.narrative ?? composeNarrative({
                  moonSign: selectedPanchang.moonSign ?? '',
                  houseActivated: selectedPanchang.houseActivated ?? 1,
                  nakshatra: selectedPanchang.nakshatra ?? '',
                  tithi: selectedPanchang.tithi ?? '',
                  tithiPaksha: selectedPanchang.tithiPaksha ?? 'Shukla',
                  timeLord: timeLordData?.timeLord ?? null,
                })).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
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
                      {para}
                    </p>
                  ))}
                  {paras.length > 1 && (
                    <button
                      onClick={() => setWhyOpen((v) => !v)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
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
            <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-1.5">
                <Moon size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                {selectedPanchang.nakshatraTransitionTime && selectedPanchang.nakshatraAfterTransition ? (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                    {selectedPanchang.nakshatraAtSunrise}
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> → </span>
                    {selectedPanchang.nakshatraAfterTransition}
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> {selectedPanchang.nakshatraTransitionTime}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{selectedPanchang.nakshatra}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>☽</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{selectedPanchang.moonSign}</span>
              </div>
              {selectedPanchang.sunriseLocal && (
                <div className="flex items-center gap-1.5">
                  <Sunrise size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{selectedPanchang.sunriseLocal}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>◑</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{selectedPanchang.tithi}</span>
              </div>
            </div>

            {/* Italic question — mirrors Today page */}
            <p
              style={{
                marginTop: 'auto',
                paddingTop: '1rem',
                fontFamily: "'Inter', ui-sans-serif, sans-serif",
                fontStyle: 'italic',
                fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.8)',
                textAlign: 'center',
              }}
            >
              {glanceContent?.question ?? (selectedTaskModeForHero === 'Action'
                ? 'What is ready to be shared, launched, or made visible today?'
                : selectedTaskModeForHero === 'Build'
                ? 'What body of work can you advance most significantly through consistent effort today?'
                : selectedTaskModeForHero === 'Selective'
                ? 'Which opportunity, relationship, or project deserves your full attention today?'
                : 'What should be stabilized, repaired, protected, or completed before moving forward?')}
            </p>
            </>)}
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-center relative z-10">
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No panchang data for this date.</p>
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
          <div className="flex justify-around items-end">
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
                const groupTasks = allTasks.filter(
                  (t) => t.mode === m && !t.isCompleted && (!t.snoozedUntil || t.snoozedUntil <= Date.now())
                );
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
                          {groupTasks.map((task) => (
                            <SwipeableTaskRow
                              key={task.id}
                              onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                              onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                              isCompleted={task.isCompleted}
                              isPinned={task.isPinned}
                              modeColor={groupColor}
                            >
                              <TaskItem
                                task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                                onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                                onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
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
              Pinned for Now
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
              <p className="text-sm">No pinned tasks.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Pin tasks to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedForNow.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => setEditPinnedTask(t)}
                    dayMode={todayTaskMode}
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
              Why now? · Aligned for today
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
                  onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={todayModeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                    onDelete={() => deleteMutation.mutate({ id: task.id })}
                    onEdit={(t: Task) => setEditAlignedTask(t)}
                    dayMode={todayTaskMode}
                  />
                  {/* Pressure-layer disclosure bubbles — why this ranked high (positives only, max 3) */}
                  {((task as any).layerBubbles?.length > 0) && (
                    <div className="px-4 pb-1.5 flex flex-wrap gap-1">
                      {((task as any).layerBubbles as string[]).map((b: string) => (
                        <span
                          key={b}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            letterSpacing: "0.03em",
                            background: todayModeColor,
                            color: "#fff",
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Transparent ranking reasons */}
                  {(task as any).reasons?.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1">
                      {((task as any).reasons as string[]).map((r: string) => (
                        <span
                          key={r}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            letterSpacing: "0.02em",
                            background: `rgba(${MODE_RGBA[todayTaskMode ?? 'Action']}, 0.12)`,
                            color: todayModeColor,
                            border: `1px solid rgba(${MODE_RGBA[todayTaskMode ?? 'Action']}, 0.2)`,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </SwipeableTaskRow>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── COMPLETED (collapsible, purgeable) ── */}
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

      {/* ── PLAN AHEAD (planning tools, collapsed by default) ── */}
      <button
        onClick={() => setPlanOpen((v) => !v)}
        className="flex items-center justify-between w-full py-2 transition-all relative z-10"
      >
        <span
          className="text-sm font-bold uppercase"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
        >
          Plan ahead
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
                fontSize: "0.7rem",
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
            const isSelected = dateStr === selectedDate;
            const modeColor = panchang ? MODE_DOT[panchang.mode] : undefined;
            const hasMode = !!modeColor;
            // Whole cell is tinted by the day's mode — far more legible than a tiny
            // dot, and selected/today get a stronger fill + solid border.
            const tintAlpha = isSelected ? 0.55 : isToday ? 0.34 : 0.20;
            const accent = modeColor ?? "var(--color-foreground)";
            const restingBg = hasMode
              ? withAlpha(accent, tintAlpha)
              : (isSelected || isToday ? "var(--color-secondary)" : "transparent");
            const hoverBg = hasMode ? darkenOklch(accent, 0.82) : "var(--color-secondary)";
            const pressBg = hasMode ? darkenOklch(accent, 0.64) : "var(--color-border)";

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className="flex items-center justify-center rounded-lg transition-all duration-150 relative"
                style={{
                  minHeight: "2.1rem",
                  color: hasMode ? "var(--color-foreground)" : undefined,
                  background: restingBg,
                  border: isSelected
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
            borderRadius: '20px',
            background: heroGradient,
          }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setTlOpen((v) => !v)}
          >
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.96)',
              }}
            >
              Current Time Lord Movement
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

        </div>
      )}

      {/* Reflection history link */}
      {isAuthenticated && (
        <button
          onClick={() => navigate("/reflections")}
          className="flex items-center gap-2 w-full py-2 px-1 transition-opacity hover:opacity-70 relative z-10"
        >
          <BookOpen size={12} style={{ color: "var(--color-muted-foreground)" }} />
          <span
            className="text-sm font-bold uppercase"
            style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
          >
            View reflection log
          </span>
        </button>
      )}

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

      {/* Due Orb Sheet */}
      <DueOrbSheet open={dueSheetOpen} onClose={() => setDueSheetOpen(false)} />

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
