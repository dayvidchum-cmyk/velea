import { useMemo, useState } from "react";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import OctagramMark from "@/components/OctagramMark";
import LotusMark from "@/components/LotusMark";
import SummitMark from "@/components/SummitMark";
import { trpc } from "@/lib/trpc";
import AddTaskSheet from "@/components/AddTaskSheet";

// The month calendar's mark system, mirrored for the year pop-up (Planner is the source of truth).
const PLANET_GLYPH: Record<string, string> = { Mercury: "\u263F\uFE0E", Venus: "\u2640\uFE0E", Mars: "\u2642\uFE0E", Jupiter: "\u2643\uFE0E", Saturn: "\u2644\uFE0E" };
const PLANET_GLYPH_FONT = '"Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols", "Noto Sans Symbols2", sans-serif';
const MARK_INK: Record<string, string> = { dollar: "#77A96B", crown: "#D4AF37", Mercury: "#3FA8A0", Saturn: "#454A8C" };

/**
 * YEAR CALENDAR — the crown-day calendar, whole-year edition (David: "this is the crown day
 * calendar", 2026-07-15). Every day of the solar year (birthday → birthday) on the book's
 * ladder: Tara Bala class→rung (with the parihara round-softening the app already uses),
 * Chandra Bala tie-break, convergence windows as context. The look is David's approved demo:
 * warm-paper month cards, deeper gold = higher rung, reds = first-round hostile taras,
 * ★ = the twelve crowning days, dot = a window is open. ADMIN-GATED v1.
 */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// THE SIX MOVEMENTS (David 2026-07-15) — his words, his colors, same law as the month view.
const MOVEMENT_BG: Record<string, [string, string]> = {
  golden:    ["#2E7D4F", "#ffffff"],
  action:    ["#77A96B", "#1d2a18"],
  selective: ["#00687a", "#E8F1F2"],
  build:     ["#D4AF37", "#3a2f10"],
  restraint: ["#d57176", "#3A1518"],
  caution:   ["#B3232F", "#ffffff"],
};
const GO_GREEN: [string, string] = ["#90a989", "#243320"];
const CAUTION_ROSE: [string, string] = ["#d57176", "#3A1518"];
const BETWEEN: [string, string] = ["#00687a", "#E8F1F2"];

type RankedDay = {
  date: string; rank: number;
  tara: { taraNum: number; cycle: number; name: string; quality: "good" | "bad" | "mixed"; favorable: boolean };
  chandra: { house: number; quality: string; favorable: boolean };
  windows: string[]; chain: string;
  plain: { day: string; feel: string; moon: string; windows: string[] };
};

const fmtDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
};

// Tonal ink (the Today law): never white/black — deep self-hue on light fills, pale
// cream-tint on dark fills.
function tonalInkY(hex: string): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 120
    ? `color-mix(in srgb, ${hex} 42%, #2A1F14)`
    : `color-mix(in srgb, ${hex} 24%, #FBF7ED)`;
}

