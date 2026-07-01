import { useState, useRef, useEffect } from "react";
import { X, Plus, CheckCircle2, Circle, Pencil, Pin, PinOff, Trash2, ChevronDown, ChevronUp, Check, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AddTaskSheet from "./AddTaskSheet";
import SwipeableTaskRow from "./SwipeableTaskRow";
import TaskItem from "./TaskItem";
import type { Task } from "../../../drizzle/schema";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import { MODE_OKLCH, MODE_CARD_GRADIENT, MODE_SOLID, PRIORITY_EXCLAIM } from "../../../shared/types";

// Use canonical MODE_OKLCH for consistency across the app
const MODE_COLORS: Record<TaskMode, string> = MODE_OKLCH;

const ORB_CLASSES: Record<TaskMode, string> = {
  Restraint: "orb-restraint",
  Build: "orb-build",
  Selective: "orb-selective",
  Action: "orb-action",
};

interface ModeOrbSheetProps {
  mode: TaskMode;
  open: boolean;
  onClose: () => void;
}

export default function ModeOrbSheet({ mode, open, onClose }: ModeOrbSheetProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const utils = trpc.useUtils();
  const modeColor = MODE_COLORS[mode];

  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery(
    { mode },
    { enabled: open }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel({ mode });
      const prev = utils.tasks.list.getData({ mode });
      const optimistic = {
        id: -Date.now(),
        userId: 0,
        profileId: null,
        title: input.title,
        mode: input.mode ?? mode,
        priority: input.priority ?? "Medium",
        isPinned: input.isPinned ?? false,
        isCompleted: false,
        completedAt: null,
        dueDate: input.dueDate ?? null,
        wealthFlow: false,
        projectId: null,
        projectName: null,
        notes: null,
        cognitiveLoad: null,
        physicalLoad: null,
        creativeRequired: null,
        socialRequired: null,
        emotionalLoad: null,
        snoozedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtaskTotal: 0,
        subtaskCompleted: 0,
      } as Task & { subtaskTotal: number; subtaskCompleted: number; projectName: string | null };
      utils.tasks.list.setData({ mode }, (old) => [optimistic, ...(old ?? [])] as typeof old);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData({ mode }, ctx.prev);
      toast.error("Failed to add task");
    },
    onSettled: async () => {
      await utils.tasks.list.invalidate({ mode });
      await utils.tasks.modeCounts.invalidate();
      await utils.tasks.pinnedForToday.invalidate();
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel({ mode });
      const prev = utils.tasks.list.getData({ mode });
      utils.tasks.list.setData({ mode }, (old) =>
        old?.map((t) => (t.id === input.id ? ({ ...t, ...input } as typeof t) : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData({ mode }, ctx.prev);
      toast.error("Failed to update task");
    },
    onSettled: async (_data, _error, input) => {
      // Invalidate the current mode cache
      await utils.tasks.list.invalidate({ mode });
      // If mode changed, also invalidate the new mode cache
      if (input.mode && input.mode !== mode) {
        await utils.tasks.list.invalidate({ mode: input.mode });
      }
      await utils.tasks.modeCounts.invalidate();
      await utils.tasks.pinnedForToday.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.list.cancel({ mode });
      const prev = utils.tasks.list.getData({ mode });
      utils.tasks.list.setData({ mode }, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.tasks.list.setData({ mode }, ctx.prev);
      toast.error("Failed to delete task");
    },
    onSettled: async () => {
      await utils.tasks.list.invalidate({ mode });
      await utils.tasks.modeCounts.invalidate();
      await utils.tasks.pinnedForToday.invalidate();
    },
  });

  const handleSave = (data: { title: string; mode: TaskMode; priority: TaskPriority; isPinned: boolean; dueDate?: string | null }) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, ...data });
    } else {
      createMutation.mutate({ ...data, mode });
    }
    setEditTask(null);
  };

  const now = Date.now();
  const activeTasks = tasks.filter((t) => !t.isCompleted && (!t.snoozedUntil || t.snoozedUntil <= now));
  const completedTasks = tasks.filter((t) => t.isCompleted);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet — sits above the bottom nav (nav is ~72px + safe area) */}
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          bottom: "72px",
          background: "var(--color-card)",
          border: "1px solid oklch(0 0 0 / 0.12)",
          borderBottom: "none",
          maxWidth: "480px",
          margin: "0 auto",
          maxHeight: "520px",
          animation: "slideUp 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"           style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className={`${ORB_CLASSES[mode]} w-8 h-8 rounded-full flex items-center justify-center`}
              style={{ color: "var(--color-foreground)", fontSize: "13px", fontWeight: 700 }}
            >
              {activeTasks.length}
            </div>
            <div>
              <h2
                className="text-base tracking-wide"
                style={{ color: "var(--color-foreground)", fontWeight: 300, letterSpacing: "0.04em" }}
              >
                {mode}
              </h2>
              <p className="text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>
                {activeTasks.length} active · {completedTasks.length} done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditTask(null); setAddSheetOpen(true); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: `color-mix(in oklch, ${modeColor} 20%, transparent)`, color: modeColor, border: `1px solid color-mix(in oklch, ${modeColor} 35%, transparent)` }}
              aria-label={`Add ${mode} task`}
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
            <button onClick={onClose} style={{ color: "var(--color-muted-foreground)" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 pb-4 space-y-1.5">
          {isLoading ? (
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card h-12 animate-pulse" style={{ opacity: 0.4 }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm mb-3" style={{ color: "var(--color-muted-foreground)" }}>No {mode} tasks yet.</p>
              <button
                onClick={() => { setEditTask(null); setAddSheetOpen(true); }}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: `color-mix(in oklch, ${modeColor} 18%, transparent)`,
                  color: modeColor,
                  border: `1px solid color-mix(in oklch, ${modeColor} 35%, transparent)`,
                  letterSpacing: "0.02em",
                }}
              >
                Add first task
              </button>
            </div>
          ) : (
            <>
              {activeTasks.length > 0 && (
                <div className="space-y-1.5">
                  {activeTasks.map((task) => (
                    <SwipeableTaskRow
                      key={task.id}
                      isCompleted={task.isCompleted}
                      isPinned={task.isPinned}
                      modeColor={modeColor}
                      onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                    >
                      <TaskItem
                        task={task}
                        onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                        onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current ? { dayMode: mode } : {}) })}
                        onDelete={(id) => deleteMutation.mutate({ id })}
                        onEdit={(t) => { setEditTask(t); setAddSheetOpen(true); }}
                        taskModeColor={modeColor}
                      />
                    </SwipeableTaskRow>
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="mt-3">
                  <p
                    className="text-[12px] font-semibold tracking-wide uppercase mb-2 px-1"
                    style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
                  >
                    Completed
                  </p>
                  <div className="space-y-1.5">
                    {completedTasks.map((task) => (
                      <SwipeableTaskRow
                        key={task.id}
                        isCompleted={task.isCompleted}
                        isPinned={task.isPinned}
                        modeColor={modeColor}
                        onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                        onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                      >
                        <TaskItem
                          task={task}
                          onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                          onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current ? { dayMode: mode } : {}) })}
                          onDelete={(id) => deleteMutation.mutate({ id })}
                          onEdit={(t) => { setEditTask(t); setAddSheetOpen(true); }}
                          taskModeColor={modeColor}
                        />
                      </SwipeableTaskRow>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit sheet — stacked above orb sheet */}
      <AddTaskSheet
        open={addSheetOpen}
        onClose={() => { setAddSheetOpen(false); setEditTask(null); }}
        editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: (editTask as any).wealthFlow ?? false, projectId: (editTask as any).projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null, recurrence: (editTask as any).recurrence ?? null, lifeAreas: (editTask as any).lifeAreas ?? null } : undefined}
      />
    </>
  );
}
