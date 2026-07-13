/**
 * SHADBALA — the six-source planetary strength (Vol II Ch.8).
 *
 * Why this exists: Appendix IV's step-by-step method (see canon/METHOD.md) asks, for EVERY house,
 * "what is the Lord's Shadbala?" It is the one input the ground floor could not yet compute. Shadbala
 * ("six strengths") sums six independent sources into a Rupa value; a planet strong here can MANIFEST
 * its nature (for good or ill — strength ≠ benevolence; that's Vimshopak/avashta territory).
 *
 * HONESTY (David's law: never fake precision, never silently complete — a wrong total is worse than
 * none). The six sources need different data:
 *   1. STHANA  (positional)  — pure from sidereal longitudes + lagna. ✅ FULLY COMPUTED here.
 *   2. NAISARGIKA (natural)  — fixed constants by luminosity.          ✅ FULLY COMPUTED here.
 *   3. CHESTA  (motional)    — needs the seeghra-kendra (mean anomaly); instantaneous speed only
 *                              gives the SIGN of motion, so we return a principled-but-APPROX value
 *                              from speed and flag it.                  ~ APPROX (needs mean anomaly).
 *   4. DIG     (directional) — needs real bhava (angle) cusps; whole-sign has no distinct MC.  ⏳ PENDING.
 *   5. KALA    (temporal)    — needs birth clock, sunrise/sunset, weekday/month/year lords, declination. ⏳ PENDING.
 *   6. DRIK    (aspectual)   — computable from longitudes but omitted until paired with Dig/Kala so the
 *                              total is coherent.                       ⏳ PENDING.
 * So `sixSourceRupas` stays NULL until all six are real. Consumers read `sthanaBala`/`naisargikaBala`
 * (authoritative) and MUST NOT treat the partial sum as a finished Shadbala.
 *
 * Pure: longitudes/speed/lagna in, strength out. No ephemeris, no interpretation, no UI. Unit-tested —
 * a single off-by-one in a "start sign" or a friendship cell corrupts every downstream house read.
 */

import { GRAHAS, type Graha, SIGN_RULER } from "./dignity";
import { signIndexOf, navamsaSign, type VargaCode, vargaSignOf } from "./vargas";
import friendshipsJson from "./canon/planetary-friendships.json";

const norm = (x: number) => ((x % 360) + 360) % 360;
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;

// ── Canon constants (Vol I Ch.4/6, Vol II Ch.8) ──────────────────────────────────────────────
// Deep-exaltation longitude (absolute, 0=0°Aries). Debilitation is 180° away.
const EXALT_DEEP_LON: Record<Graha, number> = {
  Sun: 10, Moon: 30 + 3, Mars: 270 + 28, Mercury: 150 + 15,
  Jupiter: 90 + 5, Venus: 330 + 27, Saturn: 180 + 20,
};
const OWN_SIGNS: Record<Graha, string[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mars: ["Aries", "Scorpio"], Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"], Venus: ["Taurus", "Libra"], Saturn: ["Capricorn", "Aquarius"],
};
const MOOLA: Record<Graha, { sign: string; from: number; to: number }> = {
  Sun: { sign: "Leo", from: 0, to: 20 }, Moon: { sign: "Taurus", from: 3, to: 30 }, Mars: { sign: "Aries", from: 0, to: 12 },
  Mercury: { sign: "Virgo", from: 15, to: 20 }, Jupiter: { sign: "Sagittarius", from: 0, to: 10 }, Venus: { sign: "Libra", from: 0, to: 15 }, Saturn: { sign: "Aquarius", from: 0, to: 20 },
};
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// Planetary gender for Drekkana Bala (Vol II Ch.8): male=Sun/Mars/Jupiter, female=Moon/Venus,
// neutral(hermaphrodite)=Mercury/Saturn.
const GENDER: Record<Graha, "male" | "female" | "neutral"> = {
  Sun: "male", Mars: "male", Jupiter: "male", Moon: "female", Venus: "female", Mercury: "neutral", Saturn: "neutral",
};

// Naisargika (natural) Bala — fixed by luminosity: Sun 7/7 … Saturn 1/7, ×60. (Vol II Ch.8.)
const NAISARGIKA: Record<Graha, number> = {
  Sun: 60, Moon: (6 / 7) * 60, Venus: (5 / 7) * 60, Jupiter: (4 / 7) * 60,
  Mercury: (3 / 7) * 60, Mars: (2 / 7) * 60, Saturn: (1 / 7) * 60,
};

// Minimum Rupas for a planet to be "strong" (Vol II Ch.8) — reference for later, once the total is real.
export const MIN_RUPAS: Record<Graha, number> = {
  Sun: 5, Mars: 5, Saturn: 5, Venus: 5.5, Moon: 6, Jupiter: 6.5, Mercury: 7,
};

