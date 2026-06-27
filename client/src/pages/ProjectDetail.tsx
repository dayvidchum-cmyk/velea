import { useState, useEffect } from "react";
import { Edit2, Save, X, ChevronDown } from "lucide-react";
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
import { useDayModeColor, useDayModeGradient } from "@/hooks/useDayModeColor";

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
  const heroGradient = useDayModeGradient();

  const [editingNote, setEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
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
        <AppHeader pageTitle={stats.projectName} sansTitle onBack={() => navigate("/projects")} backLabel="Projects" />

        {/* Progress Card — immersive hero gradient (like the Today page) */}
        <div className="overflow-hidden" style={{ borderRadius: "24px", background: heroGradient, padding: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
              Progress
            </span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {stats.progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.22)" }}>
            <div className="h-full transition-all duration-300" style={{ width: `${stats.progressPercent}%`, background: "#fff" }} />
          </div>

          {/* Task counts */}
          <div className="grid grid-cols-3 gap-3 pt-5">
            {[
              { label: "Total", value: stats.total },
              { label: "Done", value: stats.completed },
              { label: "Remaining", value: stats.remaining },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>
                  {label}
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "#fff" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Next Task — immersive hero gradient, task in a translucent panel */}
        {recommendedTask && (
          <div className="overflow-hidden" style={{ borderRadius: "24px", background: heroGradient }}>
            <div className="px-5 pt-4 pb-1">
              <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
                Recommended Next
              </span>
            </div>
            <div className="p-4 pt-3">
            <div style={{ borderRadius: "12px", boxShadow: "0 6px 18px rgba(0,0,0,0.30)" }}>
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
          </div>
        )}

        {/* Insights */}
        {insights && (insights.commonMode || insights.upcomingDue.length > 0 || insights.highPriority.length > 0) && (
          <div className="overflow-hidden" style={{ borderRadius: "24px", background: heroGradient }}>
            <div className="px-5 pt-4 pb-1">
              <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
                Insights
              </span>
            </div>
            <div className="p-5 pt-3 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                insights.commonMode ? { label: "Common Mode", value: insights.commonMode } : null,
                insights.upcomingDue.length > 0 ? { label: "Upcoming Due", value: insights.upcomingDue.length } : null,
                insights.highPriority.length > 0 ? { label: "High Priority", value: insights.highPriority.length } : null,
                insights.wealthFlow.length > 0 ? { label: "Wealth Flow", value: insights.wealthFlow.length } : null,
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <div className="text-sm font-bold uppercase" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                    {item.label}
                  </div>
                  <div className="text-sm font-bold mt-1" style={{ color: "#fff" }}>
                    {item.value}
                  </div>
                </div>
              ))}
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

        {/* Completed Tasks — collapsible */}
        {stats.completedTasks.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1.5 w-full"
            >
              <span
                className="text-sm font-bold uppercase"
                style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
              >
                Completed ({stats.completedTasks.length})
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: "var(--color-muted-foreground)",
                  transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease",
                }}
              />
            </button>
            {showCompleted && (
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
            )}
          </div>
        )}

        {/* Project Notes \u2014 immersive hero gradient */}
        <div className="overflow-hidden" style={{ borderRadius: "24px", background: heroGradient }}>
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}>
              Project Notes
            </span>
            {!editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="p-1 rounded transition-colors"
                style={{ color: "rgba(255,255,255,0.85)" }}
                aria-label="Edit notes"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <div className="px-5 pb-5 pt-1">

          {editingNote ? (
            <div className="space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add notes about this project..."
                className="w-full p-3 rounded-xl text-sm resize-none focus:outline-none placeholder:text-white/55"
                style={{
                  minHeight: "120px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  caretColor: "#fff",
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingNote(false);
                    setNoteContent(note?.content ?? "");
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  <X size={14} className="inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={updateNoteMutation.isPending}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                  style={{ background: "#fff", color: "#1a1a1a" }}
                >
                  <Save size={14} className="inline mr-1" />
                  {updateNoteMutation.isPending ? "Saving\u2026" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: noteContent ? "#fff" : "rgba(255,255,255,0.6)",
                minHeight: "80px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {noteContent || "No notes yet. Tap the edit icon to add notes."}
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
