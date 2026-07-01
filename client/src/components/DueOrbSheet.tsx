import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { TaskMode } from "../../../shared/types";
import { MODE_OKLCH } from "../../../shared/types";
import { trpc } from "@/lib/trpc";
import AddTaskSheet from "./AddTaskSheet";
import SwipeableTaskRow from "./SwipeableTaskRow";
import TaskItem from "./TaskItem";
import type { Task } from "../../../drizzle/schema";

interface DueOrbSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function DueOrbSheet({ open, onClose }: DueOrbSheetProps) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: dueTasks = [], isLoading } = trpc.tasks.dueList.useQuery(undefined, { enabled: open });
  // Need today's mode to auto-assign when pinning
  const { data: todayPanchang } = trpc.panchang.today.useQuery(undefined, { enabled: open });
  const todayMode = todayPanchang?.mode as TaskMode | undefined;

  const updateMutation = trpc.tasks.update.useMutation({
    onMutate: async (input) => {
      await utils.tasks.dueList.cancel();
      const prev = utils.tasks.dueList.getData();
      utils.tasks.dueList.setData(undefined, (old) =>
        old?.map((t) =>
          t.id === input.id
            ? { ...t, isCompleted: input.isCompleted ?? t.isCompleted, isPinned: input.isPinned ?? t.isPinned }
            : t
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.dueList.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.tasks.dueList.invalidate();
      await utils.tasks.list.invalidate();
      await utils.tasks.modeCounts.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.dueList.cancel();
      const prev = utils.tasks.dueList.getData();
      utils.tasks.dueList.setData(undefined, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tasks.dueList.setData(undefined, ctx.prev);
    },
    onSettled: async () => {
      await utils.tasks.dueList.invalidate();
      await utils.tasks.list.invalidate();
      await utils.tasks.modeCounts.invalidate();
    },
  });

  const handleSave = (data: { title: string; mode: "Restraint" | "Build" | "Selective" | "Action"; priority: "High" | "Medium" | "Low"; isPinned: boolean; dueDate?: string | null }) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, ...data });
    }
    setAddOpen(false);
    setEditTask(null);
  };

  if (!open) return null;

  const active = dueTasks.filter((t) => !t.isCompleted);
  const done = dueTasks.filter((t) => t.isCompleted);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.35)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl"
        style={{
          bottom: "72px",
          maxHeight: "520px",
          background: "var(--color-card)",
          border: "1px solid oklch(0 0 0 / 0.12)",
          borderBottom: "none",
          display: "flex",
          flexDirection: "column",
          maxWidth: "480px",
          margin: "0 auto",
          animation: "slideUpDue 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes slideUpDue { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0 0 0 / 0.12)" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: "oklch(0.55 0.14 250)",
                color: "oklch(1 0 0)",
              }}
            >
              {active.length === 0 ? "+" : active.length}
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-foreground)" }}
              >
                Due
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                {active.length} active · {done.length} done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: "oklch(0.55 0.14 250 / 0.12)",
                color: "oklch(0.45 0.14 250)",
                border: "1px solid oklch(0.55 0.14 250 / 0.25)",
              }}
              aria-label="Add due task"
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 pt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "oklch(0 0 0 / 0.05)" }} />
              ))}
            </div>
          ) : active.length === 0 && done.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No tasks with due dates.</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>Add a due date to any task to see it here.</p>
            </div>
          ) : (
            <>
              {active.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  modeColor={MODE_OKLCH[task.mode as TaskMode]}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: true })}
                  onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned && todayMode ? { dayMode: todayMode } : {}) })}
                >
                  <TaskItem
                    task={task as any}
                    onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                    onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current && todayMode ? { dayMode: todayMode } : {}) })}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    onEdit={(t) => { setEditTask(t); setAddOpen(true); }}
                    taskModeColor={MODE_OKLCH[task.mode as TaskMode]}
                  />
                </SwipeableTaskRow>
              ))}

              {done.length > 0 && (
                <div className="pt-2">
                  <p
                    className="text-[12px] tracking-wide uppercase mb-2 px-1"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Completed
                  </p>
                  {done.map((task) => (
                    <SwipeableTaskRow
                      key={task.id}
                      isCompleted={task.isCompleted}
                      isPinned={task.isPinned}
                      modeColor={MODE_OKLCH[task.mode as TaskMode]}
                      onSwipeLeft={() => deleteMutation.mutate({ id: task.id })}
                      onSwipeRight={() => updateMutation.mutate({ id: task.id, isCompleted: false })}
                    >
                      <TaskItem
                        task={task as any}
                        onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                        onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current, ...(!current && todayMode ? { dayMode: todayMode } : {}) })}
                        onDelete={(id) => deleteMutation.mutate({ id })}
                        onEdit={(t) => { setEditTask(t); setAddOpen(true); }}
                        taskModeColor={MODE_OKLCH[task.mode as TaskMode]}
                      />
                    </SwipeableTaskRow>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditTask(null); }}
        editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: (editTask as any).wealthFlow ?? false, projectId: (editTask as any).projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null, recurrence: (editTask as any).recurrence ?? null, lifeAreas: (editTask as any).lifeAreas ?? null } : undefined}
      />
    </>
  );
}
