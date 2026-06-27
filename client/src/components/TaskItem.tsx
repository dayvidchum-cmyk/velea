import { useState, useRef, useEffect } from "react";
import { Pin, Trash2, ChevronDown, ChevronUp, CalendarDays, Plus, X, Check, FolderOpen, Clock, AlarmClockOff } from "lucide-react";
import type { Task } from "../../../drizzle/schema";
import ModeTag from "./ModeTag";
import { trpc } from "@/lib/trpc";
import { PRIORITY_EXCLAIM, MODE_OKLCH, MODE_SOLID, MODE_CARD_GRADIENT, type TaskMode } from "../../../shared/types";


interface TaskItemProps {
  task: Task & { subtaskTotal?: number; subtaskCompleted?: number; projectName?: string | null };
  onToggleComplete: (id: number, current: boolean) => void;
  onTogglePin: (id: number, current: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
  /** Called when the row expands/collapses so parent can pass isExpanded to SwipeableTaskRow */
  onExpandChange?: (expanded: boolean) => void;
  /** Optional override for task's assigned mode color (used by Planner) */
  taskModeColor?: string;
  /** Active day mode — used to tint the card wrapper in the day's color */
  dayMode?: TaskMode;
}

function formatDueDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff <= 6) return `In ${diff}d`;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return due < today;
}

function isDueToday(dateStr: string): boolean {
  const d = new Date();
  const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return local === dateStr;
}



