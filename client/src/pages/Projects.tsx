import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Archive, ArchiveRestore, Trash2, Pencil, Check, X, FolderOpen, ChevronRight } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor, useDayModeGradient } from "@/hooks/useDayModeColor";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";


type Project = {
  id: number;
  userId: number;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Inline editable project name ──────────────────────────────────────────

function ProjectNameEditor({
  project,
  onRename,
}: {
  project: Project;
  onRename: (id: number, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(project.name);
      setEditing(false);
      return;
    }
    if (trimmed !== project.name) {
      onRename(project.id, trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setValue(project.name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="flex-1 min-w-0 px-2 py-1 rounded text-sm bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
         
        />
        <button
          onClick={commit}
          className="flex-shrink-0 p-1 rounded transition-colors"
          style={{ color: "var(--foreground)" }}
          aria-label="Save name"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          className="flex-shrink-0 p-1 rounded transition-colors"
          style={{ color: "var(--color-muted-foreground)" }}
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span
        className="text-sm font-medium truncate"
        style={{
          color: project.archivedAt ? "var(--color-muted-foreground)" : "var(--color-foreground)",
        }}
      >
        {project.name}
      </span>
      {!project.archivedAt && (
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="flex-shrink-0 p-1.5 rounded-lg transition-opacity"
          style={{ color: "var(--color-muted-foreground)", opacity: 0.7 }}
          aria-label="Rename project"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Delete confirmation dialog ─────────────────────────────────────────────

function DeleteConfirmDialog({
  projectName,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "var(--dialog-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 32px oklch(0 0 0 / 0.25)",
        }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          Delete Project?
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <span className="font-medium" style={{ color: "var(--color-foreground)" }}>"{projectName}"</span> will be permanently deleted.
          Tasks assigned to this project will be unassigned but not deleted.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--color-secondary)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--dialog-delete-bg)",
              color: "var(--dialog-delete-text)",
              border: "1px solid var(--dialog-delete-bg)",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Archive confirmation dialog ─────────────────────────────────────────────

function ArchiveConfirmDialog({
  projectName,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "var(--dialog-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 32px oklch(0 0 0 / 0.25)",
        }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          Archive Project?
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <span className="font-medium" style={{ color: "var(--color-foreground)" }}>"{projectName}"</span> will be archived.
          Assigned tasks keep their project assignment and can be filtered by this project in the Planner.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "var(--color-secondary)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "var(--border)",
            color: "var(--dialog-archive-text)",
            border: "1px solid var(--border)",
          }}
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Projects page ──────────────────────────────────────────────────────

export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const dayLabelColor = useDayModeColor();
  const heroGradient = useDayModeGradient();
  const [newName, setNewName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: allProjects = [], isLoading } = trpc.projects.listAll.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const activeProjects = allProjects.filter((p) => !p.archivedAt);
  const archivedProjects = allProjects.filter((p) => p.archivedAt);

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listAll.invalidate();
      setNewName("");
      toast.success("Project created");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const renameMutation = trpc.projects.rename.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listAll.invalidate();
    },
    onError: () => toast.error("Failed to rename project"),
  });

  const archiveMutation = trpc.projects.archive.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listAll.invalidate();
      setArchiveTarget(null);
      toast.success("Project archived");
    },
    onError: () => toast.error("Failed to archive project"),
  });

  const unarchiveMutation = trpc.projects.unarchive.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listAll.invalidate();
      toast.success("Project restored");
    },
    onError: () => toast.error("Failed to restore project"),
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.projects.listAll.invalidate();
      utils.tasks.list.invalidate();
      setDeleteTarget(null);
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ name });
  };

  const handleRename = (id: number, name: string) => {
    renameMutation.mutate({ id, name });
  };



  return (
    <div className="min-h-screen w-full">
      <div
        className="container py-6 space-y-5"
      >
        <AppHeader pageTitle="Projects" />

        {/* Always-open add project form */}
        {isAuthenticated && (
          <div
            className="overflow-hidden relative z-10"
            style={{ borderRadius: "24px", background: heroGradient, padding: "1.25rem" }}
          >
            <label
              className="block"
              style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)", marginBottom: "0.75rem" }}
            >
              New Project
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={newNameRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setNewName("");
                }}
                placeholder="Project name..."
                className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none placeholder:text-white/55"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  caretColor: "#fff",
                }}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-40"
                style={{
                  background: "#fff",
                  color: "#1a1a1a",
                  letterSpacing: "0.06em",
                }}
              >
                {createMutation.isPending ? "Saving\u2026" : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Active projects list */}
        <div
          className="relative z-10 overflow-hidden"
          style={{ borderRadius: "24px", border: `1px solid color-mix(in srgb, ${dayLabelColor} 40%, transparent)`, background: "var(--color-card)" }}
        >
          <div className="px-5 py-3" style={{ background: heroGradient }}>
            <span
              style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}
            >
              Active ({activeProjects.length})
            </span>
          </div>

          {isLoading ? (
            <div className="px-4 pb-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--color-secondary)", opacity: 0.5 }} />
              ))}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="px-4 pb-6 pt-2 flex flex-col items-center gap-3 text-center">
              <FolderOpen size={32} style={{ color: "var(--color-muted-foreground)", opacity: 0.4 }} />
              <p
                className="text-sm"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                No projects yet. Type a name above to create your first project.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-secondary/50"
                  style={{ background: "transparent" }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Mode-colored folder chip */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-xl"
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      background: `color-mix(in srgb, ${dayLabelColor} 20%, var(--color-card))`,
                      color: dayLabelColor,
                      border: `1px solid color-mix(in srgb, ${dayLabelColor} 35%, transparent)`,
                    }}
                  >
                    <FolderOpen size={16} />
                  </div>
                  <ProjectNameEditor project={project} onRename={handleRename} />
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setArchiveTarget(project)}
                      className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--color-muted-foreground)" }}
                      title="Archive project"
                      aria-label="Archive project"
                    >
                      <Archive size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(project)}
                      className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: "oklch(0.52 0.12 15)" }}
                      title="Delete project"
                      aria-label="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <ChevronRight size={16} className="flex-shrink-0" style={{ color: "var(--color-muted-foreground)", opacity: 0.5 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archived projects section */}
        {archivedProjects.length > 0 && (
          <div
            className="relative z-10 overflow-hidden"
            style={{ borderRadius: "24px", border: `1px solid color-mix(in srgb, ${dayLabelColor} 40%, transparent)`, background: "var(--color-card)" }}
          >
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center justify-between w-full px-5 py-3 transition-all"
              style={{ background: heroGradient }}
            >
              <span
                style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.96)" }}
              >
                Archived ({archivedProjects.length})
              </span>
              <span
                className="text-[10px] font-medium transition-transform"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  display: "inline-block",
                  transform: showArchived ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease",
                }}
              >
                ▾
              </span>
            </button>

            {showArchived && (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {archivedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <span
                      className="flex-1 text-sm truncate"
                      style={{
                        color: "var(--color-muted-foreground)",
                        textDecoration: "line-through",
                        opacity: 0.7,
                      }}
                    >
                      {project.name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => unarchiveMutation.mutate({ id: project.id })}
                        className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        style={{ color: "var(--foreground)" }}
                        title="Restore project"
                        aria-label="Restore project"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(project)}
                        className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        style={{ color: "oklch(0.52 0.12 15)" }}
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmDialog
          projectName={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Archive confirmation */}
      {archiveTarget && (
        <ArchiveConfirmDialog
          projectName={archiveTarget.name}
          onConfirm={() => archiveMutation.mutate({ id: archiveTarget.id })}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
}
