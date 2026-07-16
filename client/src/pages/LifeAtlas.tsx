import { useState } from "react";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import LockedFeatureCard from "@/components/LockedFeatureCard";
import { trpc } from "@/lib/trpc";

/** THE LIFE ATLAS (David 2026-07-16) — every life-theme window from the stored
 *  120-year convergence, dated, weighted (big karmic knots ★) and VOICED per theme.
 *  "When do I meet my soulmate? When will I be wealthy? Tell me about my children." */
export default function LifeAtlas() {
  const [, navigate] = useLocation();
  const { data: mine } = trpc.features.mine.useQuery(undefined, { staleTime: 60_000 });
  const entitled = mine?.lifeAtlas === true;
  const { data } = trpc.atlas.windows.useQuery(undefined, { enabled: entitled, staleTime: 30 * 60_000 });
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const readQ = trpc.atlas.themeRead.useQuery(
    { theme: openTheme ?? "" },
    { enabled: !!openTheme, staleTime: Infinity, retry: false },
  );
  const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader pageTitle="The Life Atlas" />
      <main className="mx-auto max-w-lg px-4 pt-2">
        <button onClick={() => navigate("/astrology")} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Chart
        </button>

        {mine && !entitled && (
          <LockedFeatureCard
            title="The Life Atlas"
            teaser="Every season of your life, dated and voiced — coming."
            detail="Marriage, wealth, children, career — the stored timeline knows when each theme's windows open across the decades, and the Atlas reads them to you plainly: the promise your chart holds, the seasons that carry it, and the big karmic knots where everything converges."
          />
        )}

        {entitled && !data && (
          <div className="mt-10"><VeleaLoader label="Unrolling the atlas…" /></div>
        )}

        {entitled && data?.available && (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>
              Every theme's open seasons, from your stored timeline. ★ marks a big karmic knot —
              a window where period, promise and sky all pile up. Tap a theme to hear it read.
            </p>
            <div className="space-y-2">
              {data.themes.map((t: any) => {
                const open = openTheme === t.theme;
                const knots = t.windows.filter((w: any) => w.bigKnot).length;
                return (
                  <div key={t.theme} className="rounded-xl overflow-hidden" style={{ border: "1px solid color-mix(in srgb, var(--day-accent) 40%, transparent)", background: "var(--color-card)" }}>
                    <button onClick={() => setOpenTheme(open ? null : t.theme)} className="w-full flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: "var(--heading-ink)" }}>
                        {t.label}
                        <span className="ml-2 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                          {t.windows.length} {t.windows.length === 1 ? "window" : "windows"}{knots ? ` · ${knots} ★` : ""}
                        </span>
                      </span>
                      <ChevronDown size={17} style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        {readQ.isLoading ? (
                          <VeleaLoader size={24} label="Reading the seasons…" />
                        ) : readQ.data?.available && readQ.data.read ? (
                          <>
                            <p className="text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{readQ.data.read.read}</p>
                            <p className="text-sm italic mt-2" style={{ color: "var(--color-muted-foreground)" }}>{readQ.data.read.question}</p>
                          </>
                        ) : (
                          <p className="text-sm italic" style={{ color: "var(--color-muted-foreground)" }}>The atlas is quiet — try again in a moment.</p>
                        )}
                        <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                          {t.windows.map((w: any, i: number) => (
                            <p key={i} className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                              {w.bigKnot && <span style={{ color: "var(--brand-gold)" }}>★ </span>}
                              {fmt(w.from)} → {fmt(w.to)}{w.bigKnot ? " — a big karmic knot" : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
