import { useState, useRef, useEffect } from "react";
import { X, Plus, CheckCircle2, Circle, Pencil, Pin, PinOff, Trash2, ChevronDown, ChevronUp, Check, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AddTaskSheet from "./AddTaskSheet";
import SwipeableTaskRow from "./SwipeableTaskRow";
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        old?.map((t) => (t.id === input.id ? { ...t, ...input } : t))
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
              style={{ color: "var(--color-foreground)", fontSize: "11px", fontWeight: 700 }}
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
              <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
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
                      isExpanded={expandedId === task.id}
                      onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                    >
                      <OrbTaskRow
                        task={task}
                        modeColor={modeColor}
                        expanded={expandedId === task.id}
                        onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                        onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                        onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                        onEdit={() => { setEditTask(task); setAddSheetOpen(true); }}
                        onDelete={() => deleteMutation.mutate({ id: task.id })}
                      />
                    </SwipeableTaskRow>
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="mt-3">
                  <p
                    className="text-[10px] font-semibold tracking-wide uppercase mb-2 px-1"
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
                        isExpanded={expandedId === task.id}
                        onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                        onSwipeRight={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                      >
                        <OrbTaskRow
                          task={task}
                          modeColor={modeColor}
                          expanded={expandedId === task.id}
                          onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                          onToggleComplete={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                          onTogglePin={() => updateMutation.mutate({ id: task.id, isPinned: !task.isPinned, ...(!task.isPinned ? { dayMode: mode } : {}) })}
                          onEdit={() => { setEditTask(task); setAddSheetOpen(true); }}
                          onDelete={() => deleteMutation.mutate({ id: task.id })}
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
        editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: (editTask as any).wealthFlow ?? false, projectId: (editTask as any).projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null, recurrence: (editTask as any).recurrence ?? null } : undefined}
      />
    </>
  );
}

