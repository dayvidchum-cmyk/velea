import { useState } from "react";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { ChevronDown, ChevronLeft, Lock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import OctagramMark from "@/components/OctagramMark";
import { trpc } from "@/lib/trpc";

/** THE LIFE ATLAS (David 2026-07-16) — every life-theme window from the stored
 *  120-year convergence, dated, weighted (big karmic knots) and VOICED per theme.
 *  "When do I meet my soulmate? When will I be wealthy? Tell me about my children."
 *
 *  THE THIRST GATE: everyone sees their REAL themes and REAL counts — the dates and
 *  the voiced reading wait behind the veil until the flag opens ("keep them thirsty"). */
export default function LifeAtlas() {
  const [, navigate] = useLocation();
  const { data } = trpc.atlas.windows.useQuery(undefined, { staleTime: 30 * 60_000 });
  const entitled = data?.entitled === true;
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const readQ = trpc.atlas.themeRead.useQuery(
    { theme: openTheme ?? "" },
    { enabled: !!openTheme && entitled, staleTime: Infinity, retry: false },
  );
  const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const knotMark = (size = 11) => (
    <OctagramMark size={size} color="var(--brand-gold)" strokeWidth={1.2} style={{ display: "inline-block", verticalAlign: "-1px" }} />
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container py-6"><AppHeader pageTitle="The Life Atlas" /></div>
      <main className="mx-auto max-w-lg px-4 pt-2">
        <button onClick={() => navigate("/horoscope")} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Readings
        </button>

        {!data && (
          <div className="mt-10"><VeleaLoader label="Unrolling the atlas…" /></div>
        )}

        {data?.available && (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>
              Every theme's open seasons, from your stored timeline. {knotMark()} marks a big
              karmic knot — a window where period, promise and sky all pile up.
              {entitled ? " Tap a theme to hear it read." : " The dates and the readings open soon."}
            </p>
            <div className="space-y-2">
              {data.themes.map((t: any) => {
                const open = openTheme === t.theme;
                return (
                  <div key={t.theme} className="rounded-xl overflow-hidden" style={{ border: "1px solid color-mix(in srgb, var(--day-accent) 40%, transparent)", background: "var(--color-card)" }}>
                    <button onClick={() => setOpenTheme(open ? null : t.theme)} className="w-full flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: "var(--heading-ink)" }}>
                        {t.label}
                        <span className="ml-2 text-xs font-medium inline-flex items-center gap-1" style={{ color: "var(--color-muted-foreground)" }}>
                          {t.windowCount} {t.windowCount === 1 ? "window" : "windows"}
                          {t.knotCount ? <> · {t.knotCount} {knotMark(10)}</> : null}
                        </span>
                      </span>
                      <ChevronDown size={17} style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
                    </button>
                    {open && !entitled && (
                      <div className="px-4 pb-4">
                        <div className="flex items-start gap-2.5 rounded-lg px-3 py-3" style={{ background: "color-mix(in srgb, var(--brand-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-gold) 30%, transparent)" }}>
                          <Lock size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--brand-gold)" }} />
                          <p className="text-sm" style={{ margin: 0, color: "var(--color-foreground)", lineHeight: 1.55 }}>
                            Your timeline holds {t.windowCount} open {t.windowCount === 1 ? "season" : "seasons"} for this
                            {t.knotCount ? <> — {t.knotCount} of them {t.knotCount === 1 ? "a big karmic knot" : "big karmic knots"}</> : null}.
                            The dates, and the reading that names what each one carries, open with the Atlas. Soon.
                          </p>
                        </div>
                      </div>
                    )}
                    {open && entitled && (
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
                              {w.bigKnot && <span style={{ marginRight: 4 }}>{knotMark(10)}</span>}
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
