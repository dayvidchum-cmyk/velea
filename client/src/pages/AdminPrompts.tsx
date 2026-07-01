import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Save, Plus } from "lucide-react";

export default function AdminPrompts() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: prompts = [], isLoading } = trpc.systemPrompts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const upsertMutation = trpc.systemPrompts.upsert.useMutation({
    onSuccess: () => {
      toast.success("Saved");
      utils.systemPrompts.list.invalidate();
    },
    onError: () => toast.error("Failed to save"),
  });

  const [editKey, setEditKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (editKey) {
      const p = prompts.find((x) => x.key === editKey);
      if (p) {
        setEditContent(p.content);
        setEditTitle(p.title);
      }
    }
  }, [editKey, prompts]);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container py-6">
        <div className="glass-card p-6 text-center space-y-3 mt-8">
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "var(--border)", color: "var(--foreground)" }}
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Only the owner can access this page
  if (user?.role !== "admin") {
    return (
      <div className="container py-6">
        <div className="glass-card p-6 text-center mt-8">
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Access restricted.</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!editKey) return;
    upsertMutation.mutate({ key: editKey, title: editTitle, content: editContent });
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newTitle.trim()) {
      toast.error("Key and title are required");
      return;
    }
    upsertMutation.mutate({ key: newKey.trim().toLowerCase().replace(/\s+/g, "_"), title: newTitle.trim(), content: "" });
    setNewKey("");
    setNewTitle("");
    setAddOpen(false);
  };

  return (
    <div className="container py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl tracking-wide uppercase"
          style={{ color: "var(--foreground)", letterSpacing: "0.04em", fontWeight: 300 }}
        >
          Context Library
        </h1>
        <button
          onClick={() => setAddOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--border)", color: "var(--foreground)" }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
        Write the logic behind your day modes, interpretive frameworks, or any context you want the app to understand. Each entry is stored and can be referenced by future AI features.
      </p>

      {/* Add new entry */}
      {addOpen && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-sm font-bold uppercase" style={{ color: "var(--color-muted-foreground)" }}>
            New Entry
          </p>
          <input
            className="glass-input w-full px-3 py-2 text-sm"
            placeholder="Key (e.g. mode_logic)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            className="glass-input w-full px-3 py-2 text-sm"
            placeholder="Title (e.g. Day Mode Logic)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: "var(--border)", color: "var(--foreground)" }}
            >
              Create
            </button>
            <button
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: "var(--color-secondary)", color: "var(--color-muted-foreground)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-16 animate-pulse" style={{ opacity: 0.5 }} />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No entries yet. Tap + to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <div key={prompt.key} className="glass-card overflow-hidden">
              {/* Entry header */}
              <button
                onClick={() => setEditKey(editKey === prompt.key ? null : prompt.key)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.90 0.02 80)" }}>
                    {prompt.title}
                  </p>
                  <p className="text-[12px] mt-0.5 tracking-wider" style={{ color: "var(--color-muted-foreground)" }}>
                    {prompt.key}
                  </p>
                </div>
                <span style={{ color: "var(--color-muted-foreground)", fontSize: 18, lineHeight: 1 }}>
                  {editKey === prompt.key ? "−" : "+"}
                </span>
              </button>

              {/* Editor */}
              {editKey === prompt.key && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--color-secondary)" }}>
                  <input
                    className="glass-input w-full px-3 py-2 text-sm mt-3"
                    placeholder="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <textarea
                    className="glass-input w-full px-3 py-2 text-sm resize-none"
                    rows={10}
                    placeholder="Write your mode logic, interpretive framework, or context here…"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{ lineHeight: 1.6 }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={upsertMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: "var(--border)",
                      color: "var(--foreground)",
                      opacity: upsertMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Save size={12} />
                    {upsertMutation.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
