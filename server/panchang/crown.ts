/**
 * CROWN DAYS — the personal "is today one of YOUR good days?" macro rating.
 *
 * Stacks the universal muhurta hygiene (dayQuality: nakshatra/tithi/yoga — same for
 * everyone) with the two personal Moon-based strengths:
 *   • Tārabala — the day's nakshatra counted from the native's BIRTH star → one of 9 taras.
 *   • Chandrabala — the transit Moon's sign counted from the native's NATAL Moon → 1–12.
 * A "crown" day is when all three align (universal auspicious + good tara + strong chandra)
 * — rare and special, the macro layer under which the Master Mode hours (micro) play out.
 */
import { dayQuality, type DayQuality } from "./auspiciousness.js";

const TWO_PI_27 = 360 / 27;
const norm = (x: number) => ((x % 360) + 360) % 360;

// The 9 taras (day-star counted from birth-star, cycling every 9). Classical qualities.
const TARAS: { name: string; quality: "good" | "bad" | "mixed" }[] = [
  { name: "Janma", quality: "mixed" },       // 1 — the birth star itself; sensitive
  { name: "Sampat", quality: "good" },       // 2 — wealth, prosperity
  { name: "Vipat", quality: "bad" },         // 3 — danger, loss
  { name: "Kshema", quality: "good" },       // 4 — well-being
  { name: "Pratyak", quality: "bad" },       // 5 — obstacle
  { name: "Sadhaka", quality: "good" },      // 6 — achievement
  { name: "Naidhana", quality: "bad" },      // 7 — death/vadha (harshest)
  { name: "Mitra", quality: "good" },        // 8 — friend
  { name: "Parama Mitra", quality: "good" }, // 9 — great friend
];

// Chandrabala: transit Moon's house from the natal Moon. Favorable / avoid / neutral.
const CHANDRA_FAV = new Set([1, 3, 6, 7, 10, 11]);
const CHANDRA_BAD = new Set([4, 8, 12]);

export interface Tarabala { taraNum: number; cycle: 1 | 2 | 3; name: string; quality: "good" | "bad" | "mixed"; favorable: boolean }
export interface Chandrabala { house: number; quality: "good" | "bad" | "neutral"; favorable: boolean }

/** Day-star from birth-star → tara (1–9). Both indices 0-based (Ashwini = 0).
 *  Cycle-weighting (parihara): the 27 counts fall in three rounds of 9. Classical muhurta
 *  holds that the malefic taras (Vipat/Pratyak/Naidhana) strike with full force only in the
 *  FIRST round; in the 2nd and 3rd rounds their dosha is attenuated → treated as "mixed"
 *  (no longer a scoring malus, still never counts as favorable). Good taras are good in
 *  every round. (David adopted this school 2026-07-09 after the align27 divergence.) */
export function tarabala(birthNakIdx: number, dayNakIdx: number): Tarabala {
  const count = ((((dayNakIdx - birthNakIdx) % 27) + 27) % 27) + 1; // 1..27 (inclusive count)
  const taraNum = ((count - 1) % 9) + 1; // 1..9
  const cycle = (Math.ceil(count / 9) as 1 | 2 | 3);
  const t = TARAS[taraNum - 1];
  const quality = t.quality === "bad" && cycle > 1 ? "mixed" : t.quality;
  return { taraNum, cycle, name: t.name, quality, favorable: quality === "good" };
}

/** Transit Moon sign from natal Moon sign → house 1–12. Both indices 0-based (Aries = 0). */
export function chandrabala(natalMoonSignIdx: number, dayMoonSignIdx: number): Chandrabala {
  const house = ((((dayMoonSignIdx - natalMoonSignIdx) % 12) + 12) % 12) + 1; // 1..12
  const quality = CHANDRA_FAV.has(house) ? "good" : CHANDRA_BAD.has(house) ? "bad" : "neutral";
  return { house, quality, favorable: quality === "good" };
}

// ── Transit-to-natal pressure — the personal/chart MACRO layer ──
// Natural benefics vs malefics; the Moon flips with the paksha (waxing = benefic).
const BENEFIC = new Set(["Jupiter", "Venus", "Mercury"]);
// Vedic special aspects (whole-sign house counted from the planet; all planets also see the 7th).
const ASPECT_HOUSES: Record<string, number[]> = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
const aspectHouses = (p: string) => ASPECT_HOUSES[p] ?? [7];
const signDist = (from: number, to: number) => ((((to - from) % 12) + 12) % 12) + 1; // 1..12

