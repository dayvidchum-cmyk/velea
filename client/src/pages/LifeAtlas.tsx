import { useState } from "react";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { ChevronDown, ChevronLeft, Lock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import OctagramMark from "@/components/OctagramMark";
import DiamondMark from "@/components/DiamondMark";
import { trpc } from "@/lib/trpc";

/** THE LIFE ATLAS (David 2026-07-16) — every life-theme window from the stored
 *  120-year convergence, dated, weighted (big karmic knots) and VOICED per theme.
 *
 *  THE LOOSENED VEIL (David, same night): every signed-in user sees the real themes,
 *  counts AND dated windows — organized by decade, each one a door. The theme reading
 *  and each window's reading stay behind the veil until the flag opens. */
export default function LifeAtlas() {
  const [, navigate] = useLocation();
  const { data } = trpc.atlas.windows.useQuery(undefined, { staleTime: 30 * 60_000 });
  const entitled = data?.entitled === true;
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const [openWindow, setOpenWindow] = useState<{ theme: string; label: string; w: any } | null>(null);
  const readQ = trpc.atlas.themeRead.useQuery(
    { theme: openTheme ?? "" },
    { enabled: !!openTheme && entitled, staleTime: Infinity, retry: false },
  );
  const windowReadQ = trpc.atlas.windowRead.useQuery(
    { theme: openWindow?.theme ?? "", from: openWindow?.w?.from ?? "1900-01-01" },
    { enabled: !!openWindow && entitled, staleTime: Infinity, retry: false },
  );
  const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const knotMark = (size = 14) => (
    <OctagramMark size={size} color="var(--brand-gold)" strokeWidth={1.4} style={{ display: "inline-block", verticalAlign: "-2px" }} />
  );
  // The ERA mark — a window HELD at the antar grain (years, not weeks). Diamond, not star:
  // few lords for years vs many lords at once. Both can be true; both then show.
  const eraMark = (size = 13) => (
    <DiamondMark size={size} color="#B3902C" strokeWidth={2} style={{ display: "inline-block", verticalAlign: "-2px" }} />
  );
  // Decade shelves — a wall of datelines becomes a scannable atlas (David: "walls of words").
  const decadeOf = (from: string) => `${from.slice(0, 3)}0s`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container py-6"><AppHeader pageTitle="The Life Atlas" onBack={() => navigate("/horoscope")} backLabel="Readings" /></div>
      <main className="mx-auto max-w-lg px-4 pt-2">
        {!data && (
          <div className="mt-10"><VeleaLoader label="Unrolling the atlas…" /></div>
        )}

        {data?.available && (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--color-muted-foreground)" }}>
              Every theme's open seasons, from your stored timeline. {knotMark()} marks a big
              karmic knot — a window where period, promise and sky all pile up.
              {entitled ? " Tap a theme to hear it read; tap any season for its own reading." : " Tap any season — the readings open soon."}
            </p>
            <div className="space-y-2">
              {data.themes.map((t: any) => {
                const open = openTheme === t.theme;
                const windows: any[] = t.windows ?? [];
                const decades: { label: string; wins: any[] }[] = [];
                for (const w of windows) {
                  const dl = decadeOf(w.from);
                  const last = decades[decades.length - 1];
                  if (last && last.label === dl) last.wins.push(w); else decades.push({ label: dl, wins: [w] });
                }
                return (
                  <div key={t.theme} className="rounded-xl overflow-hidden" style={{ border: "1px solid color-mix(in srgb, var(--day-accent) 40%, transparent)", background: "var(--color-card)" }}>
                    <button onClick={() => setOpenTheme(open ? null : t.theme)} className="w-full flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: "var(--heading-ink)" }}>
                        {t.label}
                        <span className="ml-2 text-xs font-medium inline-flex items-center gap-1" style={{ color: "var(--color-muted-foreground)" }}>
                          {t.windowCount} {t.windowCount === 1 ? "window" : "windows"}
                          {t.knotCount ? <> · {t.knotCount} {knotMark(13)}</> : null}
                          {t.eraCount ? <> · {t.eraCount} {eraMark(12)}</> : null}
                        </span>
                      </span>
                      <ChevronDown size={17} style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        {/* The theme's overall reading — entitled only; the veil for the rest. */}
                        {entitled ? (
                          readQ.isLoading ? (
                            <VeleaLoader size={24} label="Reading the seasons…" />
                          ) : readQ.data?.available && readQ.data.read ? (
                            <>
                              <p className="text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{readQ.data.read.read}</p>
                              <p className="text-sm italic mt-2" style={{ color: "var(--color-muted-foreground)" }}>{readQ.data.read.question}</p>
                            </>
                          ) : (
                            <p className="text-sm italic" style={{ color: "var(--color-muted-foreground)" }}>The atlas is quiet — try again in a moment.</p>
                          )
                        ) : (
                          <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "color-mix(in srgb, var(--brand-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-gold) 30%, transparent)" }}>
                            <Lock size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--brand-gold)" }} />
                            <p className="text-sm" style={{ margin: 0, color: "var(--color-foreground)", lineHeight: 1.55 }}>
                              The reading that names what this theme carries — and what each season below holds — opens with the Atlas. Soon.
                            </p>
                          </div>
                        )}

                        {/* THE SEASONS, shelved by decade — every dateline is a door. */}
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                          {decades.map((dec) => (
                            <div key={dec.label} className="mb-2.5">
                              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ letterSpacing: "0.09em", color: "var(--color-muted-foreground)" }}>{dec.label}</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {dec.wins.map((w: any, i: number) => (
                                  <button
                                    key={i}
                                    onClick={() => setOpenWindow({ theme: t.theme, label: t.label, w })}
                                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs"
                                    style={{
                                      border: w.bigKnot ? "1px solid color-mix(in srgb, var(--brand-gold) 55%, transparent)" : w.era ? "1px solid color-mix(in srgb, var(--brand-gold) 35%, transparent)" : "1px solid var(--color-border)",
                                      background: w.bigKnot ? "color-mix(in srgb, var(--brand-gold) 7%, transparent)" : w.era ? "color-mix(in srgb, var(--brand-gold) 4%, transparent)" : "transparent",
                                      color: "var(--color-foreground)", cursor: "pointer",
                                    }}
                                  >
                                    {w.bigKnot && <OctagramMark size={13} color="var(--brand-gold)" strokeWidth={1.5} style={{ flexShrink: 0 }} />}
                                    {w.era && <DiamondMark size={12} color="#B3902C" strokeWidth={2} style={{ flexShrink: 0 }} />}
                                    <span style={{ lineHeight: 1.3 }}>{fmt(w.from)} → {fmt(w.to)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
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

      {/* THE SEASON POP-UP — top-anchored (the card never moves once open). */}
      {openWindow && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ background: "rgba(30, 24, 16, 0.45)", paddingTop: "16dvh" }} onClick={() => setOpenWindow(null)}>
          <div className="parchment w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--parchment)", boxShadow: "0 18px 60px rgba(0,0,0,0.35)", border: openWindow.w.bigKnot ? "1.5px solid color-mix(in srgb, var(--brand-gold) 60%, transparent)" : "1.5px solid color-mix(in srgb, var(--day-accent) 45%, transparent)", maxHeight: "72dvh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", margin: 0 }}>{openWindow.label}</p>
            <p className="font-serif text-lg mt-0.5 flex items-center gap-2" style={{ color: openWindow.w.bigKnot ? "#B3902C" : "var(--heading-ink)", fontWeight: 700 }}>
              {openWindow.w.bigKnot && <OctagramMark size={17} color="#D4AF37" strokeWidth={1.5} />}
              {openWindow.w.era && <DiamondMark size={15} color="#B3902C" strokeWidth={2} />}
              {fmt(openWindow.w.from)} → {fmt(openWindow.w.to)}
            </p>
            {openWindow.w.bigKnot && (
              <p className="text-xs mt-0.5" style={{ color: "#B3902C", fontWeight: 600 }}>A big karmic knot — period, promise and sky pile up here.</p>
            )}
            {openWindow.w.era && (
              <p className="text-xs mt-0.5" style={{ color: "#B3902C", fontWeight: 600 }}>A held era — the running periods hold this theme for years, not a season.</p>
            )}
            <div className="mt-3" style={{ minHeight: 40 }}>
              {!entitled ? (
                <div className="flex items-start gap-2.5 rounded-lg px-3 py-3" style={{ background: "color-mix(in srgb, var(--brand-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--brand-gold) 30%, transparent)" }}>
                  <Lock size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--brand-gold)" }} />
                  <p className="text-sm" style={{ margin: 0, color: "var(--color-foreground)", lineHeight: 1.55 }}>
                    This season has its own reading — what it carries, what ripens, what asks to be done. It opens with the Atlas. Soon.
                  </p>
                </div>
              ) : windowReadQ.isLoading ? (
                <VeleaLoader size={24} label="Reading the season…" />
              ) : windowReadQ.data?.available && windowReadQ.data.read ? (
                <p className="text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{windowReadQ.data.read.read}</p>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--color-muted-foreground)", margin: 0 }}>The season is quiet — try again in a moment.</p>
              )}
            </div>
            <button onClick={() => setOpenWindow(null)} className="mt-4 w-full py-2 rounded-full text-[11px] font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", background: "transparent" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