// The seven vargas of Saptavargaja Bala (Vol II Ch.8).
const SAPTAVARGA: VargaCode[] = ["D1", "D2", "D3", "D7", "D9", "D12", "D30"];

// ── Panchadha maitri — the compound five-fold relationship (Vol I Ch.5) ──────────────────────
// The engine only had NATURAL friendship; Saptavargaja (and the Lajjitaadi engine) need COMPOUND:
// permanent (natural) blended with temporal (placement-based). Exposed for reuse.
const NAT = (friendshipsJson as { friendships: Record<Graha, { friends: Graha[]; neutral: Graha[]; enemies: Graha[] }> }).friendships;

export type Relation = "great friend" | "friend" | "neutral" | "enemy" | "great enemy";

/** Natural (permanent) relationship of `from` toward `other`. */
function naturalRelation(from: Graha, other: Graha): "friend" | "neutral" | "enemy" {
  const t = NAT[from];
  if (t.friends.includes(other)) return "friend";
  if (t.enemies.includes(other)) return "enemy";
  return "neutral";
}
/** Temporal relationship: `other` is a temporal FRIEND of `from` if it sits in the 2/3/4/10/11/12
 *  sign counted from `from`; otherwise a temporal enemy (Vol I Ch.5). */
function temporalRelation(fromLon: number, otherLon: number): "friend" | "enemy" {
  const houseAway = ((signIndexOf(otherLon) - signIndexOf(fromLon) + 12) % 12) + 1;
  return [2, 3, 4, 10, 11, 12].includes(houseAway) ? "friend" : "enemy";
}
/** Compound (panchadha) relationship of `from` toward `other`, given both longitudes. */
export function compoundRelation(from: Graha, other: Graha, lonBy: Record<Graha, number>): Relation {
  if (from === other) return "great friend";
  const perm = naturalRelation(from, other);
  const temp = temporalRelation(lonBy[from], lonBy[other]);
  // Friend+Friend=GreatFriend; Neutral+Friend=Friend; (Friend+Enemy | Enemy+Friend)=Neutral;
  // Neutral+Enemy=Enemy; Enemy+Enemy=GreatEnemy. (Vol I Ch.5.)
  if (perm === "friend") return temp === "friend" ? "great friend" : "neutral";
  if (perm === "enemy") return temp === "enemy" ? "great enemy" : "neutral";
  return temp === "friend" ? "friend" : "enemy"; // perm neutral
}

// ── 1. STHANA BALA (positional) — five components (Vol II Ch.8) ───────────────────────────────

/** (a) Uchcha Bala: 0 at deep debilitation, 60 at deep exaltation. arc-from-debilitation / 3. */
function uchchaBala(planet: Graha, lon: number): number {
  const debilLon = norm(EXALT_DEEP_LON[planet] + 180);
  let arc = Math.abs(norm(lon) - debilLon);
  if (arc > 180) arc = 360 - arc;
  return arc / 3; // 0..60
}

/** Saptavargaja per-varga points by the planet's dignity in that varga's sign (Vol II Ch.8).
 *  Judges the planet against the varga-sign's LORD via the COMPOUND relationship — whose temporal
 *  half is a rashi-chart placement fact, so `lonBy` is the real chart's longitudes. */
function saptavargajaPoints(planet: Graha, lon: number, varga: VargaCode, lonBy: Record<Graha, number>): number {
  const vSign = ZOD[vargaSignOf(lon, varga)];
  // Moolatrikona bonus (45) is a rashi-only rule — the moolatrikona is a degree-range in D1.
  if (varga === "D1") {
    const mt = MOOLA[planet];
    if (mt.sign === vSign && degInSign(lon) >= mt.from && degInSign(lon) < mt.to) return 45;
  }
  if (OWN_SIGNS[planet].includes(vSign)) return 30;
  const lord = SIGN_RULER[vSign] as Graha;
  switch (compoundRelation(planet, lord, lonBy)) {
    case "great friend": return 22.5;
    case "friend": return 15;
    case "neutral": return 7.5;
    case "enemy": return 3.75;
    case "great enemy": return 1.875;
  }
}

/** (c) Ojayugma Bala: Moon/Venus strong in EVEN sign & navamsa; others in ODD. 15 each, max 30. */
function ojayugmaBala(planet: Graha, lon: number): number {
  const rashiOdd = signIndexOf(lon) % 2 === 0; // 0-based even index = odd sign number (Aries=1…)
  const navOdd = navamsaSign(lon) % 2 === 0;
  const wantsEven = planet === "Moon" || planet === "Venus";
  let bala = 0;
  if (wantsEven ? !rashiOdd : rashiOdd) bala += 15;
  if (wantsEven ? !navOdd : navOdd) bala += 15;
  return bala;
}

