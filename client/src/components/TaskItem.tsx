import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pin, ChevronDown, ChevronUp, CalendarDays, Plus, X, Check, FolderOpen, Clock, AlarmClockOff, Repeat, Pencil } from "lucide-react";

const RECURRENCE_SHORT: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", biweekly: "2 wks", monthly: "Monthly", yearly: "Yearly",
};
import type { Task } from "../../../drizzle/schema";
import ModeTag from "./ModeTag";
import AlignmentDots from "./AlignmentDots";
import { trpc } from "@/lib/trpc";
import { kindOfTask } from "@/lib/taskKind";

// The unified kind palette (identical hexes to the orbs/calendar — one language).
const KIND_COLOR: Record<string, string> = {
  fixed: "#D4AF37", movable: "#00687a", swift: "#77A96B", tender: "#d57176",
  sharp: "#00525F", fierce: "#BC886F", mixed: "#C49A2E",
};
function shadeKindHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
import { PRIORITY_EXCLAIM, MODE_OKLCH, MODE_SOLID, MODE_CARD_GRADIENT, type TaskMode } from "../../../shared/types";
import { parseLifeAreas, housesForAreas, LIFE_AREA_BY_KEY } from "../../../shared/life-areas";


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
  /** Alignment with today (0–100) — renders a gold dot meter when provided. */
  alignment?: number;
  /** Quick-cycle the priority from the collapsed row (Low→Medium→High→Low). */
  onCyclePriority?: (id: number, next: "Low" | "Medium" | "High") => void;
  /** Toggle want/need from the collapsed row. */
  onSetIntent?: (id: number, next: "want" | "need") => void;
  /** Aligned list: hide the in-card badge row — the metadata + reasoning live in the Why-now pop-up. */
  compact?: boolean;
  /** Paper-quiet register (David's mock): paper card + day-accent hairline + dark ink;
      the kind speaks as a small dot beside the title, not a gradient billboard. */
  quiet?: boolean;
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



