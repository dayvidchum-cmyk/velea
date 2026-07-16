import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, Plus, Trash2, FolderOpen, ChevronDown, Repeat, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TASK_MODES, MODE_OKLCH } from "../../../shared/types";
import { suggestTaskMode } from "../../../shared/suggest-mode";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import { LIFE_AREAS, parseLifeAreas } from "../../../shared/life-areas";
import { useAuth } from "@/_core/hooks/useAuth";

const TASK_PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const PRIORITY_EXCLAIM: Record<TaskPriority, string> = { High: "!!!", Medium: "!!", Low: "!" };

type LoadLevel = "Low" | "Medium" | "High";
const LOAD_LEVELS: LoadLevel[] = ["Low", "Medium", "High"];

interface AddTaskSheetProps {
  open: boolean;
  onClose: () => void;
  initialMode?: TaskMode;
  // When true, initialMode is a SOFT default (a starting color) that does NOT count as a
  // manual pick — so the mode suggestion still blooms and can override it, exactly like the
  // mode-less Projects/Tasks add. The FAB uses this (it pre-tags today's mode only as a hint).
  // Orb-launched adds omit it: tapping an orb IS a deliberate mode choice, so it stays locked.
  openWithSuggestion?: boolean;
  /** Prefill the due date (the year page's "+ Task this day" — David 2026-07-16). */
  initialDueDate?: string;
  initialProjectId?: number | null;
  editTask?: {
    id: string;
    title: string;
    mode: string;
    priority: number;
    dueDate?: string;
    isPinned: boolean;
    wealthFlow?: boolean;
    projectId?: number | null;
    cognitiveLoad?: LoadLevel | null;
    physicalLoad?: LoadLevel | null;
    creativeRequired?: boolean | null;
    socialRequired?: boolean | null;
    emotionalLoad?: LoadLevel | null;
    notes?: string | null;
    recurrence?: Recurrence | null;
    lifeAreas?: string | string[] | null;
  };
}

export type Recurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * useSheetHeight
 *
 * Returns the correct sheet height accounting for the iOS Safari keyboard.
 * Uses window.visualViewport.height (the visible area above the keyboard)
 * so the sheet shrinks when the keyboard opens instead of being covered.
 *
 * Only listens to `resize` — NOT `scroll` — to avoid jumps during
 * iOS rubber-band bounce scrolling.
 */
function useSheetHeight(navBarHeight = 83): { height: string; bottom: number } {
  const [vp, setVp] = useState<{ height: string; bottom: number }>({
    height: `calc(100dvh - ${navBarHeight}px)`,
    bottom: 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      // Keyboard height = gap between the layout-viewport bottom and the visible
      // (visual-viewport) bottom. Push the sheet UP by that much so its bottom
      // edge (the Save button) sits above the keyboard instead of sliding under it.
      const keyboard = Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop);
      const availableHeight = vv!.height - navBarHeight;
      setVp({ height: `${Math.max(200, availableHeight)}px`, bottom: keyboard });
    }

    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, [navBarHeight]);

  return vp;
}

// ─── Inline project selector ─────────────────────────────────────────────────

function ProjectSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const { data: projects = [] } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Position the fixed menu relative to the trigger button
  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = Math.min(220, (projects.length + 1) * 44 + 8);

    if (spaceBelow >= menuHeight || spaceBelow >= 120) {
      // Open downward
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      // Open upward when not enough space below
      setMenuStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(true);
  }, [projects.length]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedProject = projects.find((p) => p.id === value);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openMenu()}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm transition-all"
        style={{
          background: "var(--color-secondary)",
          border: `1px solid ${value ? "var(--border)" : "var(--border)"}`,
          color: value ? "var(--color-foreground)" : "var(--color-muted-foreground)",
        }}
      >
        <FolderOpen size={14} style={{ flexShrink: 0, color: value ? "var(--foreground)" : "var(--color-muted-foreground)" }} />
        <span className="flex-1 text-left truncate">
          {selectedProject ? selectedProject.name : "No project"}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: "var(--color-muted-foreground)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden"
          style={{
            ...menuStyle,
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 24px var(--border)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {/* No project option */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors"
            style={{
              color: value === null ? "var(--foreground)" : "var(--color-muted-foreground)",
              background: value === null ? "var(--input)" : "transparent",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <X size={12} />
            <span>No project</span>
          </button>

          {/* Project options */}
          {projects.length === 0 ? (
            <div
              className="px-3 py-3 text-xs text-center"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              No projects yet. Create one in Projects.
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => { onChange(project.id); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors"
                style={{
                  color: value === project.id ? "var(--foreground)" : "var(--color-foreground)",
                  background: value === project.id ? "var(--input)" : "transparent",
                }}
              >
                <FolderOpen size={12} style={{ flexShrink: 0 }} />
                <span className="truncate">{project.name}</span>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Main sheet ──────────────────────────────────────────────────────────────

export default function AddTaskSheet({ open, onClose, initialMode, openWithSuggestion, initialProjectId, editTask, initialDueDate }: AddTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<TaskMode>("Build");
  const [modeTouched, setModeTouched] = useState(false); // manual pick wins over suggestion
  const [suggestion, setSuggestion] = useState<{ mode: TaskMode; reason: string } | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  // How much of the day the task asks for (David 2026-07-15: "a spot at the top…
  // quick, sitting, long"). Nullable — undeclared is fine.
  const [effortSize, setEffortSize] = useState<"quick" | "sitting" | "long" | null>(null);
  const [intent, setIntent] = useState<"want" | "need">("need");
  const [dueDate, setDueDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [wealthFlow, setWealthFlow] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [subtasks, setSubtasks] = useState<{ id?: number; title: string }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  // Task metadata for Current State scoring
  const [cognitiveLoad, setCognitiveLoad] = useState<LoadLevel>("Medium");
  const [physicalLoad, setPhysicalLoad] = useState<LoadLevel>("Low");
  const [creativeRequired, setCreativeRequired] = useState(false);
  const [socialRequired, setSocialRequired] = useState(false);
  const [emotionalLoad, setEmotionalLoad] = useState<LoadLevel>("Low");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [isNewVenture, setIsNewVenture] = useState<boolean | null>(null); // David's law: Action owns the NEW

  // Suggest the mode from the task's own fingerprint (David's law: Action owns the
  // NEW; Build/Selective/Restraint tend the existing). Deterministic, no API. The
  // suggestion only steers while the user hasn't picked by hand.
  useEffect(() => {
    if (!open) return;
    const sug = suggestTaskMode({ title, cognitiveLoad, physicalLoad, emotionalLoad, creativeRequired, socialRequired, recurrence, projectId, isNewVenture });
    setSuggestion(sug);
    if (!modeTouched && title.trim().length >= 3) setMode(sug.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, cognitiveLoad, physicalLoad, emotionalLoad, creativeRequired, socialRequired, recurrence, projectId, isNewVenture, modeTouched]);

  const [lifeAreas, setLifeAreas] = useState<string[]>([]);
  // The native date input always renders a date-shaped placeholder, which reads
  // as "due today." Hide it behind an explicit affordance until the user opts in.
  const [showDuePicker, setShowDuePicker] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { height: sheetHeight, bottom: sheetBottom } = useSheetHeight(83);

  const utils = trpc.useUtils();

  // Invalidate ALL task + project queries on any create/update — an explicit allowlist kept
  // missing one (ranked list, project task list…), forcing manual refreshes. This is leak-proof.
  const refreshAllLists = async () => { await utils.tasks.invalidate(); await utils.projects.invalidate(); };
  const createTask = trpc.tasks.create.useMutation({ onSuccess: refreshAllLists });
  const updateTask = trpc.tasks.update.useMutation({ onSuccess: refreshAllLists });
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: refreshAllLists });
  // Delete now lives here (removed from the collapsed row) — two-tap confirm so it can't
  // be triggered by accident.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createSubtask = trpc.subtasks.create.useMutation();
  const deleteSubtask = trpc.subtasks.delete.useMutation();
  // Load the task's existing subtasks when editing so they can be edited (add/remove), not just
  // created. originalSubtaskIds lets the save know which were removed and delete them.
  const editTaskId = editTask ? parseInt(editTask.id, 10) : null;
  const existingSubtasks = trpc.subtasks.list.useQuery({ taskId: editTaskId ?? 0 }, { enabled: open && editTaskId != null });
  const originalSubtaskIds = useRef<number[]>([]);
  useEffect(() => {
    if (open && editTaskId != null && existingSubtasks.data) {
      setSubtasks(existingSubtasks.data.map((s: any) => ({ id: s.id, title: s.title })));
      originalSubtaskIds.current = existingSubtasks.data.map((s: any) => s.id);
    }
  }, [open, editTaskId, existingSubtasks.data]);

  // Initialize form when sheet opens or editTask changes
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);

    if (editTask) {
      setTitle(editTask.title);
      setMode(editTask.mode as TaskMode);
      setModeTouched(true); // editing: respect the stored choice
      setSuggestion(null);
      setIsNewVenture((editTask as any).isNewVenture ?? null);
      setPriority(editTask.priority === 3 ? "High" : editTask.priority === 2 ? "Medium" : "Low");
      setIntent(((editTask as any).intent as "want" | "need") ?? "need");
      setDueDate(editTask.dueDate || "");
      setIsPinned(editTask.isPinned);
      setWealthFlow(editTask.wealthFlow ?? false);
      setProjectId(editTask.projectId ?? null);
      setCognitiveLoad((editTask.cognitiveLoad as LoadLevel) ?? "Medium");
      setPhysicalLoad((editTask.physicalLoad as LoadLevel) ?? "Low");
      setCreativeRequired(editTask.creativeRequired ?? false);
      setSocialRequired(editTask.socialRequired ?? false);
      setEmotionalLoad((editTask.emotionalLoad as LoadLevel) ?? "Low");
      setNotes(editTask.notes ?? "");
      setEffortSize(((editTask as any).effortSize as "quick" | "sitting" | "long" | null) ?? null);
      setRecurrence((editTask.recurrence as Recurrence) ?? "none");
      setLifeAreas(
        Array.isArray(editTask.lifeAreas)
          ? editTask.lifeAreas
          : parseLifeAreas(editTask.lifeAreas ?? null)
      );
      setShowDuePicker(!!editTask.dueDate);
    } else {
      setTitle("");
      setEffortSize(null);
      setMode(initialMode ?? "Build");
      // openWithSuggestion → the prefilled mode is a soft default, NOT a manual pick, so the
      // suggestion still blooms (FAB). Otherwise a passed initialMode means the orb chose it.
      setModeTouched(openWithSuggestion ? false : !!initialMode);
      setSuggestion(null);
      setIsNewVenture(null);
      setPriority("Medium");
      setIntent("need");
      setDueDate(initialDueDate ?? "");
      setShowDuePicker(!!initialDueDate);
      setIsPinned(false);
      setWealthFlow(false);
      setProjectId(initialProjectId ?? null);
      setSubtasks([]);
      setNewSubtaskTitle("");
      setCognitiveLoad("Medium");
      setPhysicalLoad("Low");
      setCreativeRequired(false);
      setSocialRequired(false);
      setEmotionalLoad("Low");
      setNotes("");
      setRecurrence("none");
      setLifeAreas([]);
      setShowDuePicker(false);
    }

    // Delay focus so the sheet animation completes first
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 150);
  }, [open, editTask, initialProjectId]);

  // Scroll the active element into view when the subtask input is focused
  const scrollSubtaskIntoView = useCallback(() => {
    setTimeout(() => {
      subtaskInputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 100);
  }, []);

  const handleAddSubtask = useCallback(() => {
    if (newSubtaskTitle.trim()) {
      setSubtasks((prev) => [...prev, { title: newSubtaskTitle.trim() }]);
      setNewSubtaskTitle("");
      // Keep focus on the subtask input and scroll it into view
      setTimeout(() => {
        subtaskInputRef.current?.focus();
        subtaskInputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
    }
  }, [newSubtaskTitle]);

  const handleRemoveSubtask = useCallback((index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubtaskKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddSubtask();
      }
    },
    [handleAddSubtask]
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    try {
      if (editTask) {
        await updateTask.mutateAsync({
          id: parseInt(editTask.id, 10),
          title,
          mode,
          priority,
          intent,
          dueDate: dueDate || null,
          isPinned,
          wealthFlow,
          projectId: projectId,
          cognitiveLoad,
          physicalLoad,
          creativeRequired,
          socialRequired,
          emotionalLoad,
          notes: notes || null,
          recurrence,
          lifeAreas,
          isNewVenture,
          effortSize,
        });

        // Sync subtasks in edit mode: create the newly-added ones, delete the removed ones.
        for (const s of subtasks) {
          if (s.id == null && s.title.trim()) {
            await createSubtask.mutateAsync({ taskId: parseInt(editTask.id, 10), title: s.title.trim() });
          }
        }
        const keptIds = subtasks.filter((s) => s.id != null).map((s) => s.id!);
        for (const id of originalSubtaskIds.current) {
          if (!keptIds.includes(id)) await deleteSubtask.mutateAsync({ id });
        }
        await utils.subtasks.list.invalidate({ taskId: parseInt(editTask.id, 10) });
      } else {
        const task = await createTask.mutateAsync({
          title,
          mode,
          priority,
          intent,
          dueDate: dueDate || null,
          isPinned,
          wealthFlow,
          projectId: projectId,
          cognitiveLoad,
          physicalLoad,
          creativeRequired,
          socialRequired,
          emotionalLoad,
          notes: notes || null,
          recurrence,
          lifeAreas,
          isNewVenture,
          effortSize,
        });

        if (task && subtasks.length > 0) {
          for (const s of subtasks) {
            if (s.title.trim()) await createSubtask.mutateAsync({ taskId: task.id, title: s.title.trim() });
          }
          await utils.tasks.list.invalidate();
        }
      }
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }, [title, mode, priority, intent, dueDate, isPinned, wealthFlow, projectId, cognitiveLoad, physicalLoad, creativeRequired, socialRequired, emotionalLoad, notes, recurrence, lifeAreas, subtasks, editTask, createTask, updateTask, createSubtask, utils, onClose]);

  // Title field: Enter does NOT save — user must tap Save button.
  // This prevents accidental saves and avoids the scroll-lock bug where
  // focus returning to the title input after Enter locked the scroll container.
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Blur the title so the keyboard can be dismissed if desired
      titleInputRef.current?.blur();
    }
  }, []);

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50"
        onClick={onClose}
      />

      {/* Sheet Container — height tracks visual viewport so keyboard doesn't cover content */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl bg-background flex flex-col"
        style={{ height: sheetHeight, maxHeight: sheetHeight, bottom: sheetBottom }}
      >
        {/* Header — never scrolls */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <h2
            className="text-lg font-semibold tracking-wide"
          >
            {editTask ? "EDIT TASK" : "NEW TASK"}
          </h2>
          <div className="flex items-center gap-2">
            {editTask && (
              <button
                onClick={handleSave}
                disabled={!title.trim() || createTask.isPending || updateTask.isPending}
                className="px-3 py-1.5 rounded-full text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                Save Changes
              </button>
            )}
            <button onClick={onClose} className="p-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content — flex-1 + overflow-y-auto ensures it fills remaining space */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{
            // Extra bottom padding so the last item (Save button) is never hidden
            // behind the keyboard even on very small screens. 120px ensures the
            // Save button clears the iOS home indicator + keyboard toolbar.
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)",
          }}
        >
          {/* Title input */}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Task title..."
            className="w-full px-4 py-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground mb-6 focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {/* SIZE — how much of the day this asks for (David: quick / sitting / long).
              The spot at the top; feeds the scorer (quick fits a low tank, long needs room). */}
          <div className="mb-6">
            <label className="block text-[12px] font-semibold tracking-wide uppercase mb-2" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}>
              How much of the day does this ask?
            </label>
            {/* Each pill says WHAT IT MEANS (David: "SIZE & the three options doesn't
                communicate clearly at all") — the word + its lived measure. */}
            <div className="flex gap-2">
              {([
                { key: "quick", word: "Quick", measure: "minutes" },
                { key: "sitting", word: "A sitting", measure: "an hour or so" },
                { key: "long", word: "Long", measure: "days of work" },
              ] as const).map(({ key: sz, word, measure }) => {
                const on = effortSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setEffortSize(on ? null : sz)}
                    className="flex-1 py-2 rounded-lg transition-colors flex flex-col items-center gap-0.5"
                    style={{
                      background: on ? "var(--color-accent)" : "var(--color-secondary)",
                      color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)",
                      border: `1px solid ${on ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ lineHeight: 1.1 }}>{word}</span>
                    <span className="text-[10px]" style={{ opacity: 0.75, lineHeight: 1 }}>{measure}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATUS — the user's own declaration: new venture vs already in their story.
              Feeds the mode suggester + the day scorer (Action owns the new). */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Status
            </label>
            <div className="flex gap-2">
              {([["new", "Something new", true], ["existing", "Already in motion", false]] as const).map(([key, label, val]) => {
                const on = isNewVenture === val;
                return (
                  <button
                    key={key}
                    onClick={() => setIsNewVenture(on ? null : val)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150"
                    style={{
                      background: on ? "color-mix(in oklch, var(--color-foreground) 14%, transparent)" : "var(--color-secondary)",
                      color: on ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${on ? "var(--color-foreground)" : "var(--border)"}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode selector */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Mode
            </label>
            <div className="flex gap-2 flex-wrap">
              {TASK_MODES.map((m: TaskMode) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setModeTouched(true); }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150"
                    style={{
                      letterSpacing: "0.02em",
                      background: active ? MODE_OKLCH[m] : "var(--color-secondary)",
                      color: active ? "var(--foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${active ? MODE_OKLCH[m] : "var(--border)"}`,
                    }}
                  >
                    {m}
                    {!modeTouched && suggestion?.mode === m && mode === m && title.trim().length >= 3 && (
                      <span style={{ marginLeft: 5, fontSize: "0.6rem", fontWeight: 600, opacity: 0.75, letterSpacing: "0.04em" }}>suggested</span>
                    )}
                  </button>
                );
              })}
            </div>
            {!modeTouched && suggestion && mode === suggestion.mode && title.trim().length >= 3 && (
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>
                Suggested — {suggestion.reason}. Tap another to override.
              </p>
            )}
            {modeTouched && suggestion && suggestion.mode !== mode && title.trim().length >= 3 && (
              <button
                onClick={() => setMode(suggestion.mode)}
                style={{ margin: "0.4rem 0 0", padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "var(--color-muted-foreground)", textDecoration: "underline", textUnderlineOffset: "2px", display: "block", textAlign: "left" }}
              >
                Suggested: {suggestion.mode} — {suggestion.reason}. Tap to apply.
              </button>
            )}
          </div>

          {/* Priority selector */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Priority
            </label>
            <div className="flex gap-2">
              {TASK_PRIORITIES.map((p: TaskPriority) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{
                      background: active ? "var(--color-foreground)" : "var(--color-secondary)",
                      color: active ? "var(--color-background)" : "var(--color-muted-foreground)",
                      border: `1px solid ${active ? "var(--color-foreground)" : "var(--border)"}`,
                    }}
                  >
                    {PRIORITY_EXCLAIM[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Want / Need */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            >
              Want or Need
            </label>
            <div className="flex gap-2">
              {(["need", "want"] as const).map((v) => {
                const active = intent === v;
                return (
                  <button
                    key={v}
                    onClick={() => setIntent(v)}
                    className="flex-1 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-150"
                    style={{
                      letterSpacing: "0.04em",
                      background: active ? "var(--color-foreground)" : "var(--color-secondary)",
                      color: active ? "var(--color-background)" : "var(--color-muted-foreground)",
                      border: `1px solid ${active ? "var(--color-foreground)" : "var(--border)"}`,
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Due Date (optional)
            </label>
            {!showDuePicker ? (
              <button
                type="button"
                onClick={() => setShowDuePicker(true)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary text-left"
              >
                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">No due date — tap to set one</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary">
                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={dueDate}
                  autoFocus
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 bg-transparent text-foreground focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => { setDueDate(""); setShowDuePicker(false); }}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-opacity opacity-60 hover:opacity-100"
                  style={{ color: "var(--color-muted-foreground)" }}
                  aria-label="Clear due date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Repeat / recurrence */}
          <div className="mb-6">
            <label
              className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            >
              <Repeat className="w-3 h-3" />
              Repeat
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {RECURRENCE_OPTIONS.map((opt) => {
                const active = recurrence === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrence(opt.value)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: active ? "var(--filter-pill-bg-active)" : "var(--color-secondary)",
                      color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                      border: `1px solid ${active ? "var(--filter-pill-border-active)" : "var(--color-border)"}`,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {recurrence !== "none" && (
              <p className="text-[13px] mt-1.5" style={{ color: "var(--color-muted-foreground)" }}>
                Completing this task rolls it forward to the next {RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label.toLowerCase()} date instead of finishing it.
              </p>
            )}
          </div>

          {/* Life areas */}
          <div className="mb-6">
            <label
              className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            >
              <Layers className="w-3 h-3" />
              Life Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {LIFE_AREAS.map((area) => {
                const active = lifeAreas.includes(area.key);
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() =>
                      setLifeAreas((cur) =>
                        cur.includes(area.key) ? cur.filter((k) => k !== area.key) : [...cur, area.key]
                      )
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: active ? "var(--filter-pill-bg-active)" : "var(--color-secondary)",
                      color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                      border: `1px solid ${active ? "var(--filter-pill-border-active)" : "var(--color-border)"}`,
                    }}
                  >
                    {area.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] mt-1.5" style={{ color: "var(--color-muted-foreground)" }}>
              Tags this task to a life area so it surfaces on days (and years) that activate the matching house.
            </p>
          </div>

          {/* Project selector */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Project (optional)
            </label>
            <ProjectSelector value={projectId} onChange={setProjectId} />
          </div>

          {/* ── Task Metadata (Current State scoring) ─────────────────────── */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-1"
              style={{
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Task Character
            </label>
            <p
              className="text-[12px] mb-3"
              style={{ color: "var(--color-muted-foreground)", opacity: 0.7 }}
            >
              Helps Velea match tasks to your current state.
            </p>

            {/* Cognitive Load */}
            <div className="mb-3">
              <p className="text-[12px] tracking-wide uppercase mb-1.5" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}>Cognitive Load</p>
              <div className="flex gap-2">
                {LOAD_LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setCognitiveLoad(l)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background: cognitiveLoad === l ? "var(--metadata-cognitive)" : "var(--color-secondary)",
                      color: cognitiveLoad === l ? "var(--foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${cognitiveLoad === l ? "var(--metadata-cognitive)" : "var(--border)"}`,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Physical Load */}
            <div className="mb-3">
              <p className="text-[12px] tracking-wide uppercase mb-1.5" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}>Physical Load</p>
              <div className="flex gap-2">
                {LOAD_LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setPhysicalLoad(l)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background: physicalLoad === l ? "var(--metadata-physical)" : "var(--color-secondary)",
                      color: physicalLoad === l ? "var(--foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${physicalLoad === l ? "var(--metadata-physical)" : "var(--border)"}`,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Emotional Load */}
            <div className="mb-3">
              <p className="text-[12px] tracking-wide uppercase mb-1.5" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}>Emotional Load</p>
              <div className="flex gap-2">
                {LOAD_LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setEmotionalLoad(l)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background: emotionalLoad === l ? "var(--metadata-emotional)" : "var(--color-secondary)",
                      color: emotionalLoad === l ? "var(--foreground)" : "var(--color-muted-foreground)",
                      border: `1px solid ${emotionalLoad === l ? "var(--metadata-emotional)" : "var(--border)"}`,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Creative + Social toggles */}
            <div className="flex gap-2">
              <button
                onClick={() => setCreativeRequired(!creativeRequired)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: creativeRequired ? "var(--metadata-creative)" : "var(--color-secondary)",
                  color: creativeRequired ? "var(--metadata-creative-text)" : "var(--color-muted-foreground)",
                  border: `1px solid ${creativeRequired ? "var(--metadata-creative)" : "var(--border)"}`,
                }}
              >
                {creativeRequired ? "✦ Creative" : "Creative"}
              </button>
              <button
                onClick={() => setSocialRequired(!socialRequired)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: socialRequired ? "var(--metadata-social)" : "var(--color-secondary)",
                  color: socialRequired ? "var(--foreground)" : "var(--color-muted-foreground)",
                  border: `1px solid ${socialRequired ? "var(--metadata-social)" : "var(--border)"}`,
                }}
              >
                {socialRequired ? "◎ Social" : "Social"}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label
              className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            >
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, links, or reminders…"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm"
            />
          </div>

          {/* Pin toggle + Wealth toggle + Save button inline */}
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                background: isPinned ? "var(--color-accent)" : "var(--color-secondary)",
                color: isPinned ? "var(--foreground)" : "var(--color-muted-foreground)",
                border: `1px solid ${isPinned ? "var(--color-accent)" : "var(--border)"}`,
              }}
            >
              {isPinned ? "📌 Pinned" : "Pin"}
            </button>
            <button
              onClick={() => setWealthFlow(!wealthFlow)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                background: wealthFlow ? "var(--metadata-wealth)" : "var(--color-secondary)",
                color: wealthFlow ? "var(--foreground)" : "var(--color-muted-foreground)",
                border: `1px solid ${wealthFlow ? "var(--metadata-wealth)" : "var(--border)"}`,
              }}
            >
              {wealthFlow ? "💰 Wealth" : "Wealth"}
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || createTask.isPending || updateTask.isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 disabled:opacity-40"
              style={{
                background: "var(--color-foreground)",
                color: "var(--color-background)",
              }}
            >
              {createTask.isPending || updateTask.isPending
                ? "Saving…"
                : editTask
                ? "Save Changes"
                : "Save Task"}
            </button>
          </div>

          {/* Delete task — edit mode only. Two-tap confirm; the fast/accidental path
              (the old collapsed trash icon) is gone, swipe-right is the other way. */}
          {editTask && (
            <div className="mb-6">
              <button
                onClick={() => {
                  if (!editTaskId) return;
                  if (!confirmDelete) { setConfirmDelete(true); return; }
                  deleteTask.mutate({ id: editTaskId }, { onSuccess: () => { setConfirmDelete(false); onClose(); } });
                }}
                disabled={deleteTask.isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150 disabled:opacity-40"
                style={{
                  background: confirmDelete ? "oklch(0.62 0.22 25)" : "transparent",
                  color: confirmDelete ? "#FDFDFD" : "oklch(0.62 0.22 25)",
                  border: "1px solid oklch(0.62 0.22 25)",
                }}
              >
                {deleteTask.isPending ? "Deleting…" : confirmDelete ? "Tap again to delete" : "Delete task"}
              </button>
            </div>
          )}

          {/* Subtasks section - only for new tasks */}
          {!editTask && (
            <div className="mb-8">
              <label
                className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
                style={{
                  color: "var(--color-muted-foreground)",
                  letterSpacing: "0.04em",
                }}
              >
                Subtasks (optional)
              </label>

              {subtasks.length > 0 && (
                <div className="mb-3 space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={subtask.id ?? `new-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                      <span className="flex-1 text-sm text-foreground">{subtask.title}</span>
                      <button
                        onClick={() => handleRemoveSubtask(index)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtask input — scrollIntoView on focus keeps it above the keyboard */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  onFocus={scrollSubtaskIntoView}
                  placeholder="Add a subtask..."
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
                />
                <button
                  onClick={handleAddSubtask}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Extra breathing room so the subtask input is never hidden behind the keyboard */}
              <div style={{ height: "40vh" }} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
