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
import { computeAshtakavarga, sarvaBindu, SARVA_TOTAL, type Ashtakavarga, type RefPoint } from "../vedic/ashtakavarga.js";

const TWO_PI_27 = 360 / 27;
const norm = (x: number) => ((x % 360) + 360) % 360;

// Ashtakavarga support baseline — the mean SAV per sign (337/12 ≈ 28.1). A day's Moon-sign
// bindus are read RELATIVE to this: above = supported, well below = thin. AV never penalizes on
// its own (a bindu is a benefic contribution, not a malefic); it BOOSTS, and only interacts with
// an adverse tara to deepen caution. See velea-precision-engine-roadmap.
const AV_BASELINE = SARVA_TOTAL / 12;
const AV_GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;

/**
 * Natal Ashtakavarga from the native's planet + lagna sign indices (0–11). Returns null if any of
 * the seven grahas or the lagna is missing (e.g. an incomplete/Moon-only anchor) — callers then
 * fall back to the pre-AV crown scoring, unchanged.
 */
export function natalAshtakavarga(signIdxByPlanet: Record<string, number | undefined>, lagnaSignIdx: number): Ashtakavarga | null {
  if (lagnaSignIdx == null || lagnaSignIdx < 0) return null;
  const refSign = { Lagna: lagnaSignIdx } as Record<RefPoint, number>;
  for (const p of AV_GRAHAS) {
    const s = signIdxByPlanet[p];
    if (s == null || s < 0) return null;
    refSign[p] = s;
  }
  return computeAshtakavarga(refSign);
}

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
  /** Ashtakavarga support of the day's Moon sign (present only when natal AV was supplied). */
  ashtakavarga?: { moonSignBindu: number; support: "high" | "neutral" | "low" };
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
  /** Majority-of-day star (David's ruling 2026-07-09): when provided, the tara is counted from
   *  the nakshatra that RULES most of the vedic day, not the noon-UTC instant. The universal
   *  (collective/golden) scoring keeps the noon convention — it is a different, shared layer. */
  dayNakIdxOverride?: number;
  /** Natal Ashtakavarga (optional). When supplied, the day's Moon-sign bindus INTERACT with the
   *  tara: they boost golden days, cushion an adverse tara out of caution, and — only when a thin
   *  sign coincides with an adverse tara — deepen the day into caution. Omit → pre-AV behaviour. */
  ashtakavarga?: Ashtakavarga | null;
}): CrownDay {
  const dq = dayQuality(opts.sunLon, opts.moonLon, opts.universalThreshold ?? 2);
  const dayNakIdx = opts.dayNakIdxOverride ?? dq.nakshatra; // 0..26 (majority star when provided)
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

  // Ashtakavarga INTERACTION (optional layer). The day's Moon-sign support meets the tara:
  //   • BOOST  — bindus above baseline lift the score (positive only; a thin sign is never docked).
  //              That same lift is what CUSHIONS an adverse-tara day out of caution (rich ground).
  //   • VETO (HARD FLOOR) — an adverse tara on a THIN sign is YOUR caution day, full stop,
  //              whatever else lines up. The exact mirror of the crown apex-gate: convergence UP
  //              (favorable tara + favorable chandra + high AV) is the hard ceiling; convergence
  //              DOWN (adverse tara + thin AV) is the hard floor. AV never floors alone — the
  //              floor lives in the pair — and the floor stands independent of the collective
  //              muhurta (it's your day, not the sky's). The −2 also sinks the score so any
  //              ranking consumer (e.g. the Arc apex) keeps a vetoed day at the bottom.
  let av: CrownDay["ashtakavarga"];
  let personalVeto = false;
  if (opts.ashtakavarga) {
    const bindu = sarvaBindu(opts.ashtakavarga, dayMoonSignIdx);
    const support: "high" | "neutral" | "low" =
      bindu >= AV_BASELINE + 2 ? "high" : bindu <= AV_BASELINE - 4 ? "low" : "neutral";
    av = { moonSignBindu: bindu, support };
    score += bindu >= AV_BASELINE + 6 ? 2 : bindu >= AV_BASELINE + 2 ? 1 : 0; // boost
    personalVeto = tb.quality === "bad" && support === "low";
    if (personalVeto) score -= 2;
  }

  // Crown = the daily APEX: both Moon strengths aligned (good tara AND good chandra) on a
  // non-negative universal day, the transits aren't a malefic pileup — and, when AV is known, the
  // Moon sits on well-stocked ground (high support). Favorable-tara on a THIN sign is golden but
  // unbacked → "favorable", never the apex. The slow-transit season shifts the bands (via `score`)
  // but can't erase the apex — a tough season means fewer factors line up, not that a clean day is denied.
  const crown = tb.favorable && cb.favorable && dq.score >= 0 && (!ts || ts.score > -3) && (!av || av.support === "high");
  const rating: CrownRating = personalVeto ? "caution"
    : crown ? "crown" : score >= 2 ? "favorable" : score <= -3 ? "caution" : "neutral";
  return { rating, score, universal: dq, tarabala: tb, chandrabala: cb, transit: ts, ashtakavarga: av };
}

