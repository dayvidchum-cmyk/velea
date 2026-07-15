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

// David's approved palette: good rungs deepen gold; janma/softened = parchment; bad deepen red.
const GOOD_BG: Record<number, [string, string]> = {
  9: ["#b8860b", "#fff"], 8: ["#c69a2e", "#fff"], 6: ["#d4af55", "#3a3122"],
  4: ["#e0c47e", "#3a3122"], 2: ["#ead6a3", "#3a3122"],
};
const BAD_BG: Record<number, [string, string]> = {
  3: ["#d9a49b", "#40201b"], 5: ["#c97f73", "#40201b"], 7: ["#a94f42", "#fff"],
};
const MIXED_BG: [string, string] = ["#eee6d4", "#6b6455"];

type RankedDay = {
  date: string; rank: number;
  tara: { taraNum: number; cycle: number; name: string; quality: "good" | "bad" | "mixed"; favorable: boolean };
  chandra: { house: number; quality: string; favorable: boolean };
  windows: string[]; chain: string;
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
            {fmtDay(data.yearStart)} → {fmtDay(data.yearEnd)} · every day on the ladder from your birth star ·{" "}
            {data.summary.favorable} favorable · {data.summary.softened} softened · {data.summary.hostile} first-round hostile
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
              {[["#b8860b", "Parama Mitra"], ["#c69a2e", "Mitra"], ["#d4af55", "Sadhaka"], ["#e0c47e", "Kshema"], ["#ead6a3", "Sampat"], ["#eee6d4", "Janma / softened"], ["#d9a49b", "Vipat"], ["#c97f73", "Pratyak"], ["#a94f42", "Naidhana"]].map(([c, n]) => (
                <span key={n} className="inline-flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: c }} /> {n}
                </span>
              ))}
              <span>★ top 12 · • window open</span>
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
                        const [bg, ink] = d.tara.quality === "good" ? GOOD_BG[d.tara.taraNum]
                          : d.tara.quality === "bad" ? BAD_BG[d.tara.taraNum] : MIXED_BG;
                        const softened = d.tara.quality === "mixed" && d.tara.taraNum !== 1;
                        const tip = `#${d.rank} of ${data.days.length} · ${d.tara.name}${softened ? ` (softened, round ${d.tara.cycle})` : ""} · Chandra ${d.chandra.quality} (H${d.chandra.house})${d.chain ? ` · ${d.chain}` : ""}${d.windows.length ? ` · open: ${d.windows.join(", ")}` : ""}`;
                        return (
                          <div key={ds} title={tip}
                            className={`relative min-h-[26px] rounded-[5px] pl-1 pt-[2px] text-[11px] tabular-nums ${ds === todayStr ? "ring-2 ring-[#2b2723]" : ""}`}
                            style={{ background: bg, color: ink }}>
                            {day}
                            {topSet.has(ds) && <span className="absolute right-[3px] top-0 text-[9px]">★</span>}
                            {d.windows.length > 0 && <span className="absolute bottom-[2px] right-[3px] h-[5px] w-[5px] rounded-full bg-current opacity-75" />}
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
                      <span className="text-xs text-[#9a917f]">{d?.tara.name}{d?.windows.length ? ` · ${d.windows.join(", ")}` : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </details>

            <details className="mt-3 rounded-xl border border-[#ddd3bf] bg-[#f8f4ea] p-3 text-[#2b2723]">
              <summary className="cursor-pointer font-serif text-sm">Days to keep quiet ({(data.summary.quietDates as string[]).length})</summary>
              <p className="mt-2 text-sm">{(data.summary.quietDates as string[]).map(fmtDay).join(" · ")}</p>
              <p className="mt-2 text-xs text-[#9a917f]">First-round Naidhana — the ladder's bottom rung at full force. Nothing forward, nothing new.</p>
            </details>

            <p className="mt-4 text-xs text-muted-foreground">
              The books' instruments only — the nine-fold Tara ladder from your birth star (ranked by class, then rung),
              Chandra Bala as tie-break, your convergence windows as context. No weights.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