interface OrbTaskRowProps {
  task: Task & { subtaskTotal?: number; subtaskCompleted?: number };
  modeColor: string;
  expanded: boolean;
  onExpand: () => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function OrbTaskRow({ task, modeColor, expanded, onExpand, onToggleComplete, onTogglePin, onEdit, onDelete }: OrbTaskRowProps) {
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const collapsedTotal = task.subtaskTotal ?? 0;
  const collapsedCompleted = task.subtaskCompleted ?? 0;

  const { data: subtaskList = [] } = trpc.subtasks.list.useQuery(
    { taskId: task.id },
    { enabled: expanded && task.id > 0 }
  );

  const createSubtask = trpc.subtasks.create.useMutation({
    onSuccess: () => {
      utils.subtasks.list.invalidate({ taskId: task.id });
      setNewSubtaskTitle("");
      // Keep addingSubtask true so user can keep adding
    },
  });

  const toggleSubtask = trpc.subtasks.toggle.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.subtasks.list.cancel({ taskId: task.id });
      const prev = utils.subtasks.list.getData({ taskId: task.id });
      utils.subtasks.list.setData({ taskId: task.id }, (old) =>
        old?.map((s) => (s.id === id ? { ...s, isCompleted } : s))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.subtasks.list.setData({ taskId: task.id }, ctx.prev);
    },
  });

  const deleteSubtask = trpc.subtasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.subtasks.list.cancel({ taskId: task.id });
      const prev = utils.subtasks.list.getData({ taskId: task.id });
      utils.subtasks.list.setData({ taskId: task.id }, (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.subtasks.list.setData({ taskId: task.id }, ctx.prev);
    },
  });

  useEffect(() => {
    if (addingSubtask) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  }, [addingSubtask]);

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    createSubtask.mutate({ taskId: task.id, title });
  };

  const completedCount = expanded ? subtaskList.filter((s) => s.isCompleted).length : collapsedCompleted;
  const totalCount = expanded ? subtaskList.length : collapsedTotal;
  const hasSubtasks = totalCount > 0 || collapsedTotal > 0;



  const overdue = task.dueDate ? (() => { const t = new Date(); t.setHours(0,0,0,0); return new Date(task.dueDate + "T00:00:00") < t; })() : false;
  const dueToday = task.dueDate ? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` === task.dueDate; })() : false;

  function formatDue(d: string) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(d + "T00:00:00");
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff <= 6) return `In ${diff}d`;
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div
      className="overflow-hidden transition-all duration-200 rounded-xl"
      style={{
        background: MODE_CARD_GRADIENT[task.mode as TaskMode] ?? "var(--color-card)",
        border: "none",
        color: "#fff",
        opacity: task.isCompleted ? 0.55 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3" onClick={onEdit} style={{ cursor: "pointer" }}>
        {/* Complete toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
          style={{
            borderColor: "rgba(255,255,255,0.80)",
            background: task.isCompleted ? "rgba(255,255,255,0.90)" : "transparent",
          }}
        >
          {task.isCompleted ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke={MODE_SOLID[task.mode as TaskMode] ?? "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>

        {/* Title + due date badge + subtask badge */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium block truncate ${task.isCompleted ? "line-through" : ""}`}
            style={{ color: task.isCompleted ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.95)" }}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.dueDate && !task.isCompleted && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "0.04em",
                }}
              >
                <CalendarDays size={9} />
                {formatDue(task.dueDate)}
              </span>
            )}
            {hasSubtasks && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {completedCount}/{totalCount}
              </span>
            )}
          </div>
        </div>

        {/* Priority */}
        <span
          className="text-xs font-bold flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}
        >
          {PRIORITY_EXCLAIM[task.priority as keyof typeof PRIORITY_EXCLAIM] ?? "!"}
        </span>

        {/* Pin indicator */}
        {task.isPinned && (
          <Pin size={11} style={{ color: "rgba(255,255,255,0.80)", flexShrink: 0 }} />
        )}

        {/* Expand chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="flex-shrink-0 p-1"
          style={{ color: "var(--color-muted-foreground)" }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Subtask list */}
          {subtaskList.length > 0 && (
            <div className="px-3 pt-2 pb-1 space-y-1">
              {subtaskList.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleSubtask.mutate({ id: sub.id, isCompleted: !sub.isCompleted })}
                    className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150"
                    style={{
                      borderColor: "rgba(255,255,255,0.80)",
                      background: sub.isCompleted ? "rgba(255,255,255,0.90)" : "transparent",
                    }}
                    aria-label={sub.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {sub.isCompleted && <Check size={9} style={{ color: MODE_SOLID[task.mode as TaskMode] ?? "#888" }} />}
                  </button>
                  <span
                    className={`flex-1 text-xs leading-snug ${sub.isCompleted ? "line-through" : ""}`}
                    style={{ color: sub.isCompleted ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.9)" }}
                  >
                    {sub.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate({ id: sub.id })}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded transition-opacity"
                    style={{ color: "oklch(0.52 0.12 15)" }}
                    aria-label="Delete subtask"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask row */}
          {addingSubtask ? (
            <div className="px-3 pb-2 flex items-center gap-2">
              <div
                className="flex-shrink-0 w-4 h-4 rounded border"
                style={{ borderColor: "rgba(255,255,255,0.50)", background: "transparent" }}
              />
              <input
                ref={addInputRef}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                    setTimeout(() => addInputRef.current?.focus(), 80);
                  }
                  if (e.key === "Escape") { setAddingSubtask(false); setNewSubtaskTitle(""); }
                }}
                placeholder="Subtask title…"
                className="flex-1 text-xs bg-transparent outline-none"
                style={{ color: "var(--color-foreground)" }}
              />
              <button
                onClick={() => { handleAddSubtask(); setTimeout(() => addInputRef.current?.focus(), 80); }}
                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors disabled:opacity-40"
                style={{ background: MODE_OKLCH[task.mode as TaskMode], color: "oklch(1 0 0)" }}
              >
                Add
              </button>
              <button
                onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(""); }}
                className="p-0.5"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="px-3 pb-2">
              <button
                onClick={() => setAddingSubtask(true)}
                className="flex items-center gap-1.5 text-xs transition-opacity opacity-60 hover:opacity-100"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <Plus size={11} />
                Add subtask
              </button>
            </div>
          )}

          {/* Actions row */}
          <div
            className="px-3 pb-3 flex items-center gap-2 flex-wrap"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: "var(--color-card)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
            >
              <Pencil size={11} /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: task.isPinned ? MODE_OKLCH[task.mode as TaskMode] : "var(--color-card)",
                color: task.isPinned ? "oklch(1 0 0)" : "var(--color-foreground)",
                border: `1px solid ${task.isPinned ? MODE_OKLCH[task.mode as TaskMode] : "var(--color-border)"}`,
              }}
            >
              {task.isPinned ? <PinOff size={11} /> : <Pin size={11} />}
              {task.isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ml-auto"
              style={{ background: "var(--color-card)", color: "oklch(0.52 0.12 15)", border: "1px solid oklch(0.52 0.12 15 / 0.40)" }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
