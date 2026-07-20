import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import GlossaryText from "@/components/GlossaryText";
import { useDayModeColor, useDayModeInk } from "@/hooks/useDayModeColor";
import { trpc } from "@/lib/trpc";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReflectionHistory() {
  const dayLabelColor = useDayModeColor();
  const dayLabelColorInk = useDayModeInk();
  const [, navigate] = useLocation();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setOpenIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const { data: reflections, isLoading } = trpc.reflections.history.useQuery({ limit: 120 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container py-6">
        <AppHeader pageTitle="Reflection Log" onBack={() => navigate("/")} backLabel="Today" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-32 space-y-4 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2 animate-pulse">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !reflections || reflections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No reflections yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Write your first reflection from the Planner page.
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-xs uppercase tracking-wider font-semibold"
              style={{ color: dayLabelColorInk }}
            >
              {reflections.length} {reflections.length === 1 ? "entry" : "entries"}
            </p>
            {reflections.map((r: { id: number; date: string; content: string }) => {
              const open = openIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
                >
                  <button
                    onClick={() => toggle(r.id)}
                    className="w-full flex items-center justify-between px-4 py-2"
                    style={{ background: dayLabelColor }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FDFDFD" }}>
                      {formatDate(r.date)}
                    </span>
                    <ChevronDown size={14} style={{ color: "#FDFDFD", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
                  </button>
                  {open && (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap p-4">
                      <GlossaryText>{r.content}</GlossaryText>
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
