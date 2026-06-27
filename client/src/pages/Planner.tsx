import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, BookOpen, Plus, Search, X, ChevronDown, Pin, FolderOpen, Moon, Sunrise } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ModeTag from "@/components/ModeTag";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";

import { PANCHANG_TO_TASK_MODE, PRIORITY_EXCLAIM, MODE_OKLCH, MODE_TINT, MODE_CARD_BG, MODE_CARD_GRADIENT, MODE_SOLID, MODE_DARK, TASK_MODES, MODE_RGBA } from "../../../shared/types";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import type { Task } from "../../../drizzle/schema";
import ReasoningChain from "@/components/ReasoningChain";
import AppHeader from "@/components/AppHeader";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { composeNarrative } from "@/lib/narrative-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type FilterMode = TaskMode | "All" | "Snoozed";

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

const MODE_FILTER_COLORS: Record<string, string> = {
  Snoozed: "oklch(0.65 0.15 250)",
  Restraint: "oklch(0.65 0.12 15)",
  Build:     "oklch(0.80 0.15 92)",
  Selective: "oklch(0.72 0.10 200)",
  Action:    "oklch(0.72 0.16 145)",
  All:       "var(--foreground)",
};

// Planner-specific mode colors — now identical to shared since shared was fixed to gold
const PLANNER_MODE_OKLCH: Record<TaskMode, string> = {
  ...MODE_OKLCH,
};

const PLANNER_MODE_TINT: Record<TaskMode, string> = {
  ...MODE_TINT,
};

