import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import ModeOrb from "@/components/ModeOrb";
import ModeOrbSheet from "@/components/ModeOrbSheet";
import DueOrbSheet from "@/components/DueOrbSheet";
import AddTaskSheet from "@/components/AddTaskSheet";
import { PANCHANG_TO_TASK_MODE, MODE_OKLCH, MODE_RGBA, MODE_TINT, MODE_SOLID, MODE_DARK, PRIORITY_EXCLAIM, type TaskMode } from "../../../shared/types";
import type { Task } from "../../../drizzle/schema";
import { Sunrise, Moon, ChevronDown, LogIn } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import CheckInCard from "@/components/CheckInCard";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
// Theme removed — dark-only luxury terminal aesthetic
import { useSettingsContext } from "@/contexts/SettingsContext";
import ReasoningChain from "@/components/ReasoningChain";
import { composeNarrative } from "@/lib/narrative-data";
import { TimeLordMovement } from "@/components/TimeLordMovement";
import { ChevronDown as ChevronDownIcon } from "lucide-react";


export default function Home() {
  const { isAuthenticated } = useAuth();

  const { settings } = useSettingsContext();

  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const { data: modeCounts } = trpc.tasks.modeCounts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode
    ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: rankedTasks, refetch: refetchPinned } = trpc.tasks.rankedForToday.useQuery(
    {
      todayMode: taskMode ?? "Build",
      todayDate: todayDateStr,
      personalEnergy: settings.personalEnergy,
    },
    { enabled: isAuthenticated && !!taskMode }
  );

  const utils = trpc.useUtils();

  const rankedQueryKey = useMemo(() => ({
    todayMode: taskMode ?? "Build",
    todayDate: todayDateStr,
    personalEnergy: settings.personalEnergy,
  }), [taskMode, todayDateStr, settings.personalEnergy]);

  const toggleComplete = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.tasks.rankedForToday.cancel(rankedQueryKey);
      const prev = utils.tasks.rankedForToday.getData(rankedQueryKey);
      utils.tasks.rankedForToday.setData(rankedQueryKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isCompleted: isCompleted ?? t.isCompleted } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.rankedForToday.setData(rankedQueryKey, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  // Show up to todayTaskLimit ranked tasks, sorted by priority (High → Medium → Low)
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  const displayedPinned = useMemo(() => {
    if (!rankedTasks) return [];
    const limit = settings.todayTaskLimit;
    const sliced = limit === "unlimited" ? rankedTasks : rankedTasks.slice(0, limit);
    return [...sliced].sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority ?? 'Low'] ?? 2;
      const pb = PRIORITY_RANK[b.priority ?? 'Low'] ?? 2;
      return pa - pb;
    });
  }, [rankedTasks, settings.todayTaskLimit]);

  const [orbSheetMode, setOrbSheetMode] = useState<TaskMode | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);

  // Let the guided tour open the synthesis sections so they're visible while
  // they're being explained.
  useEffect(() => {
    const onExpand = (e: Event) => {
      const which = (e as CustomEvent).detail;
      if (which === "why") setWhyOpen(true);
      if (which === "timelord") setTlOpen(true);
    };
    window.addEventListener("kala-tour-expand", onExpand);
    return () => window.removeEventListener("kala-tour-expand", onExpand);
  }, []);
  const [quickAddMode, setQuickAddMode] = useState<TaskMode | null>(null);
  const [dueSheetOpen, setDueSheetOpen] = useState(false);
  const [editPinnedTask, setEditPinnedTask] = useState<Task | null>(null);

  const togglePin = trpc.tasks.update.useMutation({
    onMutate: async ({ id, isPinned }) => {
      await utils.tasks.rankedForToday.cancel(rankedQueryKey);
      const prev = utils.tasks.rankedForToday.getData(rankedQueryKey);
      utils.tasks.rankedForToday.setData(rankedQueryKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isPinned: isPinned ?? t.isPinned } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.rankedForToday.setData(rankedQueryKey, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.rankedForToday.cancel(rankedQueryKey);
      const prev = utils.tasks.rankedForToday.getData(rankedQueryKey);
      utils.tasks.rankedForToday.setData(rankedQueryKey, (old) =>
        old?.filter((t) => t.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.rankedForToday.setData(rankedQueryKey, ctx.prev);
    },
    onSettled: () => {
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
    },
  });

  const updatePinnedTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.list.invalidate();
    },
  });

  const { data: dueList } = trpc.tasks.dueList.useQuery(undefined, { enabled: isAuthenticated });
  const { data: timeLordData } = trpc.panchang.timeLordInfluence.useQuery({}, { enabled: isAuthenticated });
  const dueCount = dueList?.filter((t) => !t.isCompleted).length ?? 0;

  // Fetch all tasks for the explicit Pinned for Now section
  const { data: allTasks } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });

  // Pinned for Now: explicitly pinned, today's mode, not completed, sorted by priority
  const pinnedForNow = useMemo(() => {
    if (!allTasks || !taskMode) return [];
    const now = Date.now();
    return allTasks
      .filter((t) =>
        t.isPinned &&
        !t.isCompleted &&
        t.mode === taskMode &&
        (!t.snoozedUntil || t.snoozedUntil <= now)
      )
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority ?? 'Low'] ?? 2;
        const pb = PRIORITY_RANK[b.priority ?? 'Low'] ?? 2;
        return pa - pb;
      });
  }, [allTasks, taskMode]);

  // Aligned for Today: ranked tasks that are NOT already pinned (avoid duplication).
  // Display order follows the backend's final score (which now includes the
  // pressure-layer multipliers) so the "why it ranked high" bubbles match what
  // the user sees. No post-slice re-sort by priority.
  const alignedForToday = useMemo(() => {
    if (!rankedTasks) return [];
    const pinnedIds = new Set(pinnedForNow.map((t) => t.id));
    const limit = settings.todayTaskLimit;
    const filtered = rankedTasks.filter((t) => !pinnedIds.has(t.id));
    return limit === 'unlimited' ? filtered : filtered.slice(0, Number(limit));
  }, [rankedTasks, pinnedForNow, settings.todayTaskLimit]);

  const [editAlignedTask, setEditAlignedTask] = useState<Task | null>(null);



  function getHouseSuffix(n: number | undefined): string {
    if (!n) return "th";
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
  }

  const modeColor = taskMode ? MODE_OKLCH[taskMode] : 'var(--color-border)';
  // Solid hex for all-caps section labels — changes with day mode
  const dayLabelColor = taskMode ? MODE_SOLID[taskMode] : MODE_SOLID.Build;

  // Store current mode in localStorage for task card tinting
  useEffect(() => {
    if (taskMode) {
      localStorage.setItem('currentMode', taskMode);
    }
  }, [taskMode]);

  // Mode-aware rgba for gradient
  const modeRgba = taskMode ? MODE_RGBA[taskMode] : MODE_RGBA.Action;
  const { theme } = useTheme();

  return (
    <div className="container py-6 space-y-5 relative">
            {/* Header */}
      {/* Shared app header — hero layout for Today page */}
      <AppHeader heroMode={{ qualifier: todayPanchang?.qualifier ?? null }} />

            {/* ── HERO CARD — immersive full-width mode gradient ── */}
      {(() => {
        const heroGradient = taskMode === 'Action'
          ? 'var(--kala-action-gradient)'
          : taskMode === 'Build'
          ? 'var(--kala-build-gradient)'
          : taskMode === 'Selective'
          ? 'var(--kala-selective-gradient)'
          : taskMode === 'Restraint'
          ? 'var(--kala-restraint-gradient)'
          : `rgba(${modeRgba}, 0.15)`;
        const questionText = timeLordData?.questionForToday
          ? timeLordData.questionForToday
          : taskMode === 'Action'
          ? 'What is ready to be shared, launched, or made visible today?'
          : taskMode === 'Build'
          ? 'What body of work can you advance most significantly through consistent effort today?'
          : taskMode === 'Selective'
          ? 'Which opportunity, relationship, or project deserves your full attention today?'
          : 'What should be stabilized, repaired, protected, or completed before moving forward?';
        return (
          <div
            data-tour="today-mode"
            className="relative overflow-hidden"
            style={{
              borderRadius: '28px',
              padding: '2rem 1.75rem 1.75rem',
              background: heroGradient,
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {todayPanchang ? (
              <>
                {/* TODAY'S MODE label */}
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.55)',
                    marginBottom: '0.35rem',
                    display: 'block',
                  }}
                >
                  Today's Mode
                </span>

                {/* GIANT MODE NAME */}
                <h2
                  style={{
                    fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
                    fontSize: 'clamp(4.5rem, 18vw, 6rem)',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: 'rgba(255,255,255,0.95)',
                    letterSpacing: '-0.02em',
                    marginBottom: '0.75rem',
                  }}
                >
                  {todayMode ?? ''}
                </h2>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.9375rem',
                    lineHeight: 1.55,
                    color: 'rgba(255,255,255,0.88)',
                    marginBottom: '1.25rem',
                    maxWidth: '36ch',
                  }}
                >
                  {timeLordData?.recommendedBehavior ?? todayPanchang.instruction}
                </p>

                                {/* WHY THIS MODE — narrative paragraph */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p
                    style={{
                      fontFamily: "'Inter', ui-sans-serif, sans-serif",
                      fontSize: 'clamp(0.8rem, 3.2vw, 0.9rem)',
                      lineHeight: 1.65,
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 400,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {composeNarrative({
                      moonSign: todayPanchang.moonSign ?? '',
                      houseActivated: todayPanchang.houseActivated ?? 1,
                      nakshatra: todayPanchang.nakshatra ?? '',
                      tithi: todayPanchang.tithi ?? '',
                      tithiPaksha: todayPanchang.tithiPaksha ?? 'Shukla',
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
                        panchang={todayPanchang as any}
                        timeLord={timeLordData as any}
                        modeColor={modeColor ?? undefined}
                      />
                    </div>
                  )}
                </div>

                {/* Panchang mini row */}
                <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: '1.75rem' }}>
                  <div className="flex items-center gap-1.5">
                    <Moon size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    {todayPanchang.nakshatraTransitionTime && todayPanchang.nakshatraAfterTransition ? (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                        {todayPanchang.nakshatraAtSunrise}
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}> → </span>
                        {todayPanchang.nakshatraAfterTransition}
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}> {todayPanchang.nakshatraTransitionTime}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{todayPanchang.nakshatra}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>☽</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{todayPanchang.moonSign}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sunrise size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{todayPanchang.sunriseLocal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>◑</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{todayPanchang.tithi}</span>
                  </div>
                </div>

                {/* Question for Today — centered italic, high emphasis */}
                <div
                  style={{
                    marginTop: 'auto',
                    textAlign: 'center',
                    padding: '0 0.5rem',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Inter', ui-sans-serif, sans-serif",
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: 'clamp(0.875rem, 3.5vw, 1.0rem)',
                      lineHeight: 1.55,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {questionText}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="h-5 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <div className="h-20 w-48 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Current Time Lord Movement — collapsible, below hero card */}
      {(() => {
        const tlDate = new Date().toISOString().split('T')[0];
        const tlGradient = taskMode === 'Action'
          ? 'var(--kala-action-gradient)'
          : taskMode === 'Build'
          ? 'var(--kala-build-gradient)'
          : taskMode === 'Selective'
          ? 'var(--kala-selective-gradient)'
          : taskMode === 'Restraint'
          ? 'var(--kala-restraint-gradient)'
          : 'var(--card)';
        return (
          <div
            data-tour="time-lord"
            className="overflow-hidden"
            style={{
              borderRadius: '20px',
              background: tlGradient,
              marginBottom: '1.25rem',
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
              <ChevronDownIcon
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
                <TimeLordMovement selectedDate={tlDate} variant="immersive" accentColor={modeColor} darkColor={taskMode ? MODE_DARK[taskMode] : undefined} />
              </div>
            )}
          </div>
        );
      })()}
      {/* Mode Orbs */}
      {isAuthenticated && modeCounts && (
        <div>
          <h3
            className="text-sm font-bold uppercase mb-3"
            style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
          >
            Tasks
          </h3>
          <div className="flex justify-around items-end">
            {(["Restraint", "Build", "Selective", "Action"] as TaskMode[]).map((m) => (
              <ModeOrb
                key={m}
                mode={m}
                count={modeCounts[m] ?? 0}
                active={taskMode === m}
                showCount={settings.showOrbCounts}
                onClick={() => {
                  const count = modeCounts[m] ?? 0;
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
                  ) : dueCount === 0 ? "+" : dueCount}
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
        </div>
      )}

      {/* Pinned for Now — explicit user pins */}
      {isAuthenticated && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-bold uppercase"
              style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
            >
              Pinned for Now
            </h3>
          </div>

          {pinnedForNow.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: 'var(--input)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm">No tasks pinned for today's mode.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Pin tasks in the Planner to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedForNow.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => toggleComplete.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => togglePin.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && taskMode ? { dayMode: taskMode } : {}) })}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={modeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => toggleComplete.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => togglePin.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && taskMode ? { dayMode: taskMode } : {}) })}
                    onDelete={() => deleteTask.mutate({ id: task.id })}
                    onEdit={(t: Task) => setEditPinnedTask(t)}
                    dayMode={taskMode}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aligned for Today — system-ranked suggestions */}
      {isAuthenticated && !!taskMode && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3
            className="text-sm font-bold uppercase"
            style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
          >
            Aligned for Today
          </h3>
          </div>

          {alignedForToday.length === 0 ? (
            <div
              className="p-4 text-center rounded-lg"
              style={{ color: "var(--muted-foreground)", background: 'var(--input)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm">No suggestions for today's mode.</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Add tasks tagged {taskMode} to see recommendations here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alignedForToday.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  onSwipeLeft={() => toggleComplete.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => togglePin.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && taskMode ? { dayMode: taskMode } : {}) })}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={modeColor}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={() => toggleComplete.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    onTogglePin={() => togglePin.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && taskMode ? { dayMode: taskMode } : {}) })}
                    onDelete={() => deleteTask.mutate({ id: task.id })}
                    onEdit={(t: Task) => setEditAlignedTask(t)}
                    dayMode={taskMode}
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
                            background: modeColor,
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
                            background: `rgba(${MODE_RGBA[taskMode ?? 'Action']}, 0.12)`,
                            color: modeColor,
                            border: `1px solid rgba(${MODE_RGBA[taskMode ?? 'Action']}, 0.2)`,
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
          )}
        </div>
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
          editTask={editPinnedTask ? { id: String(editPinnedTask.id), title: editPinnedTask.title, mode: editPinnedTask.mode, priority: editPinnedTask.priority === 'High' ? 3 : editPinnedTask.priority === 'Medium' ? 2 : 1, dueDate: editPinnedTask.dueDate ? new Date(editPinnedTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editPinnedTask.isPinned, wealthFlow: (editPinnedTask as any).wealthFlow ?? false, projectId: (editPinnedTask as any).projectId ?? null, cognitiveLoad: (editPinnedTask as any).cognitiveLoad ?? null, physicalLoad: (editPinnedTask as any).physicalLoad ?? null, creativeRequired: (editPinnedTask as any).creativeRequired ?? null, socialRequired: (editPinnedTask as any).socialRequired ?? null, emotionalLoad: (editPinnedTask as any).emotionalLoad ?? null, notes: (editPinnedTask as any).notes ?? null } : undefined}
        />
      )}

      {/* Edit Aligned Task Sheet */}
      {editAlignedTask && (
        <AddTaskSheet
          open={!!editAlignedTask}
          onClose={() => setEditAlignedTask(null)}
          editTask={editAlignedTask ? { id: String(editAlignedTask.id), title: editAlignedTask.title, mode: editAlignedTask.mode, priority: editAlignedTask.priority === 'High' ? 3 : editAlignedTask.priority === 'Medium' ? 2 : 1, dueDate: editAlignedTask.dueDate ? new Date(editAlignedTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editAlignedTask.isPinned, wealthFlow: (editAlignedTask as any).wealthFlow ?? false, projectId: (editAlignedTask as any).projectId ?? null, cognitiveLoad: (editAlignedTask as any).cognitiveLoad ?? null, physicalLoad: (editAlignedTask as any).physicalLoad ?? null, creativeRequired: (editAlignedTask as any).creativeRequired ?? null, socialRequired: (editAlignedTask as any).socialRequired ?? null, emotionalLoad: (editAlignedTask as any).emotionalLoad ?? null, notes: (editAlignedTask as any).notes ?? null } : undefined}
        />
      )}

      {/* Due Orb Sheet */}
      <DueOrbSheet open={dueSheetOpen} onClose={() => setDueSheetOpen(false)} />




      {/* Not logged in CTA */}
      {!isAuthenticated && (
        <div className="p-5 text-center space-y-3 rounded-lg" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all"
            style={{
              background: modeColor,
              color: "oklch(1 0 0)",
              letterSpacing: "0.02em",
            }}
          >
            <LogIn size={14} />
            Sign In
          </a>
        </div>
      )}
    </div>
  );
}
