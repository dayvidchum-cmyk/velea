/**
 * YEAR RANK — every day of a solar year (birthday → birthday) ranked by the book's ladder.
 * David approved this composition 2026-07-15 ("i like it" → "this is the crown day calendar"):
 *
 *   1. TARA BALA from the janma nakshatra — ranked by CLASS then rung:
 *      good (Parama Mitra > Mitra > Sadhaka > Kshema > Sampat)
 *      > mixed (Janma + the hostile taras softened in rounds 2–3, his parihara school)
 *      > bad (first-round Vipat > Pratyak > Naidhana — bottom, no matter what).
 *   2. Tie-break: CHANDRA BALA (day Moon's house from the natal Moon).
 *   3. Context (never a rank mover): open convergence windows + the day's dasha chain.
 *
 *   NO WEIGHTS — the books rank by class and count agreements; so does this.
 *
 * Reuses the app's own tarabala/chandrabala (panchang/crown.ts) — the crown-day law,
 * unchanged. Pure: day stars in, ranked days out. The endpoint owns ephemeris + windows.
 */

import { tarabala, chandrabala, type Tarabala, type Chandrabala } from "../panchang/crown";

export interface YearDayInput {
  date: string;          // YYYY-MM-DD
  dayNakIdx: number;     // the day's ruling nakshatra (majority star), 0 = Ashwini
  dayMoonSignIdx: number;
}

export interface YearWindow {
  theme: string;
  startMs: number;
  endMs: number;
}

export interface RankedDay {
  date: string;
  rank: number;              // 1 = the year's crowning day
  tara: Tarabala;
  chandra: Chandrabala;
  /** Convergence themes open that day (context, not a rank input). */
  windows: string[];
  /** maha›antar›pratyantar running that day (context). */
  chain: string;
}

export interface YearRank {
  days: RankedDay[];
  summary: {
    favorable: number;   // tara quality "good"
    softened: number;    // "mixed" (janma + rounds 2-3 hostiles)
    hostile: number;     // first-round Vipat/Pratyak/Naidhana
    topDates: string[];  // the 12 crowning days
    quietDates: string[];// full-force Naidhana — nothing forward, nothing new
  };
}

// Rung order within each class (taraNum 1..9; see crown.ts TARAS).
const GOOD_ORDER: Record<number, number> = { 9: 0, 8: 1, 6: 2, 4: 3, 2: 4 };
const MIXED_ORDER: Record<number, number> = { 1: 0, 3: 1, 5: 2, 7: 3 };
const BAD_ORDER: Record<number, number> = { 3: 0, 5: 1, 7: 2 };

export function rankYear(opts: {
  birthNakIdx: number;
  natalMoonSignIdx: number;
  days: YearDayInput[];
  windows: YearWindow[];
  /** pratyantar chains: [startMs, endMs, "maha›antar›praty"] — from stored convergence spans. */
  chains: Array<{ startMs: number; endMs: number; label: string }>;
}): YearRank {
  const noonMs = (date: string) => Date.parse(date + "T12:00:00Z");

  const days: RankedDay[] = opts.days.map((d) => {
    const ms = noonMs(d.date);
    return {
      date: d.date,
      rank: 0,
      tara: tarabala(opts.birthNakIdx, d.dayNakIdx),
      chandra: chandrabala(opts.natalMoonSignIdx, d.dayMoonSignIdx),
      windows: Array.from(new Set(
        opts.windows.filter((w) => w.startMs <= ms && ms < w.endMs).map((w) => w.theme))),
      chain: opts.chains.find((c) => c.startMs <= ms && ms < c.endMs)?.label ?? "",
    };
  });

  const key = (x: RankedDay) => {
    const cls = x.tara.quality === "good" ? 0 : x.tara.quality === "mixed" ? 1 : 2;
    const rung = cls === 0 ? GOOD_ORDER[x.tara.taraNum]
      : cls === 1 ? MIXED_ORDER[x.tara.taraNum] : BAD_ORDER[x.tara.taraNum];
    const ch = x.chandra.quality === "good" ? 0 : x.chandra.quality === "neutral" ? 1 : 2;
    return cls * 1e6 + (rung ?? 9) * 1e4 + ch * 1e2 - x.windows.length;
  };
  const sorted = [...days].sort((a, b) => key(a) - key(b) || a.date.localeCompare(b.date));
  sorted.forEach((x, i) => { x.rank = i + 1; });

  return {
    days,
    summary: {
      favorable: days.filter((x) => x.tara.quality === "good").length,
      softened: days.filter((x) => x.tara.quality === "mixed").length,
      hostile: days.filter((x) => x.tara.quality === "bad").length,
      topDates: sorted.slice(0, 12).map((x) => x.date),
      quietDates: days.filter((x) => x.tara.quality === "bad" && x.tara.taraNum === 7).map((x) => x.date),
    },
  };
}
