import GateMark from "@/components/GateMark";
import { BookmarkCheck,  Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { trpc } from "@/lib/trpc";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
function formatTime(ts: Date | string) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Kept Readings archive — every stored daily reading, newest first, each with its date + time and
 * pin state. The "real Time Lord": the long thread of your days. Reached from the pin/archive link
 * under the day reading (gated by masterMode.access).
 */
export default function ReadingsArchive() {
  const dayLabelColor = useDayModeColor();
  const [, navigate] = useLocation();
  const { data: access } = trpc.masterMode.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;
  const { data: activeProfile } = trpc.profiles.getActive.useQuery();
  const profileId = activeProfile?.id;

  const { data: readings, isLoading } = trpc.narrative.list.useQuery(
    { profileId: profileId as number, limit: 120 },
    { enabled: !!profileId && entitled },
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container py-6">
        <AppHeader pageTitle="Kept Readings" onBack={() => navigate("/")} backLabel="Today" />
      </div>

      <div className="flex-1 px-4 pb-32 space-y-4 max-w-lg mx-auto w-full">
        {access && !entitled ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GateMark className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Kept Readings is a premium layer.</p>
            <p className="text-xs text-muted-foreground mt-1">The archive of your days — not yet unlocked.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2 animate-pulse">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !readings || readings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No readings kept yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Each day you open generates a reading — they'll gather here.</p>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: dayLabelColor }}>
              {readings.length} {readings.length === 1 ? "reading" : "readings"} · since {formatDate(readings[readings.length - 1].date).replace(/^\w+, /, "")}
            </p>
            {readings.map((r) => (
              <div
                key={r.date}
                className="rounded-xl overflow-hidden"
                style={{ border: `1.5px solid ${r.locked ? "#C9A84C" : dayLabelColor}`, background: `color-mix(in srgb, ${r.locked ? "#C9A84C" : dayLabelColor} 12%, var(--background))` }}
              >
                <div className="flex items-center justify-between px-4 py-2" style={{ background: r.locked ? "#C9A84C" : dayLabelColor, ["--band" as any]: r.locked ? "#C9A84C" : dayLabelColor }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--band) 40%, #2A1F14)" }}>{formatDate(r.date)}</span>
                  <span className="flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--band) 40%, #2A1F14)" }}>
                    {r.locked && <BookmarkCheck size={13} />}
                    <span className="text-[11px] font-medium" style={{ opacity: 0.9 }}>{formatTime(r.generatedAt)}</span>
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed p-4" style={{ opacity: 0.9 }}>
                  {r.snippet}{r.snippet && r.snippet.length >= 180 ? "…" : ""}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