function CompletedArchive({
  tasks,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onEdit,
  dayLabelColor,
}: {
  tasks: Task[];
  onToggleComplete: (id: number, current: boolean) => void;
  onTogglePin: (id: number, current: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
  dayLabelColor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full py-2 transition-all"
      >
        <span
          className="text-sm font-bold uppercase"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
        >
          Completed ({tasks.length})
        </span>
        <ChevronDown
          size={12}
          style={{
            color: "var(--color-muted-foreground)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>
      {open && (
        <div className="space-y-2 mt-1">
          {tasks.map((task) => (
            <SwipeableTaskRow
              key={task.id}
              isCompleted={task.isCompleted}
              isPinned={task.isPinned}
              onSwipeLeft={() => onToggleComplete(task.id, task.isCompleted)}
              onSwipeRight={() => onTogglePin(task.id, task.isPinned)}
              modeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
            >
              <TaskItem
                task={task}
                onToggleComplete={onToggleComplete}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
                onEdit={onEdit}
                taskModeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
              />
            </SwipeableTaskRow>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Planner() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Task list state
  const [filter, setFilter] = useState<FilterMode>("All");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

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
  const { data: allTasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: savedReflection } = trpc.reflections.get.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );
  const { data: timeLordData } = trpc.panchang.timeLordInfluence.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );

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
        old?.map((t) => (t.id === input.id ? { ...t, ...input } : t))
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
    },
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

  // Filtered task list (all tasks, not date-scoped)
  const { data: activeProjects = [] } = trpc.projects.list.useQuery(undefined, { enabled: isAuthenticated });

  const filteredTasks = useMemo(() => {
    let list = allTasks;
    const now = Date.now();
    if (filter === "Snoozed") {
      // Show only currently snoozed tasks
      list = list.filter((t) => t.snoozedUntil && t.snoozedUntil > now);
    } else {
      // Exclude snoozed tasks from normal views
      list = list.filter((t) => !t.snoozedUntil || t.snoozedUntil <= now);
      if (filter !== "All") list = list.filter((t) => t.mode === filter);
    }
    if (projectFilter !== null) list = list.filter((t) => (t as any).projectId === projectFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [allTasks, filter, projectFilter, search]);

  const activeTasks = filteredTasks.filter((t) => !t.isCompleted);
  const completedTasks = filteredTasks.filter((t) => t.isCompleted);

  // Priority sort order (title-case to match DB enum)
  const PRIORITY_SORT: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  // When filter is "All", group active tasks by mode with today's mode first
  const modeGroups = useMemo(() => {
    if (filter !== "All") return null; // flat list handled separately
    const todayMode = todayTaskMode; // e.g. "Action"
    // Build ordered mode list: today's mode first, then the rest in TASK_MODES order
    const orderedModes: TaskMode[] = todayMode
      ? [todayMode, ...TASK_MODES.filter((m) => m !== todayMode)]
      : [...TASK_MODES];
    return orderedModes
      .map((mode) => {
        const tasks = activeTasks
          .filter((t) => t.mode === mode)
          .sort((a, b) => (PRIORITY_SORT[a.priority] ?? 1) - (PRIORITY_SORT[b.priority] ?? 1));
        return { mode, tasks };
      })
      .filter((g) => g.tasks.length > 0); // omit empty groups
  }, [filter, activeTasks, todayTaskMode]);

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
  // Solid hex for all-caps section labels — changes with today's mode
  const dayLabelColor = todayTaskMode ? MODE_SOLID[todayTaskMode] : MODE_SOLID.Build;

  return (
    <div className="min-h-screen w-full relative">
      {/* Content */}
      <div
        className="container py-6 space-y-5 relative z-10"
      >
      {/* Shared app header — hero layout identical to Today page */}
      <AppHeader heroMode={{ qualifier: todayPanchang?.qualifier ?? null }} />


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
              Time Lord Movement
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

      {/* ── 3. HERO DAY MODE CARD ── */}
      {selectedPanchang ? (
        <div className="relative z-10">
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: '28px',
              padding: '1.75rem 1.75rem 1.5rem',
              background: heroGradient,
              minHeight: '280px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* DATE label */}
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.50)',
                marginBottom: '0.25rem',
                display: 'block',
              }}
            >
              {selectedDate === toDateStr(today) ? "TODAY'S MODE" : `${selectedPanchang.dayOfWeek}, ${selectedPanchang.date}`}
            </span>

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

            {/* Instruction */}
            <p
              style={{
                fontSize: '0.9375rem',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: '1rem',
                maxWidth: '36ch',
              }}
            >
              {selectedPanchang.instruction}
            </p>

            {/* Narrative paragraph */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p
                style={{
                  fontFamily: "'Inter', ui-sans-serif, sans-serif",
                  fontSize: 'clamp(0.8rem, 3.2vw, 0.875rem)',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 400,
                  marginBottom: '0.65rem',
                }}
              >
                {composeNarrative({
                  moonSign: selectedPanchang.moonSign ?? '',
                  houseActivated: selectedPanchang.houseActivated ?? 1,
                  nakshatra: selectedPanchang.nakshatra ?? '',
                  tithi: selectedPanchang.tithi ?? '',
                  tithiPaksha: selectedPanchang.tithiPaksha ?? 'Shukla',
                  timeLord: timeLordData?.timeLord ?? null,
                })}
              </p>
              <button
                onClick={() => setWhyOpen((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'rgba(255,255,255,0.45)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {whyOpen ? 'Hide breakdown' : 'See full breakdown'}
                <ChevronDown
                  size={11}
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    transform: whyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease',
                  }}
                />
              </button>
              {whyOpen && (
                <div
                  className="mt-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <ReasoningChain
                    panchang={selectedPanchang as any}
                    timeLord={timeLordData as any}
                    modeColor={selectedModeColor}
                  />
                </div>
              )}
            </div>

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
              {selectedTaskModeForHero === 'Action'
                ? 'What is ready to be shared, launched, or made visible today?'
                : selectedTaskModeForHero === 'Build'
                ? 'What body of work can you advance most significantly through consistent effort today?'
                : selectedTaskModeForHero === 'Selective'
                ? 'Which opportunity, relationship, or project deserves your full attention today?'
                : 'What should be stabilized, repaired, protected, or completed before moving forward?'}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-center relative z-10">
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No panchang data for this date.</p>
        </div>
      )}

      {/* Due this day */}
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

      {/* All Tasks — collapsed by default, expands inline */}
      {isAuthenticated && (
        <div className="relative z-10">
          <button
            onClick={() => setAllTasksOpen((v) => !v)}
            className="flex items-center justify-between w-full py-2 transition-all"
          >
            <span
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              All Tasks ({allTasks.filter((t) => !t.isCompleted).length})
            </span>
            <ChevronDown
              size={13}
              style={{
                color: "var(--color-muted-foreground)",
                transform: allTasksOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            />
          </button>

          {allTasksOpen && (
            <div className="space-y-3 mt-1">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted-foreground)" }} />
                <input
                  className="glass-input w-full pl-8 pr-8 py-2.5 text-sm"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")} style={{ color: "var(--color-muted-foreground)" }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Mode filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(["All", ...TASK_MODES, "Snoozed"] as FilterMode[]).map((m) => {
                  const active = filter === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setFilter(m)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150"
                      style={{
                        letterSpacing: "0.02em",
                        background: active ? `color-mix(in oklch, ${MODE_FILTER_COLORS[m]} 20%, transparent)` : "var(--color-border)",
                        color: active ? MODE_FILTER_COLORS[m] : "var(--color-muted-foreground)",
                        border: `1px solid ${active ? `color-mix(in oklch, ${MODE_FILTER_COLORS[m]} 40%, transparent)` : "var(--color-border)"}`,
                      }}
                      onMouseEnter={(e) => {
                        if (active) return;
                        e.currentTarget.style.background = `color-mix(in oklch, ${MODE_FILTER_COLORS[m]} 16%, transparent)`;
                        e.currentTarget.style.color = MODE_FILTER_COLORS[m];
                        e.currentTarget.style.borderColor = `color-mix(in oklch, ${MODE_FILTER_COLORS[m]} 40%, transparent)`;
                      }}
                      onMouseLeave={(e) => {
                        if (active) return;
                        e.currentTarget.style.background = "var(--color-border)";
                        e.currentTarget.style.color = "var(--color-muted-foreground)";
                        e.currentTarget.style.borderColor = "var(--color-border)";
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* Project filter pills — only shown when there are projects */}
              {activeProjects.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setProjectFilter(null)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-1.5"
                    style={{
                      letterSpacing: "0.02em",
                      background: projectFilter === null ? "var(--filter-pill-bg-active)" : "var(--color-border)",
                      color: projectFilter === null ? "var(--foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${projectFilter === null ? "var(--filter-pill-border-active)" : "var(--color-border)"}`,
                    }}
                  >
                    <FolderOpen size={10} />
                    All Projects
                  </button>
                  {activeProjects.map((project) => {
                    const active = projectFilter === project.id;
                    return (
                      <button
                        key={project.id}
                        onClick={() => setProjectFilter(active ? null : project.id)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-1.5 max-w-[140px]"
                        style={{
                          letterSpacing: "0.02em",
                          background: active ? "var(--filter-pill-bg-active)" : "var(--color-border)",
                          color: active ? "var(--foreground)" : "var(--color-muted-foreground)",
                          border: `1px solid ${active ? "var(--filter-pill-border-active)" : "var(--color-border)"}`,
                        }}
                      >
                        <FolderOpen size={10} style={{ flexShrink: 0 }} />
                        <span className="truncate">{project.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Task list */}
              {tasksLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card h-14 animate-pulse" style={{ opacity: 0.5 }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Grouped by mode when filter is "All" */}
                  {modeGroups !== null ? (
                    modeGroups.length > 0 ? (
                      <div className="space-y-5">
                        {modeGroups.map(({ mode, tasks: groupTasks }) => (
                          <div key={mode}>
                            {/* Mode group header */}
                            <div
                              className="flex items-center gap-2 mb-2"
                            >
                              <span
                                className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: MODE_FILTER_COLORS[mode] }}
                              >
                                {mode}
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: "var(--color-muted-foreground)" }}
                              >
                                ({groupTasks.length})
                              </span>
                              <div
                                className="flex-1 h-px"
                                style={{ background: `color-mix(in oklch, ${MODE_FILTER_COLORS[mode]} 25%, transparent)` }}
                              />
                            </div>
                            <div className="space-y-2">
                              {groupTasks.map((task) => (
                                <SwipeableTaskRow
                                  key={task.id}
                                  isCompleted={task.isCompleted}
                                  isPinned={task.isPinned}
                                  isExpanded={expandedTaskId === task.id}
                                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                                  onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                                  modeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                                >
                                  <TaskItem
                                    task={task}
                                    onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                                    onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                                    onDelete={(id) => deleteMutation.mutate({ id })}
                                    onEdit={handleEdit}
                                    onExpandChange={(exp) => setExpandedTaskId(exp ? task.id : null)}
                                    taskModeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                                  />
                                </SwipeableTaskRow>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  ) : (
                    /* Flat list for single-mode or Snoozed filters */
                    activeTasks.length > 0 && (
                      <div className="space-y-2">
                        {activeTasks
                          .slice()
                          .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 1) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 1))
                          .map((task) => (
                            <SwipeableTaskRow
                              key={task.id}
                              isCompleted={task.isCompleted}
                              isPinned={task.isPinned}
                              isExpanded={expandedTaskId === task.id}
                              onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                              onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                              modeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                            >
                              <TaskItem
                                task={task}
                                onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                                onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                                onDelete={(id) => deleteMutation.mutate({ id })}
                                onEdit={handleEdit}
                                onExpandChange={(exp) => setExpandedTaskId(exp ? task.id : null)}
                                taskModeColor={PLANNER_MODE_OKLCH[task.mode as TaskMode]}
                              />
                            </SwipeableTaskRow>
                          ))}
                      </div>
                    )
                  )}
                  {completedTasks.length > 0 && (
                    <CompletedArchive
                      tasks={completedTasks}
                      onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                      onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current && todayTaskMode ? { dayMode: todayTaskMode } : {}) })}
                      onDelete={(id) => deleteMutation.mutate({ id })}
                      onEdit={handleEdit}
                      dayLabelColor={dayLabelColor}
                    />
                  )}
                  {filteredTasks.length === 0 && (
                    <div className="glass-card p-6 text-center">
                      <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                        {search ? "No tasks match your search." : filter === "Snoozed" ? "No snoozed tasks." : filter === "All" ? "No tasks yet. Tap + to add one." : `No ${filter} tasks yet.`}
                      </p>
                    </div>
                  )}
                </div>
              )}
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

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null); }}
         editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: editTask.wealthFlow ?? false, projectId: editTask.projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null, recurrence: (editTask as any).recurrence ?? null } : undefined}
      />


      </div>
    </div>
  );
}
