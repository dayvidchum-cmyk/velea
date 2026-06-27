import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { useParams, useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import SwipeableTaskRow from "@/components/SwipeableTaskRow";
import TaskItem from "@/components/TaskItem";
import AddTaskSheet from "@/components/AddTaskSheet";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { MODE_OKLCH, type TaskMode } from "../../../shared/types";
import type { Task } from "../../../drizzle/schema";
import { useDayModeColor } from "@/hooks/useDayModeColor";

type ProjectStats = {
  projectId: number;
  projectName: string;
  total: number;
  completed: number;
  remaining: number;
  progressPercent: number;
  active: any[];
  completedTasks: any[];
  archived: any[];
};

type ProjectInsights = {
  projectId: number;
  commonMode: string | null;
  upcomingDue: any[];
  highPriority: any[];
  wealthFlow: any[];
};

export default function ProjectDetail() {
  const { isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const { projectId: projectIdStr } = useParams();
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : 0;
  const dayLabelColor = useDayModeColor();

  const [editingNote, setEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch project stats
  const { data: stats, isLoading: statsLoading } = trpc.projects.stats.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  // Fetch project insights
  const { data: insights, isLoading: insightsLoading } = trpc.projects.insights.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  // Fetch recommended next task
  const { data: recommendedTask } = trpc.projects.recommendedNextTask.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  // Fetch project note
  const { data: note } = trpc.projects.getNote.useQuery(
    { projectId },
    { enabled: isAuthenticated && projectId > 0 }
  );

  // Task mutations
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.projects.stats.invalidate({ projectId });
      utils.projects.insights.invalidate({ projectId });
      utils.projects.recommendedNextTask.invalidate({ projectId });
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.projects.stats.invalidate({ projectId });
      utils.projects.insights.invalidate({ projectId });
      utils.projects.recommendedNextTask.invalidate({ projectId });
      toast.success("Task deleted");
    },
  });

  // Update note mutation
  const updateNoteMutation = trpc.projects.upsertNote.useMutation({
    onSuccess: () => {
      utils.projects.getNote.invalidate({ projectId });
      setEditingNote(false);
      toast.success("Note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  useEffect(() => {
    if (note?.content) {
      setNoteContent(note.content);
    }
  }, [note]);

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Please log in</div>;
  }

  if (statsLoading || insightsLoading) {
    return (
      <div className="min-h-screen w-full">
        <div className="container py-6">
          <AppHeader pageTitle="Project" />
          <div className="mt-6 space-y-4">
            <div className="h-10 bg-secondary rounded animate-pulse" />
            <div className="h-20 bg-secondary rounded animate-pulse" />
            <div className="h-40 bg-secondary rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen w-full">
        <div className="container py-6">
          <AppHeader pageTitle="Project" />
          <div className="mt-6 text-center text-muted-foreground">Project not found</div>
        </div>
      </div>
    );
  }

  const handleSaveNote = () => {
    updateNoteMutation.mutate({ projectId, content: noteContent });
  };

  const handleToggleComplete = (id: number, current: boolean) => {
    updateTask.mutate({ id, isCompleted: !current });
  };

  const handleTogglePin = (id: number, current: boolean) => {
    updateTask.mutate({ id, isPinned: !current });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id });
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
  };

  return (
    <div className="min-h-screen w-full">
      <div
        className="container py-6 space-y-6 relative"
        style={{ background: "var(--color-background)" }}
      >
        <AppHeader pageTitle={stats.projectName} />

        {/* Progress Card */}
        <div
          className="overflow-hidden rounded-lg"
          style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
        >
          <div className="px-6 py-3" style={{ background: dayLabelColor }}>
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              Progress
            </span>
            <span
              className="text-lg font-bold"
              style={{
                color: "#ffffff",
              }}
            >
              {stats.progressPercent}%
            </span>
          </div>
          </div>
          <div className="p-6 space-y-4">
          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "var(--color-secondary)" }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${stats.progressPercent}%`,
                background: "var(--border)",
              }}
            />
          </div>

          {/* Task counts */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center">
              <div
                className="text-sm font-bold uppercase"
                style={{
                  color: "var(--foreground)",
                  letterSpacing: "0.04em",
                }}
              >
                Total
              </div>
              <div
                className="text-xl font-bold mt-1"
                style={{
                  color: "var(--color-foreground)",
                }}
              >
                {stats.total}
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-sm font-bold uppercase"
                style={{
                  color: "var(--foreground)",
                  letterSpacing: "0.04em",
                }}
              >
                Done
              </div>
              <div
                className="text-xl font-bold mt-1"
                style={{
                  color: "var(--foreground)",
                }}
              >
                {stats.completed}
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-sm font-bold uppercase"
                style={{
                  color: "var(--foreground)",
                  letterSpacing: "0.04em",
                }}
              >
                Remaining
              </div>
              <div
                className="text-xl font-bold mt-1"
                style={{
                  color: "var(--color-foreground)",
                }}
              >
                {stats.remaining}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Recommended Next Task */}
        {recommendedTask && (
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
          >
            <div className="px-5 py-3" style={{ background: dayLabelColor }}>
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              Recommended Next
            </span>
            </div>
            <div className="p-5 space-y-3">
            <SwipeableTaskRow
              isCompleted={false}
              isPinned={recommendedTask.isPinned}
              isExpanded={expandedTaskId === recommendedTask.id}
              onSwipeLeft={() => handleToggleComplete(recommendedTask.id, false)}
              onSwipeRight={() => handleTogglePin(recommendedTask.id, recommendedTask.isPinned)}
              modeColor={MODE_OKLCH[recommendedTask.mode as TaskMode]}
            >
              <TaskItem
                task={recommendedTask as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                onToggleComplete={handleToggleComplete}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onExpandChange={(exp) => setExpandedTaskId(exp ? recommendedTask.id : null)}
                taskModeColor={MODE_OKLCH[recommendedTask.mode as TaskMode]}
              />
            </SwipeableTaskRow>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights && (insights.commonMode || insights.upcomingDue.length > 0 || insights.highPriority.length > 0) && (
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
          >
            <div className="px-5 py-3" style={{ background: dayLabelColor }}>
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              Insights
            </span>
            </div>
            <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {insights.commonMode && (
                <div className="p-3 rounded-lg" style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)" }}>
                  <div className="text-sm font-bold uppercase" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
                    Common Mode
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: "var(--color-foreground)" }}>
                    {insights.commonMode}
                  </div>
                </div>
              )}
              {insights.upcomingDue.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)" }}>
                  <div className="text-sm font-bold uppercase" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
                    Upcoming Due
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: "var(--color-foreground)" }}>
                    {insights.upcomingDue.length}
                  </div>
                </div>
              )}
              {insights.highPriority.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: "var(--color-secondary)", border: "1px solid oklch(0.52 0.12 15 / 0.30)" }}>
                  <div className="text-sm font-bold uppercase" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
                    High Priority
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: "var(--color-foreground)" }}>
                    {insights.highPriority.length}
                  </div>
                </div>
              )}
              {insights.wealthFlow.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)" }}>
                  <div className="text-sm font-bold uppercase" style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}>
                    Wealth Flow
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: "var(--color-foreground)" }}>
                    {insights.wealthFlow.length}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {stats.active.length > 0 && (
          <div className="space-y-3">
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "var(--foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Active Tasks ({stats.active.length})
            </span>
            <div className="space-y-2">
              {stats.active.map((task: any) => (
                <SwipeableTaskRow
                  key={task.id}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  isExpanded={expandedTaskId === task.id}
                  onSwipeLeft={() => handleToggleComplete(task.id, task.isCompleted)}
                  onSwipeRight={() => handleTogglePin(task.id, task.isPinned)}
                  modeColor={MODE_OKLCH[task.mode as TaskMode]}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={handleToggleComplete}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onExpandChange={(exp) => setExpandedTaskId(exp ? task.id : null)}
                    taskModeColor={MODE_OKLCH[task.mode as TaskMode]}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {stats.completedTasks.length > 0 && (
          <div className="space-y-3">
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "var(--foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Completed ({stats.completedTasks.length})
            </span>
            <div className="space-y-2">
              {stats.completedTasks.map((task: any) => (
                <SwipeableTaskRow
                  key={task.id}
                  isCompleted={task.isCompleted}
                  isPinned={task.isPinned}
                  isExpanded={expandedTaskId === task.id}
                  onSwipeLeft={() => handleDelete(task.id)}
                  onSwipeRight={() => handleToggleComplete(task.id, task.isCompleted)}
                  modeColor={MODE_OKLCH[task.mode as TaskMode]}
                >
                  <TaskItem
                    task={task as Task & { subtaskTotal?: number; subtaskCompleted?: number }}
                    onToggleComplete={handleToggleComplete}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onExpandChange={(exp) => setExpandedTaskId(exp ? task.id : null)}
                    taskModeColor={MODE_OKLCH[task.mode as TaskMode]}
                  />
                </SwipeableTaskRow>
              ))}
            </div>
          </div>
        )}

        {/* Project Notes */}
        <div
          className="overflow-hidden rounded-lg"
          style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
        >
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: dayLabelColor }}>
            <span
              className="text-sm font-bold uppercase"
              style={{
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              Project Notes
            </span>
            {!editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="p-1 rounded transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <div className="p-5 space-y-3">

          {editingNote ? (
            <div className="space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add notes about this project..."
                className="w-full p-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
                style={{ minHeight: "120px" }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingNote(false);
                    setNoteContent(note?.content ?? "");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "var(--color-secondary)",
                    color: "var(--color-foreground)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <X size={14} className="inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={updateNoteMutation.isPending}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "var(--color-foreground)",
                    color: "var(--color-background)",
                  }}
                >
                  <Save size={14} className="inline mr-1" />
                  {updateNoteMutation.isPending ? "Saving\u2026" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-lg text-sm"
              style={{
                background: "var(--color-secondary)",
                color: noteContent ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                minHeight: "80px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {noteContent || "No notes yet. Click the edit button to add notes."}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Edit Task Sheet */}
      {editTask && (
        <AddTaskSheet
          open={!!editTask}
          onClose={() => setEditTask(null)}
          editTask={{
            id: String(editTask.id),
            title: editTask.title,
            mode: editTask.mode,
            priority: editTask.priority === 'High' ? 3 : editTask.priority === 'Medium' ? 2 : 1,
            dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined,
            isPinned: editTask.isPinned,
            wealthFlow: (editTask as any).wealthFlow ?? false,
            projectId: (editTask as any).projectId ?? null,
            cognitiveLoad: (editTask as any).cognitiveLoad ?? null,
            physicalLoad: (editTask as any).physicalLoad ?? null,
            creativeRequired: (editTask as any).creativeRequired ?? null,
            socialRequired: (editTask as any).socialRequired ?? null,
            emotionalLoad: (editTask as any).emotionalLoad ?? null,
          }}
        />
      )}
    </div>
  );
}