// ── Helpers for the personal-weather gate ────────────────────────────────────
const NAK27 = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const ZODIAC12 = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

export interface CrownAnchors { birthNakIdx: number; natalMoonSignIdx: number; lagnaSignIdx: number; ashtakavarga?: Ashtakavarga | null }

/** Extract the personal anchors from a profile's natal bodies + lagna. null if the Moon/lagna are
 *  incomplete. Natal Ashtakavarga is computed too when ALL seven grahas are present in `bodies`
 *  (a Moon-only anchor leaves it null → crown scoring falls back to the pre-AV path). */
export function anchorsFromBodies(
  bodies: Array<{ planet: string; nakshatra?: string | null; sign?: string | null }>,
  lagnaSign: string | null | undefined
): CrownAnchors | null {
  const moon = bodies.find((b) => b.planet === "Moon");
  const birthNakIdx = NAK27.findIndex((n) => n.toLowerCase() === String(moon?.nakshatra ?? "").toLowerCase());
  const natalMoonSignIdx = ZODIAC12.indexOf(moon?.sign ?? "");
  const lagnaSignIdx = ZODIAC12.indexOf(lagnaSign ?? "");
  if (birthNakIdx < 0 || natalMoonSignIdx < 0 || lagnaSignIdx < 0) return null;
  const signIdxByPlanet: Record<string, number> = {};
  for (const b of bodies) { const i = ZODIAC12.indexOf(b.sign ?? ""); if (i >= 0) signIdxByPlanet[b.planet] = i; }
  const ashtakavarga = natalAshtakavarga(signIdxByPlanet, lagnaSignIdx);
  return { birthNakIdx, natalMoonSignIdx, lagnaSignIdx, ashtakavarga };
}

/** The native's crown-layer rating for a calendar date (noon UTC, same as the calendar). */
export async function personalRatingForDate(anchors: CrownAnchors, dateStr: string): Promise<CrownRating | null> {
  try {
    const { calculateBirthChart } = await import("../birthchart/calculator.js");
    const ch: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
    const si = (l: number) => Math.floor((((l % 360) + 360) % 360) / 30);
    const T: Record<string, number> = { Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude), Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude), Saturn: si(ch.saturn.longitude), Rahu: si(ch.rahu.longitude), Ketu: si(ch.ketu.longitude) };
    const majIdx = await majorityDayStarIdx(dateStr);
    return crownDay({ ...anchors, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T, dayNakIdxOverride: majIdx ?? undefined }).rating;
  } catch {
    return null;
  }
}

/** Parse "5:15 AM" → minutes since midnight. null on anything unparseable. */
function parse12h(s: string | null | undefined): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(s ?? ""));
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

/** The nakshatra that rules the MAJORITY of the vedic day (sunrise → next sunrise).
 *  With at most one transition a day, that is: the sunrise star if the transition falls
 *  in the second half of the day, else the post-transition star. Location defaults to the
 *  planner's anchor (Boston) — the same anchor the panchang layer uses. */
export async function majorityDayStarIdx(dateStr: string, lat = 42.3601, lon = -71.0589, utcOffset?: number): Promise<number | null> {
  try {
    const { calcPanchang } = await import("./astronomy.js");
    const { getBostonUtcOffset } = await import("./service.js");
    const astro: any = await calcPanchang(dateStr, lat, lon, utcOffset ?? getBostonUtcOffset(dateStr));
    const idxOf = (n: string) => NAK27.findIndex((x) => x.toLowerCase() === String(n).toLowerCase());
    const sunriseIdx = idxOf(astro.nakshatraAtSunrise ?? "");
    const afterIdx = idxOf(astro.nakshatraAfterTransition ?? "");
    const sr = parse12h(astro.sunriseLocal);
    const tt = parse12h(astro.nakshatraTransitionTime);
    if (afterIdx < 0 || tt == null || sr == null) return sunriseIdx >= 0 ? sunriseIdx : null;
    const minsUntilTransition = ((tt - sr) + 1440) % 1440; // sunrise → transition, wrapping midnight
    return minsUntilTransition > 720 ? (sunriseIdx >= 0 ? sunriseIdx : afterIdx) : afterIdx;
  } catch {
    return null;
  }
}