export default function TaskItem({ task, onToggleComplete, onTogglePin, onDelete, onEdit, onExpandChange, taskModeColor, dayMode, alignment, onCyclePriority, onSetIntent, compact, quiet }: TaskItemProps) {
  const NEXT_PRIORITY: Record<string, "Low" | "Medium" | "High"> = { Low: "Medium", Medium: "High", High: "Low" };
  const taskIntent = ((task as any).intent as "want" | "need" | undefined) ?? "need";
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
  const [showBarSnooze, setShowBarSnooze] = useState(false);
  const [barSnoozePos, setBarSnoozePos] = useState<{ top: number; left: number } | null>(null);

  // Open the bar snooze menu in a portal so the card's overflow-hidden can't
  // clip it. Position it relative to the clicked icon, clamped on-screen.
  function openBarSnooze(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (showBarSnooze) { setShowBarSnooze(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const width = 132;
    const menuH = 80;
    let left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    let top = r.bottom + 4;
    if (top + menuH > window.innerHeight - 8) top = r.top - menuH - 4;
    setBarSnoozePos({ top, left });
    setShowBarSnooze(true);
  }
  const isSnoozed = task.snoozedUntil && task.snoozedUntil > Date.now();
  const snoozedLabel = isSnoozed
    ? (() => {
        const d = new Date(task.snoozedUntil!);
        const now = new Date();
        const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
        if (d.toDateString() === now.toDateString()) return `Snoozed until ${t}`;
        if (d.toDateString() === tomorrow.toDateString()) return `Snoozed until tomorrow, ${t}`;
        return `Snoozed until ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`;
      })()
    : null;

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
  // Completion percent, DERIVED from subtasks (David 2026-07-15: "a percentage of
  // completion per task that can derive it from the completion of any subtasks").
  // A user-set percent for subtask-less tasks arrives with the effortSize migration.
  const derivedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;
  // No subtasks → the user's own declared percent carries the arc (David 2026-07-15:
  // "that % can be set by the user if they haven't made a subtask list").
  const manualPct = (task as any).completionPct as number | null | undefined;
  // Drag shows live; the write happens ONCE on release (not per notch).
  const [pctDraft, setPctDraft] = useState<number | null>(null);
  const effectivePct = derivedPct ?? (pctDraft ?? manualPct ?? null);
  const utils2 = trpc.useUtils();
  const setPctMutation = trpc.tasks.update.useMutation({
    onSuccess: () => { utils2.tasks.list.invalidate(); },
  });

  // Life areas + "song" highlight: a task is in focus today when one of its
  // life areas maps to the day's activated house (panchang).
  const { data: todayPanchang } = trpc.panchang.today.useQuery(undefined, {});
  const lifeAreaKeys = parseLifeAreas((task as any).lifeAreas ?? null);
  const todayHouse = (todayPanchang as any)?.houseActivated as number | undefined;
  const inFocusToday =
    !task.isCompleted && todayHouse != null && housesForAreas(lifeAreaKeys).includes(todayHouse);

  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const dueToday = task.dueDate ? isDueToday(task.dueDate) : false;

  // Card background: deep mode gradient (same family as the hero card) so white
  // text is always legible. --ink stays white and cascades to all children.
  // ONE LANGUAGE (David 2026-07-15: "they are still what I set them"): the card wears its
  // KIND's color — the same movement-derived palette as the orbs and calendar — not the
  // old stored mode tag. Gradient = the kind hex descending into its own shadow.
  const kind = kindOfTask(task);
  const kindHex = KIND_COLOR[kind];
  // Quiet cards are PAPER OBJECTS (the comment above always said so) — var(--color-card)
  // followed the theme into the indigo night and left the espresso ink invisible (David's
  // 4:23 AM ghost cards). Paper never follows the theme; the ink can stay espresso forever.
  const cardBg = quiet
    ? "var(--parchment)"
    : `linear-gradient(160deg, ${shadeKindHex(kindHex, 0.92)} 0%, ${shadeKindHex(kindHex, 0.7)} 60%, ${shadeKindHex(kindHex, 0.5)} 100%)`;
  const ink = quiet ? "62, 53, 42" : "255, 255, 255";
  return (
    <div
      className={`overflow-hidden transition-all duration-200 rounded-lg ${task.isCompleted ? "opacity-60" : ""}`}
      style={{
        background: cardBg,
        color: "rgba(var(--ink),1)",
        ["--ink" as string]: ink,
        ...(quiet ? { border: "1px solid color-mix(in srgb, var(--day-accent) 45%, transparent)" } : {}),
      } as React.CSSProperties}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-2 p-3"
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
            {quiet && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: kindHex, marginRight: 7, verticalAlign: "1px" }} />}
            {task.title}
          </span>
          {/* Collapsed row: only the golden dots + subtask count. Everything else (mode, due,
              life-areas, project, want/need, focus) is noise here — it lives in edit/expand. */}
          {((alignment != null && !task.isCompleted) || hasSubtasks || (manualPct != null && !task.isCompleted)) && (
            <div className="flex items-center gap-2 mt-0.5">
              {alignment != null && !task.isCompleted && <AlignmentDots alignment={alignment} />}
              {hasSubtasks ? (
                <span className="text-[12px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(var(--ink),0.16)", color: "rgba(var(--ink),0.96)" }}>
                  {completedCount}/{totalCount}{derivedPct != null ? ` · ${derivedPct}%` : ""}
                </span>
              ) : manualPct != null && !task.isCompleted ? (
                <span className="text-[12px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(var(--ink),0.16)", color: "rgba(var(--ink),0.96)" }}>
                  {manualPct}%
                </span>
              ) : null}
              {(task as any).effortSize && !task.isCompleted && (
                <span className="text-[11px] font-medium capitalize" style={{ color: "rgba(var(--ink),0.65)" }}>
                  {(task as any).effortSize}
                </span>
              )}
            </div>
          )}
          {snoozedLabel && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} style={{ color: "rgba(var(--ink),0.5)" }} />
              <span className="text-[11px] font-medium" style={{ color: "rgba(var(--ink),0.5)" }}>
                {snoozedLabel}
              </span>
            </div>
          )}
        </div>

        {/* Collapsed row stays QUIET (David 2026-07-16: "i cant read my task because the
            icon buttons take up so much") — only passive whispers here; the action icons
            (priority, pin, snooze, edit) appear when the row EXPANDS. */}
        {!expanded && task.isPinned && <Pin size={12} fill="currentColor" className="flex-shrink-0" style={{ color: "rgba(var(--ink),0.65)" }} />}
        {!expanded && task.priority && task.priority !== "Low" && (
          <span className="flex-shrink-0 text-[11px] font-bold" style={{ color: "rgba(var(--ink),0.55)", letterSpacing: "-0.02em" }}>
            {PRIORITY_EXCLAIM[(task.priority as keyof typeof PRIORITY_EXCLAIM)] ?? "!"}
          </span>
        )}
        {expanded && <>
        {/* Priority — tap to cycle Low→Medium→High */}
        <button
          onClick={(e) => { e.stopPropagation(); onCyclePriority?.(task.id, NEXT_PRIORITY[task.priority ?? "Low"]); }}
          className="text-[12px] font-bold tracking-tight flex-shrink-0 px-1 py-1 -mx-0.5 rounded"
          style={{ color: task.priority && task.priority !== "Low" ? "rgba(var(--ink),0.6)" : "rgba(var(--ink),0.3)", opacity: task.isCompleted ? 0.4 : 1, letterSpacing: "-0.02em" }}
          aria-label={`Priority ${task.priority ?? "Low"} — tap to change`}
          title={`Priority: ${task.priority ?? "Low"} (tap to change)`}
        >
          {PRIORITY_EXCLAIM[(task.priority as keyof typeof PRIORITY_EXCLAIM) ?? "Low"] ?? "!"}
        </button>

        {/* Pin — tap to pin / unpin */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(task.id, !!task.isPinned); }}
          className="flex-shrink-0 p-1 rounded"
          style={{ color: task.isPinned ? "rgba(var(--ink),0.9)" : "rgba(var(--ink),0.3)" }}
          aria-label={task.isPinned ? "Unpin task" : "Pin task"}
          title={task.isPinned ? "Unpin" : "Pin to Do Now"}
        >
          <Pin size={13} fill={task.isPinned ? "currentColor" : "none"} />
        </button>

        {/* Snooze / Unsnooze — quick access without expanding the task */}
        {!task.isCompleted && (
          isSnoozed ? (
            <button
              onClick={(e) => { e.stopPropagation(); unsnoozeTask.mutate({ id: task.id }); }}
              className="flex-shrink-0 p-1"
              style={{ color: "rgba(var(--ink),0.7)" }}
              aria-label="Unsnooze task"
            >
              <AlarmClockOff size={14} />
            </button>
          ) : (
            <div className="flex-shrink-0">
              <button
                onClick={openBarSnooze}
                className="p-1"
                style={{ color: showBarSnooze ? "rgba(var(--ink),1)" : "rgba(var(--ink),0.7)" }}
                aria-label="Snooze task"
              >
                <Clock size={14} />
              </button>
              {showBarSnooze && barSnoozePos && createPortal(
                <>
                  <div
                    onClick={() => setShowBarSnooze(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 80 }}
                  />
                  <div
                    style={{
                      position: "fixed",
                      top: barSnoozePos.top,
                      left: barSnoozePos.left,
                      width: 132,
                      zIndex: 81,
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
                      padding: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() => { snoozeTask.mutate({ id: task.id, duration: "1hour" }); setShowBarSnooze(false); }}
                      className="w-full text-left text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      1 hour
                    </button>
                    <button
                      onClick={() => { snoozeTask.mutate({ id: task.id, duration: "restOfDay" }); setShowBarSnooze(false); }}
                      className="w-full text-left text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      Rest of day
                    </button>
                  </div>
                </>,
                document.body
              )}
            </div>
          )
        )}

        {/* Edit — opens the editor (moved off the expanded view) */}
        {!task.isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="flex-shrink-0 p-1"
            style={{ color: "rgba(var(--ink),0.7)" }}
            aria-label="Edit task"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
        )}

        </>}
        {/* Delete lives on swipe-right (deliberate gesture) + inside the edit sheet now —
            removed from the collapsed strip to de-clutter and prevent accidental taps. */}

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
                className="text-[12px] font-medium px-2 py-0.5 rounded-full transition-colors disabled:opacity-40"
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

          {/* Progress — the user's own percent, ONLY for tasks without a subtask list
              (subtasks own the number the moment they exist). */}
          {!hasSubtasks && !task.isCompleted && (
            <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: "rgba(var(--ink),0.82)" }}>How far along?</span>
                <span className="text-xs font-semibold" style={{ color: "rgba(var(--ink),0.95)" }}>{pctDraft ?? manualPct ?? 0}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={pctDraft ?? manualPct ?? 0}
                onChange={(e) => setPctDraft(Number(e.target.value))}
                onPointerUp={() => { if (pctDraft != null) setPctMutation.mutate({ id: task.id, completionPct: pctDraft }); }}
                onKeyUp={() => { if (pctDraft != null) setPctMutation.mutate({ id: task.id, completionPct: pctDraft }); }}
                className="w-full"
                style={{ accentColor: "rgba(var(--ink),0.9)" }}
              />
            </div>
          )}

          {/* Recurrence — the only expanded footer. Mode is the card's color; edit / pin /
              snooze / delete all live on the collapsed row now. */}
          {(task as any).recurrence && (task as any).recurrence !== "none" && (
            <div className="px-3 pb-3 pt-2 flex items-center gap-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
              <Repeat size={12} style={{ color: "rgba(var(--ink),0.7)" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(var(--ink),0.82)" }}>
                Repeats {(RECURRENCE_SHORT[(task as any).recurrence] ?? "on a schedule").toLowerCase()}
              </span>
            </div>
          )}
        </div>
      )}
      {/* The task's arc — a hairline fill along the bottom edge (subtask-derived, or the
          user's own declared percent when no subtask list exists). */}
      {effectivePct != null && !task.isCompleted && (
        // An inset rounded meter — deliberately a design element, not a stripe kissing the
        // card's edge (David: the full-bleed bar "looks like a glitch").
        <div style={{ margin: "0 12px 10px", height: 4, borderRadius: 999, background: "rgba(var(--ink),0.18)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${effectivePct}%`, background: "rgba(var(--ink),0.9)", borderRadius: 999, transition: "width 300ms ease" }} />
        </div>
      )}
    </div>
  );
}
