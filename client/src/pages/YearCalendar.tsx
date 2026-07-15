import { useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";

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
  caution:   ["#cc2f2f", "#ffffff"],
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
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
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
          <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Walking the year…
          </div>
        )}
        {error && <p className="mt-6 text-sm text-muted-foreground">Not available.</p>}

        {data && (
          <>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {[["#2E7D4F", "Golden Day"], ["#77A96B", "Action"], ["#D4AF37", "Build"], ["#00687a", "Selective"], ["#d57176", "Restraint"], ["#cc2f2f", "Caution"]].map(([c, n]) => (
                <span key={n} className="inline-flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: c }} /> {n}
                </span>
              ))}
              <span>★ top 12 · • a window opens or closes</span>
            </div>

            {/* Month grids — always-light warm paper, like the almanac calendar */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {months.map(({ y, m }) => {
                const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
                const nDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
                return (
                  <div key={`${y}-${m}`} className="rounded-xl border border-[#ddd3bf] bg-[#f8f4ea] p-3 text-[#2b2723]">
                    <h3 className="mb-2 font-serif text-sm">
                      {new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                    </h3>
                    <div className="grid grid-cols-7 gap-[3px]">
                      {WEEKDAYS.map((w, i) => (
                        <div key={i} className="text-center text-[9px] tracking-wide text-[#9a917f]">{w}</div>
                      ))}
                      {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
                      {Array.from({ length: nDays }).map((_, i) => {
                        const day = i + 1;
                        const ds = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const d = byDate.get(ds);
                        if (!d) return <div key={ds} className="min-h-[26px] rounded-[5px] pl-1 pt-[2px] text-[11px] text-[#c9c0ad]">{day}</div>;
                        const [bg, ink] = (d as any).movement === "build"
                          ? (({ deep: ["#C49A2E", "#2e2408"], mid: ["#D4AF37", "#3a2f10"], thin: ["#E8C84A", "#4a3c10"] } as Record<string, [string, string]>)[(d as any).buildDepth ?? "mid"])
                          : (d as any).movement
                          ? (MOVEMENT_BG[(d as any).movement] ?? BETWEEN)
                          : d.tara.quality === "good" ? GO_GREEN
                          : d.tara.quality === "bad" ? CAUTION_ROSE : BETWEEN;
                        const tip = `${(d as any).movementWord ? (d as any).movementWord + " · " : ""}#${d.rank} of ${data.days.length} · ${d.plain.day} — ${d.plain.feel} · ${d.plain.moon}${d.plain.windows.length ? ` · open: ${d.plain.windows.join(", ")}` : ""}`;
                        return (
                          <div key={ds} title={tip}
                            className={`relative min-h-[26px] rounded-[5px] pl-1 pt-[2px] text-[11px] tabular-nums ${ds === todayStr ? "ring-2 ring-[#2b2723]" : ""}`}
                            style={{ background: bg, color: ink }}>
                            {day}
                            {topSet.has(ds) && <span className="absolute right-[3px] top-0 text-[9px]">★</span>}
                            {windowEdgeSet.has(ds) && <span className="absolute bottom-[2px] right-[3px] h-[5px] w-[5px] rounded-full bg-current opacity-75" />}
                          </div>
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
    </div>
  );
}