export interface TransitScore { score: number; support: string[]; affliction: string[] }

/**
 * Benefic vs malefic transit pressure on the two most sensitive points — the native's Lagna
 * and natal Moon — via conjunction (same sign) and Vedic aspect. Benefics supporting = +,
 * malefics afflicting = −. This is what makes a day *yours*, day to day.
 */
export function transitScore(opts: {
  transitSignByPlanet: Record<string, number>; // planet → sign index 0..11 (that day)
  natalMoonSignIdx: number;
  lagnaSignIdx: number;
  dayTithi: number; // 1..30 (Moon waxing/waning)
}): TransitScore {
  const { transitSignByPlanet: T, natalMoonSignIdx, lagnaSignIdx, dayTithi } = opts;
  const isBen = (p: string) => (p === "Moon" ? dayTithi <= 15 : BENEFIC.has(p));
  const targets: [string, number][] = [["Lagna", lagnaSignIdx], ["Moon", natalMoonSignIdx]];
  let score = 0;
  const support: string[] = [], affliction: string[] = [];
  for (const [p, sign] of Object.entries(T)) {
    if (sign == null) continue;
    for (const [tName, tSign] of targets) {
      const dist = signDist(sign, tSign);
      const conj = dist === 1;
      const asp = !conj && aspectHouses(p).includes(dist);
      if (!conj && !asp) continue;
      const label = `${p} ${conj ? "conjoins" : "aspects"} your ${tName}`;
      if (isBen(p)) { score += 1; support.push(label); }
      else { score -= 1; affliction.push(label); }
    }
  }
  return { score, support, affliction };
}

export type CrownRating = "crown" | "favorable" | "neutral" | "caution";

export interface CrownDay {
  rating: CrownRating;
  score: number;
  universal: DayQuality;
  tarabala: Tarabala;
  chandrabala: Chandrabala;
  transit?: TransitScore;
}

/**
 * The composite — universal auspiciousness ⊗ Moon-strength (tara + chandra) ⊗ your transits.
 * `sunLon`/`moonLon` are the day's sidereal longitudes (noon); pass the day's transit signs +
 * the native's lagna to unlock the personal transit layer (a crown needs it net-positive).
 */
export function crownDay(opts: {
  birthNakIdx: number;      // 0..26, native's Moon nakshatra at birth
  natalMoonSignIdx: number; // 0..11, native's natal Moon sign
  lagnaSignIdx?: number;    // 0..11, native's ascendant
  sunLon: number;
  moonLon: number;
  transitSignByPlanet?: Record<string, number>; // that day's planet signs, for the transit layer
  universalThreshold?: number;
}): CrownDay {
  const dq = dayQuality(opts.sunLon, opts.moonLon, opts.universalThreshold ?? 2);
  const dayNakIdx = dq.nakshatra;                        // 0..26
  const dayMoonSignIdx = Math.floor(norm(opts.moonLon) / 30); // 0..11
  const tb = tarabala(opts.birthNakIdx, dayNakIdx);
  const cb = chandrabala(opts.natalMoonSignIdx, dayMoonSignIdx);

  let score = dq.score; // universal net (-3..+2)
  score += tb.favorable ? 1 : tb.quality === "bad" ? -1 : 0;
  score += cb.favorable ? 1 : cb.quality === "bad" ? -1 : 0;

  let ts: TransitScore | undefined;
  if (opts.transitSignByPlanet && opts.lagnaSignIdx != null) {
    ts = transitScore({ transitSignByPlanet: opts.transitSignByPlanet, natalMoonSignIdx: opts.natalMoonSignIdx, lagnaSignIdx: opts.lagnaSignIdx, dayTithi: dq.tithi });
    score += Math.round(ts.score / 2); // weighted so transits inform, not dominate
  }

  // Crown = the daily APEX: both Moon strengths aligned (good tara AND good chandra) on a
  // non-negative universal day, and the day's transits aren't a malefic pileup. The slow-transit
  // season tone shifts the favorable/caution bands (via `score`) but can't erase the apex — a
  // tough season just means fewer of the daily factors line up, not that a clean day is denied.
  const crown = tb.favorable && cb.favorable && dq.score >= 0 && (!ts || ts.score > -3);
  const rating: CrownRating = crown ? "crown" : score >= 2 ? "favorable" : score <= -3 ? "caution" : "neutral";
  return { rating, score, universal: dq, tarabala: tb, chandrabala: cb, transit: ts };
}