export default function YearCalendar() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.crown.forYear.useQuery(undefined, {
    staleTime: 24 * 3600e3, retry: false,
  });

  const byDate = useMemo(() => {
    const m = new Map<string, RankedDay>();
    for (const d of (data?.days ?? []) as RankedDay[]) m.set(d.date, d);
    return m;
  }, [data]);

  const months = useMemo(() => {
    if (!data) return [] as Array<{ y: number; m: number }>;
    const out: Array<{ y: number; m: number }> = [];
    const [sy, sm] = data.yearStart.split("-").map(Number);
    const [ey, em] = data.yearEnd.split("-").map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      out.push({ y, m });
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }, [data]);

  const topSet = useMemo(() => new Set(data?.summary?.topDates ?? []), [data]);
  // A dot on EVERY day of a months-long window is noise (David's screenshot) — mark only the
  // days a window OPENS or CLOSES; the lists below carry the standing coverage.
  const windowEdgeSet = useMemo(() => {
    const edges = new Set<string>();
    const days = (data?.days ?? []) as RankedDay[];
    for (let i = 0; i < days.length; i++) {
      const prev = new Set(i > 0 ? days[i - 1].windows : []);
      const curr = new Set(days[i].windows);
      const opened = days[i].windows.some((w) => !prev.has(w));
      const closed = i > 0 && days[i - 1].windows.some((w) => !curr.has(w));
      if (opened || closed) edges.add(days[i].date);
    }
    return edges;
  }, [data]);
  // LOCAL date, not UTC — toISOString rolls to tomorrow after 8pm Boston (David caught
  // the ring on 7/16 while living 7/15). Same local frame as the month calendar.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Day pop-up (David: "click the calendar, pop-up! Maybe even with an add task plus sign")
  const [dayPopup, setDayPopup] = useState<{ ds: string; d: any } | null>(null);
  // Sky marks for the POPUP's month only (fetched on open; 1h stale like the month view).
  const { data: popupSky } = trpc.sky.monthMarks.useQuery(
    { yearMonth: dayPopup?.ds.slice(0, 7) ?? "" },
    { enabled: !!dayPopup, staleTime: 60 * 60 * 1000 },
  );
  const popupMarks = useMemo(() => {
    if (!dayPopup || !popupSky) return { planets: [] as { planet: string; state: string; detail: string }[], eclipse: null as string | null };
    const ds = dayPopup.ds;
    const rank: Record<string, number> = { "station-retro": 5, "station-direct": 5, window: 4 };
    const by = new Map<string, { planet: string; state: string; detail: string }>();
    const add = (planet: string, state: string, detail: string) => {
      const e = by.get(planet);
      if (!e || rank[state] > rank[e.state]) by.set(planet, { planet, state, detail });
    };
    for (const p of (popupSky as any).retro ?? []) {
      for (const st of p.stations) if (st.date === ds) add(p.planet, st.type === "turns retrograde" ? "station-retro" : "station-direct", st.type === "turns retrograde" ? "stations retrograde" : "stations direct");
      for (const w of p.windowDays) if (w === ds) add(p.planet, "window", "station window");
    }
    const order = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
    const eclipse = ((popupSky as any).eclipses ?? []).find((e: any) => e.date === ds)?.type ?? null;
    return { planets: Array.from(by.values()).sort((a, b) => order.indexOf(a.planet) - order.indexOf(b.planet)), eclipse };
  }, [dayPopup, popupSky]);
  // Station/window planet glyphs for EVERY tile (David 2026-07-16 mock: "planet glyphs
  // and $ added") — one collective-sky sweep for the whole solar year.
  const { data: yearSky } = trpc.sky.yearMarks.useQuery(
    { from: data?.yearStart ?? "", to: data?.yearEnd ?? "" },
    { enabled: !!data, staleTime: 60 * 60 * 1000 },
  );
  const tileMarksByDate = useMemo(() => {
    const m = new Map<string, { planet: string; station: boolean }[]>();
    for (const mk of yearSky ?? []) {
      let arr = m.get(mk.date);
      if (!arr) { arr = []; m.set(mk.date, arr); }
      const ex = arr.find((e) => e.planet === mk.planet);
      const station = mk.kind !== "window";
      if (ex) ex.station = ex.station || station; else arr.push({ planet: mk.planet, station });
    }
    return m;
  }, [yearSky]);
  const [crownsOpen, setCrownsOpen] = useState(false);
  const [cautionsOpen, setCautionsOpen] = useState(false);
  const [addForDate, setAddForDate] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container py-6"><AppHeader /></div>
      <main className="mx-auto max-w-3xl px-3 pt-3">
        <button onClick={() => navigate("/")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-serif text-xl">Your year, ranked</h1>
        {data && (
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDay(data.yearStart)} → {fmtDay(data.yearEnd)} · every day graded from your birth star ·{" "}
            {data.summary.favorable} favorable · {data.summary.softened} softened · {data.summary.hostile} hard days
          </p>
        )}

        {isLoading && (
          <div className="mt-10"><VeleaLoader label="Walking the year…" /></div>
        )}
        {error && <p className="mt-6 text-sm text-muted-foreground">Not available.</p>}

        {data && (
          <>
            {/* THE TWELVE CROWNING DAYS — listed and tappable (David 2026-07-16). */}
            <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid color-mix(in srgb, var(--day-accent) 40%, transparent)", background: "var(--color-card)" }}>
              <button onClick={() => setCrownsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--heading-ink)" }}><OctagramMark size={14} color="var(--brand-gold)" strokeWidth={1.2} /> The twelve crowning days</span>
                <ChevronDown size={17} style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: crownsOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
              </button>
              {crownsOpen && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-1">
                  {(Array.from(topSet) as string[]).sort().map((ds: string) => {
                    const d = byDate.get(ds);
                    return (
                      <button key={ds} onClick={() => d && setDayPopup({ ds, d })} className="text-left text-xs py-0.5" style={{ color: "var(--color-foreground)" }}>
                        <OctagramMark size={11} color="#2E7D4F" strokeWidth={1.4} style={{ verticalAlign: "-1px", marginRight: 2 }} /> {new Date(ds + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* THE CAUTION DAYS — listed and accessible too (David 2026-07-16). */}
            <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid color-mix(in srgb, #B3232F 40%, transparent)", background: "var(--color-card)" }}>
              <button onClick={() => setCautionsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-bold" style={{ color: "color-mix(in srgb, #B3232F 70%, var(--heading-ink))" }}>■ The caution days — stop, stop, stop</span>
                <ChevronDown size={17} style={{ marginTop: -2, color: "var(--color-muted-foreground)", transform: cautionsOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
              </button>
              {cautionsOpen && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-1">
                  {(data?.days ?? []).filter((d: any) => d.tara?.quality === "bad" && d.tara?.taraNum === 7 && d.tara?.cycle === 1).map((d: any) => (
                    <button key={d.date} onClick={() => setDayPopup({ ds: d.date, d })} className="text-left text-xs py-0.5" style={{ color: "var(--color-foreground)" }}>
                      <span style={{ color: "#B3232F", fontWeight: 700 }}>■</span> {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Legend RETIRED (David's ruling: pop-ups teach, legends are decoder rings) —
                tap any day and it explains itself. */}

            {/* Month grids — always-light warm paper, like the almanac calendar */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {months.map(({ y, m }) => {
                const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
                const nDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
                return (
                  <div key={`${y}-${m}`} className="parchment rounded-xl border border-[#ddd3bf] bg-[#f8f4ea] p-3 text-[#2b2723]" style={{ boxShadow: "none" }}>
                    <h3 className="mb-2 font-serif text-sm" style={{ color: "#4b4034" }}>
                      {new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                    </h3>
                    <div className="grid grid-cols-7 gap-[3px]">
                      {WEEKDAYS.map((w, i) => (
                        <div key={i} className="text-center text-[9px] tracking-wide font-semibold text-[#6B6355]">{w}</div>
                      ))}
                      {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
                      {Array.from({ length: nDays }).map((_, i) => {
                        const day = i + 1;
                        const ds = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const d = byDate.get(ds);
                        if (!d) return <div key={ds} className="min-h-[26px] rounded-[5px] pl-1 pt-[2px] text-[11px] text-[#c9c0ad]">{day}</div>;
                        // THE MONTH-CALENDAR LANGUAGE (David's spec 2026-07-16): every number
                        // wears its mode color BARE — a fill only for today, the picked day, or a
                        // crowned day; no ring on today; the coin palette is the one source.
                        const DEPTH_C: Record<string, Record<string, string>> = {
                          build: { deep: "#C49A2E", mid: "#D4AF37", thin: "#CD9E86", leaning: "#BC886F" },
                          selective: { deep: "#00525F", mid: "#00687a", thin: "#2E8291", leaning: "#54787C" },
                          action: { deep: "#5E9457", mid: "#77A96B", thin: "#94BC88", leaning: "#9AA579" },
                        };
                        const MOVE_C: Record<string, string> = { golden: "#2E7D4F", action: "#77A96B", selective: "#00687a", build: "#D4AF37", restraint: "#d57176", caution: "#B3232F" };
                        const mvKey = (d as any).movement as string | undefined;
                        const dep = (d as any).depth ?? (d as any).buildDepth;
                        const coin = (mvKey && DEPTH_C[mvKey]?.[dep ?? "mid"]) || (mvKey && MOVE_C[mvKey])
                          || (d.tara.quality === "good" ? "#77A96B" : d.tara.quality === "bad" ? "#d57176" : "#54787C");
                        const shade = (hex: string) => {
                          const n = parseInt(hex.slice(1), 16);
                          const ch = (v: number) => Math.max(0, Math.round(v * 0.45)).toString(16).padStart(2, "0");
                          return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
                        };
                        const isToday = ds === todayStr, isPicked = dayPopup?.ds === ds, isCrown = topSet.has(ds);
                        const filled = isToday || isCrown;
                        const bg = filled
                          ? `color-mix(in srgb, ${coin} 62%, #f8f4ea)`
                          : isPicked ? `color-mix(in srgb, ${coin} 26%, #f8f4ea)` : "transparent";
                        const marks = tileMarksByDate.get(ds) ?? [];
                        const isDollar = d.tara.taraNum === 2;
                        const isCaution = mvKey === "caution";
                        const hasDot = windowEdgeSet.has(ds);
                        return (
                          <button key={ds} onClick={() => setDayPopup({ ds, d })}
                            className="relative min-h-[26px] rounded-[5px] pl-1 pt-[2px] text-[11px] tabular-nums text-left font-semibold"
                            style={{ background: isCrown ? "transparent" : bg, color: filled || isPicked ? shade(coin) : coin,
                              // Border laws (David 2026-07-16): crown = gold; caution = ruby;
                              // any tile carrying a glyph, $ OR a window dot = fine anchor
                              // border of its own hue. Bare days stay bare.
                              border: isCrown ? "1.5px solid #F2C21C"
                                : isCaution ? "1px solid color-mix(in srgb, #B3232F 60%, transparent)"
                                : (isDollar || marks.length > 0 || hasDot) ? `1px solid color-mix(in srgb, ${coin} 50%, transparent)`
                                : "1px solid transparent" }}>
                            {/* THE LAKSHMI TREATMENT (David 2026-07-16: "All glyphs larger. If it
                                is the only one, besides the lone dots, it is like the Lakshmi
                                star"): a tile carrying exactly ONE mark shows it BIG and centered
                                — the day IS the mark. Multi-mark tiles keep the corner cluster,
                                larger. Window dots don't count and stay in their corner. */}
                            {(() => {
                              const markCount = (isDollar ? 1 : 0) + marks.length;
                              const solo = !isCrown && markCount === 1;
                              return (
                                <>
                                  {isCrown ? (
                                    <span className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
                                      <OctagramMark size={20} color="#D4AF37" strokeWidth={1.4} style={{ filter: "drop-shadow(0 0 2px rgba(242,194,28,0.45))" }} />
                                    </span>
                                  ) : solo ? (
                                    <span className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
                                      {isDollar
                                        ? <LotusMark size={18} strokeWidth={1.9} />
                                        : <span style={{ fontFamily: PLANET_GLYPH_FONT, fontSize: marks[0].station ? "17px" : "15px", fontWeight: 700, lineHeight: 1, color: MARK_INK[marks[0].planet] ?? "#6B6355" }}>{PLANET_GLYPH[marks[0].planet]}</span>}
                                    </span>
                                  ) : day}
                                  {!solo && !isCrown && markCount > 0 && (
                                    <span className="absolute right-[2px] top-[1px] flex items-center gap-[2px]" style={{ lineHeight: 1 }}>
                                      {isDollar && <LotusMark size={14} strokeWidth={2.2} style={{ display: "block" }} />}
                                      {marks.slice(0, 2).map((mk) => (
                                        <span key={mk.planet} style={{ fontFamily: PLANET_GLYPH_FONT, fontSize: mk.station ? "13px" : "11px", fontWeight: 700, color: MARK_INK[mk.planet] ?? "#6B6355" }}>{PLANET_GLYPH[mk.planet]}</span>
                                      ))}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            {hasDot && !isCrown && <span className="absolute bottom-[2px] right-[3px] h-[5px] w-[5px] rounded-full bg-current opacity-75" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crowning days — collapsed by default (the app's law) */}
            <details className="mt-4 rounded-xl border border-[#ddd3bf] bg-[#f8f4ea] p-3 text-[#2b2723]">
              <summary className="cursor-pointer font-serif text-sm">The twelve crowning days</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {(data.summary.topDates as string[]).map((ds, i) => {
                  const d = byDate.get(ds);
                  return (
                    <li key={ds} className="flex items-baseline gap-2">
                      <span className="w-8 tabular-nums text-[#9a917f]">#{i + 1}</span>
                      <span className="tabular-nums">{fmtDay(ds)}</span>
                      <span className="text-xs text-[#9a917f]">{d?.plain.day}{d?.plain.windows.length ? ` · open: ${d.plain.windows.join(", ")}` : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </details>

            <details className="mt-3 rounded-xl border border-[#ddd3bf] bg-[#f8f4ea] p-3 text-[#2b2723]">
              <summary className="cursor-pointer font-serif text-sm">Days to keep quiet ({(data.summary.quietDates as string[]).length})</summary>
              <p className="mt-2 text-sm">{(data.summary.quietDates as string[]).map(fmtDay).join(" · ")}</p>
              <p className="mt-2 text-xs text-[#9a917f]">Loss-star days at full force — the bottom of your ranking. Nothing forward, nothing new.</p>
            </details>

            <p className="mt-4 text-xs text-muted-foreground">
              Every day is graded by how the day's Moon-star sits from your birth star — nine kinds of day,
              from great friend down to loss — with the Moon's position from yours breaking ties, and your
              open windows shown for context. The tradition's own method, no invented scoring.
            </p>
          </>
        )}
      </main>

      {/* DAY POP-UP — dead center: the day explains itself, and the + adds a task due then. */}
      {dayPopup && (() => {
        const { ds, d } = dayPopup;
        const mvKey = (d as any).movement as string | undefined;
        const word = (d as any).movementWord ?? "";
        const dep = (d as any).depth ?? (d as any).buildDepth;
        const wordColor = mvKey ? (({ golden: "#2E7D4F", action: "#77A96B", selective: "#00687a", build: "#D4AF37", restraint: "#d57176", caution: "#B3232F" } as Record<string, string>)[mvKey] ?? "var(--heading-ink)") : "var(--heading-ink)";
        const taraNum = d.tara?.taraNum;
        const dateNice = new Date(ds + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(30, 24, 16, 0.45)" }} onClick={() => setDayPopup(null)}>
            <div className="parchment w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--parchment)", boxShadow: "0 18px 60px rgba(0,0,0,0.35)", border: "1.5px solid color-mix(in srgb, var(--day-accent) 45%, transparent)", maxHeight: "80dvh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              <p className="font-serif text-lg" style={{ color: "var(--heading-ink)", fontWeight: 700 }}>{dateNice}</p>
              <p className="mt-1 text-sm font-bold uppercase" style={{ letterSpacing: "0.08em", color: wordColor }}>
                {word}{dep && dep !== "mid" ? ` · ${dep}` : ""}
                {taraNum === 2 && <span style={{ marginLeft: 8, color: "#77A96B" }}><LotusMark size={13} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 3 }} />prosperity</span>}
                {taraNum === 6 && <span style={{ marginLeft: 8, color: "#D4AF37" }}><SummitMark size={13} strokeWidth={1.9} style={{ verticalAlign: "-2px", marginRight: 3 }} />achievement</span>}
                {topSet.has(ds) && <span style={{ marginLeft: 8, color: "#2E7D4F" }}><OctagramMark size={11} color="#2E7D4F" strokeWidth={1.4} style={{ verticalAlign: "-1px", marginRight: 3 }} />crowning day</span>}
              </p>
              {/* THE DAY'S MARKS (David 2026-07-16: "planet glyphs and $ signs and moons in the
                  year pop-up") — the same marks the month coins wear, spelled out. The slot is
                  ALWAYS rendered at a reserved height so the async sky fetch can't grow the card
                  under the thumb (David: "the bottom is running away from me"). */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ minHeight: 18 }}>
                  {popupMarks.eclipse && (
                    <span className="text-xs inline-flex items-center gap-1.5" style={{ color: "var(--color-foreground)" }}>
                      <span style={{ width: 11, height: 11, borderRadius: 999, background: "#160f26", border: "1.25px solid #F2C21C", boxShadow: "0 0 4px rgba(242,194,28,0.5)", display: "inline-block" }} />
                      {popupMarks.eclipse === "solar" ? "Solar" : "Lunar"} eclipse
                    </span>
                  )}
                  {!popupMarks.eclipse && (d as any).moonPhase && (
                    <span className="text-xs inline-flex items-center gap-1.5" style={{ color: "var(--color-foreground)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: (d as any).moonPhase === "full" ? "#FDFBF3" : "#160f26", border: (d as any).moonPhase === "full" ? "1px solid #8a8264" : "1px solid #160f26", display: "inline-block" }} />
                      {(d as any).moonPhase === "full" ? "Purnima — full moon" : "Amavasya — new moon"}
                    </span>
                  )}
                  {popupMarks.planets.map((m) => (
                    <span key={m.planet} className="text-xs inline-flex items-center gap-1" style={{ color: "var(--color-foreground)" }}>
                      <span style={{ fontFamily: PLANET_GLYPH_FONT, fontWeight: 700, fontSize: m.state.startsWith("station") ? "1.05rem" : "0.9rem", color: MARK_INK[m.planet] ?? "var(--heading-ink)", lineHeight: 1 }}>{PLANET_GLYPH[m.planet]}</span>
                      {m.planet} {m.detail}
                    </span>
                  ))}
                </div>
              <p className="mt-2 text-sm" style={{ color: "var(--color-foreground)", lineHeight: 1.55 }}>
                #{d.rank} of {data?.days.length ?? 365} · {d.plain.day} — {d.plain.feel}; {d.plain.moon}.
              </p>
              {d.plain.windows.length > 0 && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Open: {d.plain.windows.join(", ")}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setAddForDate(ds); setDayPopup(null); }}
                  className="flex-1 py-2 rounded-full text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.1em", color: "#FBF7ED", background: "var(--heading-ink)", border: "none" }}>
                  + Task this day
                </button>
                <button onClick={() => setDayPopup(null)} className="px-4 py-2 rounded-full text-[11px] font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", background: "transparent" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <AddTaskSheet open={!!addForDate} onClose={() => setAddForDate(null)} initialDueDate={addForDate ?? undefined} openWithSuggestion />
    </div>
  );
}
