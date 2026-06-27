import { BookOpen } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
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
  const { data: reflections, isLoading } = trpc.reflections.history.useQuery({ limit: 120 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container py-6">
        <AppHeader pageTitle="Reflection Log" />
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
              style={{ color: dayLabelColor }}
            >
              {reflections.length} {reflections.length === 1 ? "entry" : "entries"}
            </p>
            {reflections.map((r: { id: number; date: string; content: string }) => (
              <div
                key={r.id}
                className="rounded-xl overflow-hidden"
                style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
              >
                <div className="px-4 py-2" style={{ background: dayLabelColor }}>
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#ffffff" }}
                >
                  {formatDate(r.date)}
                </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap p-4">
                  {r.content}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
