/**
 * DASHA TREE — the complete Vimshottari system from birth to 120 years, every level.
 *
 * David's law (2026-07-14): when a profile is created, the ENTIRE detailed dasha system is
 * computed once, accurately, and stored — maha, antar, pratyantar, sookshma, prana. Surfaces
 * read stored truth; they never re-derive it ad hoc.
 *
 * The math is the classical proportional tiling: the Moon's birth nakshatra names the first
 * maha lord and the elapsed fraction (degrees into the nakshatra ÷ 13°20'); every span is
 * then divided among all nine lords in Vimshottari order STARTING FROM ITS OWN LORD, each
 * child getting (childYears / 120) of the parent. Levels tile exactly — the last child
 * always snaps to the parent's end, so there is never drift (same guarantee as
 * dasha-calculator.ts's pratyantar tiler, generalized).
 *
 * PRECISION IS HONEST. Everything runs in UTC milliseconds from the exact birth instant.
 * A prana averages ~18 hours and a sookshma ~4.5 days — meaningless when the birth time
 * itself is a noon placeholder. Callers pass `maxLevel`: timed charts go to 5 (prana);
 * no-time (Chandra) charts stop at 3 (pratyantar), the depth a date-only birth supports.
 *
 * Constants mirror server/dasha-calculator.ts (the proven day-grain engine, kept for its
 * existing callers). Year length = 365.25 days, matching it, so the two agree on dates.
 *
 * Pure: birth instant + Moon longitude in, periods out. No ephemeris, no DB.
 */

export const DASHA_SEQUENCE: { planet: string; years: number }[] = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 },
];

const NAKSHATRA_SPAN = 360 / 27; // 13°20'
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
export const LEVEL_NAMES = ["maha", "antar", "pratyantar", "sookshma", "prana"] as const;
export type DashaLevel = 1 | 2 | 3 | 4 | 5;

export interface DashaPeriod {
  /** 1 = maha … 5 = prana. */
  level: DashaLevel;
  /** Lord chain from maha down to this level, e.g. ["Venus","Sun","Moon"]. */
  lords: string[];
  startMs: number;
  endMs: number;
}

/**
 * The full tree, flattened depth-first (a parent immediately precedes its children).
 * Base counts for a birth at 0° of a nakshatra: 9 mahas, 81 antars, 729 pratyantars,
 * 6 561 sookshmas, 59 049 pranas.
 *
 * COVERAGE IS AGE 0 → 120 (David's directive #2: "from birth to 120 years old"). The
 * classical 120-year cycle starts partway through for anyone born mid-nakshatra, so one
 * cycle alone would stop at age (120 − elapsed). We therefore continue into the SECOND
 * cycle (it restarts with the same lord sequence) until the maha containing the native's
 * 120th birthday has been emitted whole.
 *
 * @param birthUtcMs exact birth instant (UTC epoch ms)
 * @param moonLon    the Moon's sidereal longitude at birth (0..360)
 * @param maxLevel   how deep to generate — 5 for timed births, 3 for no-time (Chandra)
 */
export function dashaTree(birthUtcMs: number, moonLon: number, maxLevel: DashaLevel = 5): DashaPeriod[] {
  const lon = ((moonLon % 360) + 360) % 360;
  const nakIdx = Math.floor(lon / NAKSHATRA_SPAN); // 0 = Ashwini → Ketu, cycling by 9
  const startIdx = nakIdx % 9;
  const elapsedFraction = (lon % NAKSHATRA_SPAN) / NAKSHATRA_SPAN;

  const out: DashaPeriod[] = [];
  const horizonMs = birthUtcMs + 120 * MS_PER_YEAR; // the 120th birthday

  // The birth maha is already partially elapsed: its notional start predates birth so the
  // sub-levels tile the FULL maha and birth simply falls inside — the classical method.
  const firstMahaYears = DASHA_SEQUENCE[startIdx].years;
  let mahaStart = birthUtcMs - elapsedFraction * firstMahaYears * MS_PER_YEAR;

  for (let i = 0; mahaStart < horizonMs; i++) {
    const idx = (startIdx + i) % 9;
    const mahaEnd = mahaStart + DASHA_SEQUENCE[idx].years * MS_PER_YEAR;
    subdivide(out, 1, [DASHA_SEQUENCE[idx].planet], idx, mahaStart, mahaEnd, maxLevel, birthUtcMs);
    mahaStart = mahaEnd;
  }
  return out;
}

/** Emit one period (clipped to birth at the top level) and tile its children. */
function subdivide(
  out: DashaPeriod[],
  level: DashaLevel,
  lords: string[],
  lordIdx: number,
  startMs: number,
  endMs: number,
  maxLevel: DashaLevel,
  birthUtcMs: number,
): void {
  // Every call straddles or follows birth (pre-birth children are pruned below); a span
  // that started before birth is clipped to the birth instant — the classical convention.
  out.push({ level, lords, startMs: Math.max(startMs, birthUtcMs), endMs });
  if (level >= maxLevel) return;

  const span = endMs - startMs;
  let cursor = startMs;
  for (let k = 0; k < 9; k++) {
    const childIdx = (lordIdx + k) % 9;
    const child = DASHA_SEQUENCE[childIdx];
    const childEnd = k === 8 ? endMs : cursor + (child.years / 120) * span;
    // A child that ends before birth is skipped whole — all its descendants end before
    // birth too, so nothing storable is lost.
    if (childEnd > birthUtcMs) {
      subdivide(out, (level + 1) as DashaLevel, [...lords, child.planet], childIdx, cursor, childEnd, maxLevel, birthUtcMs);
    }
    cursor = childEnd;
  }
}

/** The running chain at `atMs` for each level ≤ maxLevel — a convenience for spot lookups. */
export function dashaChainAt(periods: DashaPeriod[], atMs: number): DashaPeriod[] {
  return periods.filter((p) => atMs >= p.startMs && atMs < p.endMs)
    .sort((a, b) => a.level - b.level);
}