export default function TaskItem({ task, onToggleComplete, onTogglePin, onDelete, onEdit, onExpandChange, taskModeColor, dayMode }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    onExpandChange?.(expanded);
  }, [expanded, onExpandChange]);

  const collapsedTotal = task.subtaskTotal ?? 0;
  const collapsedCompleted = task.subtaskCompleted ?? 0;

  const { data: subtaskList = [] } = trpc.subtasks.list.useQuery(
    { taskId: task.id },
    { enabled: expanded }
  );

  const createSubtask = trpc.subtasks.create.useMutation({
    onSuccess: () => {
      utils.subtasks.list.invalidate({ taskId: task.id });
      setNewSubtaskTitle("");
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

  const snoozeTask = trpc.tasks.snooze.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.pinnedForToday.invalidate();
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.dueList.invalidate();
    },
  });

  const unsnoozeTask = trpc.tasks.unsnooze.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.modeCounts.invalidate();
      utils.tasks.pinnedForToday.invalidate();
      utils.tasks.rankedForToday.invalidate();
      utils.tasks.dueList.invalidate();
    },
  });

  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const isSnoozed = task.snoozedUntil && task.snoozedUntil > Date.now();

  useEffect(() => {
    if (addingSubtask) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  }, [addingSubtask]);

  const handleAddSubtask = () => {
    const t = newSubtaskTitle.trim();
    if (!t) return;
    createSubtask.mutate({ taskId: task.id, title: t });
  };

  const completedCount = expanded ? subtaskList.filter((s) => s.isCompleted).length : collapsedCompleted;
  const totalCount = expanded ? subtaskList.length : collapsedTotal;
  const hasSubtasks = totalCount > 0 || collapsedTotal > 0;

  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const dueToday = task.dueDate ? isDueToday(task.dueDate) : false;

  // Card background: deep mode gradient (same family as the hero card) so white
  // text is always legible. --ink stays white and cascades to all children.
  const cardBg = MODE_CARD_GRADIENT[task.mode as TaskMode] || MODE_CARD_GRADIENT.Action;
  const ink = "255, 255, 255";
  return (
    <div
      className={`overflow-hidden transition-all duration-200 rounded-lg ${task.isCompleted ? "opacity-60" : ""}`}
      style={{
        background: cardBg,
        color: "rgba(var(--ink),1)",
        ["--ink" as string]: ink,
      } as React.CSSProperties}
    >
      {/* Main row */}
      <div 
        className="flex items-center gap-3 p-3"
      >
        {/* Completion circle */}
        <button
          onClick={() => onToggleComplete(task.id, task.isCompleted)}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
          style={{
            borderColor: "rgba(var(--ink),0.9)",
            background: task.isCompleted ? "rgba(var(--ink),0.90)" : "transparent",
          }}
          aria-label={task.isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {task.isCompleted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d={`M1 4L3.5 6.5L9 1`} stroke={MODE_SOLID[task.mode as TaskMode] ?? "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + due date badge + subtask progress */}
        <div
          className="flex-1 text-left min-w-0"
        >
          <span
            className={`text-sm font-medium leading-snug block truncate ${task.isCompleted ? "line-through" : ""}`}
            style={{ color: task.isCompleted ? "rgba(var(--ink),0.5)" : "rgba(var(--ink),1)", fontFamily: "'Inter', ui-sans-serif, sans-serif" }}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {/* Due date badge */}
            {task.dueDate && !task.isCompleted && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(var(--ink),0.16)",
                  color: "rgba(var(--ink),0.96)",
                  letterSpacing: "0.04em",
                }}
              >
                <CalendarDays size={9} />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {/* Subtask progress badge */}
            {hasSubtasks && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(var(--ink),0.16)",
                  color: "rgba(var(--ink),0.96)",
                }}
              >
                {completedCount}/{totalCount}
              </span>
            )}
            {/* Project badge — subtle, only when a project is assigned */}
            {task.projectName && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(var(--ink),0.16)",
                  color: "rgba(var(--ink),0.93)",
                  letterSpacing: "0.03em",
                  opacity: task.isCompleted ? 0.5 : 0.85,
                }}
              >
                <FolderOpen size={8} />
                <span className="max-w-[80px] truncate">{task.projectName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Priority indicator */}
        {task.priority && task.priority !== 'Low' ? (
          <span
            className="text-[9px] font-bold tracking-tight flex-shrink-0"
            style={{ color: "rgba(var(--ink),0.5)", opacity: task.isCompleted ? 0.4 : 1, letterSpacing: "-0.02em" }}
          >
            {PRIORITY_EXCLAIM[task.priority as keyof typeof PRIORITY_EXCLAIM]}
          </span>
        ) : task.priority === 'Low' ? (
          <span
            className="text-[9px] font-bold tracking-tight flex-shrink-0"
            style={{ color: "rgba(var(--ink),0.35)", opacity: task.isCompleted ? 0.3 : 1, letterSpacing: "-0.02em" }}
          >
            !
          </span>
        ) : null}

        {/* Pin indicator */}
        {task.isPinned && (
          <Pin size={12} style={{ color: "rgba(var(--ink),0.45)", flexShrink: 0 }} />
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-shrink-0 p-1"
          style={{ color: "rgba(var(--ink),0.7)" }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(var(--ink),0.18)" }}>
          {/* Subtask list */}
          {subtaskList.length > 0 && (
            <div className="px-3 pt-2 pb-1 space-y-1">
              {subtaskList.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleSubtask.mutate({ id: sub.id, isCompleted: !sub.isCompleted })}
                    className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150"
                    style={{
                      borderColor: "rgba(var(--ink),0.9)",
                      background: sub.isCompleted ? "rgba(var(--ink),0.90)" : "transparent",
                    }}
                    aria-label={sub.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {sub.isCompleted && <Check size={9} style={{ color: MODE_OKLCH[task.mode as TaskMode] }} />}
                  </button>

                  <span
                    className={`flex-1 text-xs leading-snug ${sub.isCompleted ? "line-through" : ""}`}
                    style={{ color: sub.isCompleted ? "rgba(var(--ink),0.45)" : "rgba(var(--ink),0.96)" }}
                  >
                    {sub.title}
                  </span>

                  <button
                    onClick={() => deleteSubtask.mutate({ id: sub.id })}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded transition-opacity"
                    style={{ color: "rgba(var(--ink),0.6)" }}
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
                style={{ borderColor: "rgba(var(--ink),0.40)", background: "transparent" }}
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
                style={{ color: "rgba(var(--ink),0.96)" }}
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors disabled:opacity-40"
                style={{ background: "rgba(var(--ink),0.25)", color: "rgba(var(--ink),1)" }}
              >
                Add
              </button>
              <button
                onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(""); }}
                className="p-0.5"
                style={{ color: "rgba(var(--ink),0.6)" }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="px-3 pb-2">
              <button
                onClick={() => setAddingSubtask(true)}
                className="flex items-center gap-1.5 text-xs transition-opacity opacity-60 hover:opacity-100"
                style={{ color: "rgba(var(--ink),0.65)" }}
              >
                <Plus size={11} />
                Add subtask
              </button>
            </div>
          )}

          {/* Notes display */}
          {task.notes && (
            <div
              className="px-3 py-2 text-xs"
              style={{
                borderTop: "1px solid var(--color-border)",
                color: "rgba(var(--ink),0.9)",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5",
              }}
            >
              {task.notes}
            </div>
          )}

          {/* Actions row — two sub-rows: labels left, buttons right */}
          <div
            className="px-3 pb-3 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {/* Row 1: mode label + priority pill on left, action buttons on right */}
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: "rgba(var(--ink),0.20)", color: "rgba(var(--ink),0.96)" }}
              >
                {task.mode}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(var(--ink),0.20)",
                  color: "rgba(var(--ink),0.96)",
                }}
              >
                {PRIORITY_EXCLAIM[task.priority as keyof typeof PRIORITY_EXCLAIM] ?? "!"}
              </span>

              <div className="flex-1" />

              <button
                onClick={() => onEdit(task)}
                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                style={{
                  color: "rgba(var(--ink),0.96)",
                  background: "rgba(var(--ink),0.18)",
                  border: "1px solid rgba(var(--ink),0.25)",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => onTogglePin(task.id, task.isPinned)}
                className="text-xs font-medium px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                style={{
                  color: "rgba(var(--ink),0.96)",
                  background: task.isPinned ? "rgba(var(--ink),0.35)" : "rgba(var(--ink),0.18)",
                  border: "1px solid rgba(var(--ink),0.25)",
                }}
              >
                <Pin size={10} />
                {task.isPinned ? "Unpin" : "Pin"}
              </button>
            </div>{/* end Row 1 */}

            {/* Row 2: Snooze + Delete */}
            <div className="flex items-center gap-2">
              {isSnoozed ? (
                <button
                  onClick={() => unsnoozeTask.mutate({ id: task.id })}
                  className="text-xs font-medium px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                  style={{
                    color: "rgba(var(--ink),0.96)",
                    background: "rgba(var(--ink),0.18)",
                    border: "1px solid rgba(var(--ink),0.25)",
                  }}
                  aria-label="Unsnooze task"
                >
                  <AlarmClockOff size={11} />
                  Unsn.
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                    className="text-xs font-medium px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                    style={{
                      color: "rgba(var(--ink),0.96)",
                      background: "rgba(var(--ink),0.18)",
                      border: "1px solid rgba(var(--ink),0.25)",
                    }}
                    aria-label="Snooze task"
                  >
                    <Clock size={11} />
                    Snooze
                  </button>
                  {showSnoozeOptions && (
                    <div
                      className="absolute bottom-full left-0 mb-1 rounded-lg shadow-lg border p-1 z-50 min-w-[120px]"
                      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
                    >
                      <button
                        onClick={() => { snoozeTask.mutate({ id: task.id, duration: "1hour" }); setShowSnoozeOptions(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        1 hour
                      </button>
                      <button
                        onClick={() => { snoozeTask.mutate({ id: task.id, duration: "restOfDay" }); setShowSnoozeOptions(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        Rest of day
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 rounded-full transition-colors"
                style={{
                  color: "rgba(var(--ink),0.93)",
                  background: "rgba(var(--ink),0.18)",
                  border: "1px solid rgba(var(--ink),0.25)",
                }}
                aria-label="Delete task"
              >
                <Trash2 size={13} />
              </button>
            </div>{/* end Row 2 */}
          </div>
        </div>
      )}
    </div>
  );
}