/** (d) Kendra Bala: kendra 60 / panapara 30 / apoklima 15, by house from lagna. */
function kendraBala(houseFromLagna: number): number {
  if ([1, 4, 7, 10].includes(houseFromLagna)) return 60;
  if ([2, 5, 8, 11].includes(houseFromLagna)) return 30;
  return 15;
}

/** (e) Drekkana Bala: 15 if the planet sits in the drekkana matching its gender (male 1st/female
 *  middle/neutral last), else 0. */
function drekkanaBala(planet: Graha, lon: number): number {
  const third = Math.floor(degInSign(lon) / 10); // 0,1,2
  const g = GENDER[planet];
  if (g === "male" && third === 0) return 15;
  if (g === "female" && third === 1) return 15;
  if (g === "neutral" && third === 2) return 15;
  return 0;
}

export interface SthanaBala {
  uchcha: number;
  saptavargaja: number;
  ojayugma: number;
  kendra: number;
  drekkana: number;
  total: number;
}

export interface PlanetShadbala {
  planet: Graha;
  /** FULLY COMPUTED — positional strength (5 components) in points (shashtiamsas). */
  sthanaBala: SthanaBala;
  /** FULLY COMPUTED — fixed natural strength by luminosity, in points. */
  naisargikaBala: number;
  /** APPROX — sign of motion only; needs seeghra-kendra for the exact 0..60. null if speed absent. */
  chestaBalaApprox: number | null;
  /** Sources not yet computable with the current data plumbing (see module header). */
  pending: Array<"dig" | "kala" | "drik" | "chesta-exact">;
  /** NULL until ALL SIX sources are real. Do NOT treat the partial as a finished Shadbala. */
  sixSourceRupas: number | null;
}

/**
 * Six-source strength for one planet. Requires the whole chart's longitudes (Saptavargaja's temporal
 * relationship is a chart fact) and the lagna. `speedBy` is optional (enables the APPROX chesta).
 */
function shadbalaOne(
  planet: Graha,
  lonBy: Record<Graha, number>,
  lagnaLon: number,
  speedBy?: Record<Graha, number>,
): PlanetShadbala {
  const lon = lonBy[planet];
  const uchcha = uchchaBala(planet, lon);
  const saptavargaja = SAPTAVARGA.reduce((s, v) => s + saptavargajaPoints(planet, lon, v, lonBy), 0);
  const ojayugma = ojayugmaBala(planet, lon);
  const houseFromLagna = ((signIndexOf(lon) - signIndexOf(lagnaLon) + 12) % 12) + 1;
  const kendra = kendraBala(houseFromLagna);
  const drekkana = drekkanaBala(planet, lon);
  const sthanaTotal = uchcha + saptavargaja + ojayugma + kendra + drekkana;

  // Chesta (approx): the Sun & Moon classically take no independent chesta (Sun→ayana, Moon→paksha).
  // For the five taras, retrograde/slow = strong. Without the seeghra-kendra we can only grade by the
  // SIGN of speed: retrograde → high (~45), direct → low (~15). Flagged approx; never fed to a total.
  let chestaBalaApprox: number | null = null;
  if (speedBy && planet !== "Sun" && planet !== "Moon") {
    const sp = speedBy[planet];
    chestaBalaApprox = sp < 0 ? 45 : 15;
  }

  // Dig + Kala + Drik need data not yet plumbed; the exact Chesta needs the seeghra-kendra (mean
  // anomaly) even when instantaneous speed is present. All four keep the total NULL.
  const pending: PlanetShadbala["pending"] = ["dig", "kala", "drik", "chesta-exact"];

  return {
    planet,
    sthanaBala: { uchcha, saptavargaja, ojayugma, kendra, drekkana, total: sthanaTotal },
    naisargikaBala: NAISARGIKA[planet],
    chestaBalaApprox,
    pending,
    sixSourceRupas: null, // stays null until Dig + Kala + Drik + exact Chesta land
  };
}

/**
 * Shadbala for all seven grahas.
 * @param lonBy    sidereal longitude (0..360) of each graha
 * @param lagnaLon sidereal longitude of the ascendant
 * @param speedBy  optional deg/day speed per graha (negative = retrograde) — enables APPROX chesta
 */
export function shadbala(
  lonBy: Record<Graha, number>,
  lagnaLon: number,
  speedBy?: Record<Graha, number>,
): Record<Graha, PlanetShadbala> {
  return Object.fromEntries(
    GRAHAS.map((g) => [g, shadbalaOne(g, lonBy, lagnaLon, speedBy)]),
  ) as Record<Graha, PlanetShadbala>;
}
