import { useState, useMemo } from "react";
import { Plus, Search, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import TaskItem from "@/components/TaskItem";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import AddTaskSheet from "@/components/AddTaskSheet";
import type { Task } from "../../../drizzle/schema";
import type { TaskMode, TaskPriority } from "../../../shared/types";
import { TASK_MODES } from "../../../shared/types";

type FilterMode = TaskMode | "All";

// Collapsible completed tasks archive
function CompletedArchive({
  tasks,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onEdit,
}: {
  tasks: Task[];
  onToggleComplete: (id: number, current: boolean) => void;
  onTogglePin: (id: number, current: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
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
          style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
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
              onSwipeRight={() => onDelete(task.id)}
              rightMode="delete"
            >
              <TaskItem
                task={task}
                onToggleComplete={onToggleComplete}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </SwipeableTaskRow>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<FilterMode>("All");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.tasks.create.useMutation({
    onMutate: async (input) => {
      await utils.tasks.list.cancel();
      const prev = utils.tasks.list.getData();
      // Optimistic insert
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
        notes: input.notes ?? null,
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

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filter !== "All") list = list.filter((t) => t.mode === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, filter, search]);

  const activeTasks = filteredTasks.filter((t) => !t.isCompleted);
  const completedTasks = filteredTasks.filter((t) => t.isCompleted);

  if (!isAuthenticated) {
    return (
      <div className="container py-6">
        <div className="glass-card p-6 text-center space-y-3 mt-8">
          <p className="text-base font-bold"           style={{ color: "var(--color-primary)" }}>
            Sign in to manage tasks
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1
          className="text-xl tracking-wide uppercase"
          style={{ color: "var(--color-foreground)", letterSpacing: "0.04em", fontWeight: 300 }}
        >
          Tasks
        </h1>
        <button
          onClick={() => { setEditTask(null); setSheetOpen(true); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
          aria-label="Add task"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
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
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
        {(["All", ...TASK_MODES] as FilterMode[]).map((m) => {
          const active = filter === m;
          const MODE_COLORS: Record<string, string> = {
            Restraint: "oklch(0.65 0.12 15)",
            Build: "oklch(0.65 0.08 85)",
            Selective: "oklch(0.72 0.10 200)",
            Action: "oklch(0.72 0.16 145)",
            All: "var(--foreground)",
          };
          return (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150"
              style={{
                letterSpacing: "0.02em",
                background: active ? `color-mix(in oklch, ${MODE_COLORS[m]} 20%, transparent)` : "var(--color-border)",
                color: active ? MODE_COLORS[m] : "var(--color-muted-foreground)",
                border: `1px solid ${active ? `color-mix(in oklch, ${MODE_COLORS[m]} 40%, transparent)` : "var(--color-border)"}`,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-14 animate-pulse" style={{ opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  isExpanded={expandedTaskId === task.id}
                  onSwipeLeft={() => updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                  onSwipeRight={() => deleteMutation.mutate({ id: task.id })}
                  rightMode="delete"
                >
                  <TaskItem
                    task={task}
                    onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
                    onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current })}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    onEdit={handleEdit}
                    onExpandChange={(exp) => setExpandedTaskId(exp ? task.id : null)}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          )}

          {/* Completed tasks — collapsible archive */}
          {completedTasks.length > 0 && (
            <CompletedArchive
              tasks={completedTasks}
              onToggleComplete={(id, current) => updateMutation.mutate({ id, isCompleted: !current })}
              onTogglePin={(id, current) => updateMutation.mutate({ id, isPinned: !current })}
              onDelete={(id) => deleteMutation.mutate({ id })}
              onEdit={handleEdit}
            />
          )}

          {filteredTasks.length === 0 && (
            <div className="glass-card p-6 text-center">
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                {search ? "No tasks match your search." : filter === "All" ? "No tasks yet. Tap + to add one." : `No ${filter} tasks yet.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTask(null); }}
        editTask={editTask ? { id: String(editTask.id), title: editTask.title, mode: editTask.mode, priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1, dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined, isPinned: editTask.isPinned, wealthFlow: (editTask as any).wealthFlow ?? false, projectId: (editTask as any).projectId ?? null, cognitiveLoad: (editTask as any).cognitiveLoad ?? null, physicalLoad: (editTask as any).physicalLoad ?? null, creativeRequired: (editTask as any).creativeRequired ?? null, socialRequired: (editTask as any).socialRequired ?? null, emotionalLoad: (editTask as any).emotionalLoad ?? null, notes: (editTask as any).notes ?? null } : undefined}
      />
    </div>
  );
}
