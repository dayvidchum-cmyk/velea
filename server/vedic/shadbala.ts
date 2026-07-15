/**
 * SHADBALA — the six-source planetary strength, calculation-complete (Vol II Ch.8, pp.308-316).
 *
 * Appendix IV's per-house method asks, for EVERY house, "what is the Lord's Shadbala?" —
 * this module answers it. Six sources sum to a Rupa value (points ÷ 60); a planet strong
 * here can MANIFEST its nature for good or ill (strength ≠ benevolence — that's
 * Vimshopak/avashta territory).
 *
 *   1. STHANA     (positional)  — 5 components, pure from longitudes + lagna.
 *   2. DIG        (directional) — arc from the planet's powerless angle ÷ 3. Needs the real
 *                                 angles (asc + MC) — a no-time Chandra chart has none.
 *   3. KALA       (temporal)    — 9 components. Needs the exact birth instant + birthplace
 *                                 (sunrise/sunset, hora, weekday, 360-day year/month lords)
 *                                 and declinations (ayana).
 *   4. CHESTA     (motional)    — K&F's rule (p.314): speed relative to the planet's average;
 *                                 slow/retrograde high, fast low. Sun & Moon take none.
 *   5. NAISARGIKA (natural)     — fixed by luminosity.
 *   6. DRIK       (aspectual)   — the sputa-drishti curve (p.315): benefics add, malefics
 *                                 subtract, net ÷ 4 (the classical quarter, via Raman, whom
 *                                 K&F cite for fine detail).
 *
 * HONESTY (David's law: never fake precision). Every input that is missing puts its source
 * on the planet's `pending` list and keeps `sixSourceRupas` NULL. A timed chart with
 * declinations plumbed computes all six; a Chandra (no-time) chart can never have Dig/Kala
 * and stays partial — that is the honest answer for a no-time birth.
 *
 * Pure: longitudes/speeds/declinations/birth-instant in, strength out. No ephemeris calls.
 */

import { GRAHAS, type Graha, SIGN_RULER } from "./dignity";
import { signIndexOf, navamsaSign, type VargaCode, vargaSignOf } from "./vargas";
import { beneficMap } from "./aspects";
import { computeHoras, horaAt, WEEKDAY_LORD, type Planet as HoraPlanet } from "../panchang/hora";
import { sunTimesJD } from "../panchapakshi/yamas";
import friendshipsJson from "./canon/planetary-friendships.json";

const norm = (x: number) => ((x % 360) + 360) % 360;
const degInSign = (lon: number) => norm(lon) - signIndexOf(lon) * 30;
/** Smallest angular separation, 0..180. */
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;
const msToJd = (ms: number) => ms / 86400000 + 2440587.5;
const DAY_MS = 86400000;

// ── Canon constants (Vol I Ch.4/6, Vol II Ch.8) ──────────────────────────────────────────
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

// Planetary gender for Drekkana Bala: male=Sun/Mars/Jupiter, female=Moon/Venus, neutral=Mercury/Saturn.
const GENDER: Record<Graha, "male" | "female" | "neutral"> = {
  Sun: "male", Mars: "male", Jupiter: "male", Moon: "female", Venus: "female", Mercury: "neutral", Saturn: "neutral",
};

// Naisargika — fixed by luminosity: Sun 60 … Saturn 60/7 ≈ 8.57 (p.315 confirms Saturn 8.57).
const NAISARGIKA: Record<Graha, number> = {
  Sun: 60, Moon: (6 / 7) * 60, Venus: (5 / 7) * 60, Jupiter: (4 / 7) * 60,
  Mercury: (3 / 7) * 60, Mars: (2 / 7) * 60, Saturn: (1 / 7) * 60,
};

// Minimum Rupas for "strong" (p.316): Sun/Mars/Saturn 5, Venus 5.5, Moon 6, Jupiter 6.5, Mercury 7.
export const MIN_RUPAS: Record<Graha, number> = {
  Sun: 5, Mars: 5, Saturn: 5, Venus: 5.5, Moon: 6, Jupiter: 6.5, Mercury: 7,
};

// The seven vargas of Saptavargaja Bala (p.309).
const SAPTAVARGA: VargaCode[] = ["D1", "D2", "D3", "D7", "D9", "D12", "D30"];

// Mean daily motion (deg/day) for Chesta's "speed relative to the average" (p.314).
// Superior planets: their long-term mean motion. Mercury/Venus: over a full synodic cycle a
// geocentric inner planet's NET motion equals the Sun's mean (0.9856°/day) — that is the
// honest long-term average their fast/slow/retro swing oscillates around.
const MEAN_SPEED: Partial<Record<Graha, number>> = {
  Mars: 0.5240, Jupiter: 0.0831, Saturn: 0.0334, Mercury: 0.9856, Venus: 0.9856,
};

// ── Panchadha maitri — compound five-fold relationship (Vol I Ch.5) ──────────────────────
const NAT = (friendshipsJson as { friendships: Record<Graha, { friends: Graha[]; neutral: Graha[]; enemies: Graha[] }> }).friendships;

export type Relation = "great friend" | "friend" | "neutral" | "enemy" | "great enemy";

function naturalRelation(from: Graha, other: Graha): "friend" | "neutral" | "enemy" {
  const t = NAT[from];
  if (t.friends.includes(other)) return "friend";
  if (t.enemies.includes(other)) return "enemy";
  return "neutral";
}
/** Temporal friend when `other` sits 2/3/4/10/11/12 signs from `from` (Vol I Ch.5). */
function temporalRelation(fromLon: number, otherLon: number): "friend" | "enemy" {
  const houseAway = ((signIndexOf(otherLon) - signIndexOf(fromLon) + 12) % 12) + 1;
  return [2, 3, 4, 10, 11, 12].includes(houseAway) ? "friend" : "enemy";
}
export function compoundRelation(from: Graha, other: Graha, lonBy: Record<Graha, number>): Relation {
  if (from === other) return "great friend";
  const perm = naturalRelation(from, other);
  const temp = temporalRelation(lonBy[from], lonBy[other]);
  if (perm === "friend") return temp === "friend" ? "great friend" : "neutral";
  if (perm === "enemy") return temp === "enemy" ? "great enemy" : "neutral";
  return temp === "friend" ? "friend" : "enemy";
}

// ── 1. STHANA BALA — five components (pp.309-311) ────────────────────────────────────────

/** (a) Uchcha Bala: arc from the deep-debilitation point ÷ 3 (0 at fall, 60 at exaltation). */
function uchchaBala(planet: Graha, lon: number): number {
  const debilLon = norm(EXALT_DEEP_LON[planet] + 180);
  return sep(lon, debilLon) / 3;
}

/** (b) Saptavargaja: per-varga dignity points vs the varga-sign's lord (compound maitri). */
function saptavargajaPoints(planet: Graha, lon: number, varga: VargaCode, lonBy: Record<Graha, number>): number {
  const vSign = ZOD[vargaSignOf(lon, varga)];
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

/** (c) Ojayugma: Moon/Venus want EVEN rashi & navamsa (15 each); the rest want ODD. */
function ojayugmaBala(planet: Graha, lon: number): number {
  const rashiOdd = signIndexOf(lon) % 2 === 0;
  const navOdd = navamsaSign(lon) % 2 === 0;
  const wantsEven = planet === "Moon" || planet === "Venus";
  let bala = 0;
  if (wantsEven ? !rashiOdd : rashiOdd) bala += 15;
  if (wantsEven ? !navOdd : navOdd) bala += 15;
  return bala;
}

/** (d) Kendra Bala: kendra 60 / panapara 30 / apoklima 15 (whole-sign from lagna). */
function kendraBala(houseFromLagna: number): number {
  if ([1, 4, 7, 10].includes(houseFromLagna)) return 60;
  if ([2, 5, 8, 11].includes(houseFromLagna)) return 30;
  return 15;
}

/** (e) Drekkana Bala: 15 when the planet's gender matches its third of the sign. */
function drekkanaBala(planet: Graha, lon: number): number {
  const third = Math.floor(degInSign(lon) / 10);
  const g = GENDER[planet];
  if (g === "male" && third === 0) return 15;
  if (g === "female" && third === 1) return 15;
  if (g === "neutral" && third === 2) return 15;
  return 0;
}

export interface SthanaBala {
  uchcha: number; saptavargaja: number; ojayugma: number; kendra: number; drekkana: number; total: number;
}

// ── 2. DIG BALA (p.311) ──────────────────────────────────────────────────────────────────
// Strong angle: Mercury/Jupiter → Asc (east); Sun/Mars → MC (south); Saturn → Dsc (west);
// Moon/Venus → IC (north). Bala = arc from the OPPOSITE (powerless) angle ÷ 3.
// The angles are taken degree-true (the Sripati madhyas of houses 1/4/7/10 ARE the angles).
function digBala(planet: Graha, lon: number, ascLon: number, mcLon: number): number {
  const dsc = norm(ascLon + 180), ic = norm(mcLon + 180);
  const strong: Record<Graha, number> = {
    Mercury: ascLon, Jupiter: ascLon, Sun: mcLon, Mars: mcLon, Saturn: dsc, Moon: ic, Venus: ic,
  };
  const weak = norm(strong[planet] + 180);
  return sep(lon, weak) / 3;
}

// ── 3. KALA BALA — nine components (pp.312-314) ──────────────────────────────────────────

export interface KalaBala {
  natonnata: number;   // (a) day/night strength — Moon/Mars/Saturn ← midnight, Sun/Venus/Jupiter ← noon, Mercury 60
  paksha: number;      // (b) lunar fortnight — benefics wax with the Moon; benefic+malefic = 60; Moon ×2
  tribhaga: number;    // (c) day/night thirds — Jupiter always 60; the third's lord 60
  abda: number;        // (d) lord of the 360-day year — 15
  masa: number;        // (e) lord of the 30-day month — 30
  vara: number;        // (f) weekday lord (sunrise-bounded Vedic day) — 45
  hora: number;        // (g) planetary-hour lord — 60
  ayana: number | null;// (h) declination strength — needs declination; Sun ×2
  yuddha: number | null;// (i) planetary-war adjustment — 0 unless at war; null = war present but not computable
  total: number | null;
}

/** Kali-epoch ahargana (completed days since JD 588465.5, the epoch used by the classical
 *  360-day year/month lords; epoch day was a Friday). ±1-day epoch conventions exist across
 *  texts — documented, deterministic, and stable for a given birth. */
function ahargana(birthUtcMs: number): number {
  return Math.floor(msToJd(birthUtcMs) - 588465.5);
}
const weekdayLordOfAhargana = (days: number): HoraPlanet => WEEKDAY_LORD[(((days % 7) + 7) % 7 + 5) % 7];

interface KalaInputs {
  birthUtcMs: number;
  latitude: number;
  longitude: number; // east positive
  lonBy: Record<string, number>;
  benefic: Record<Graha, boolean>;
  declBy?: Partial<Record<Graha, number>>;
}

/** Sunrise/sunset (UTC ms) bracketing the birth: the Vedic day it falls in. */
function vedicDay(birthUtcMs: number, lat: number, lon: number): {
  sunriseMs: number; sunsetMs: number; nextSunriseMs: number; civilDate: Date;
} {
  // Start from the birthplace's approximate civil date (local mean time by longitude).
  let d = new Date(birthUtcMs + lon * 4 * 60000);
  for (let i = 0; i < 3; i++) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    const t = sunTimesJD(y, m, day, lat, lon);
    const rise = jdToMs(t.rise), set = jdToMs(t.set);
    if (birthUtcMs < rise) { d = new Date(d.getTime() - DAY_MS); continue; }
    const nd = new Date(Date.UTC(y, m - 1, day) + DAY_MS);
    const nt = sunTimesJD(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), lat, lon);
    const nextRise = jdToMs(nt.rise);
    if (birthUtcMs >= nextRise) { d = new Date(d.getTime() + DAY_MS); continue; }
    return { sunriseMs: rise, sunsetMs: set, nextSunriseMs: nextRise, civilDate: new Date(Date.UTC(y, m - 1, day)) };
  }
  // Extreme latitudes can defeat the NOAA solver; callers treat a throw as "kala pending".
  throw new Error("vedicDay: could not bracket birth between sunrises");
}

function kalaBala(planet: Graha, inputs: KalaInputs, warPartner: Graha | null): KalaBala {
  const { birthUtcMs, latitude, longitude, lonBy, benefic, declBy } = inputs;

  // (a) Natonnata — local mean time by longitude; linear between noon (720min) and midnight.
  const lmtMinutes = (((birthUtcMs + longitude * 4 * 60000) % DAY_MS) + DAY_MS) % DAY_MS / 60000;
  const noonness = 1 - Math.abs(lmtMinutes - 720) / 720; // 1 at noon, 0 at midnight
  const natonnata =
    planet === "Mercury" ? 60 :
    (planet === "Sun" || planet === "Venus" || planet === "Jupiter") ? 60 * noonness : 60 * (1 - noonness);

  // (b) Paksha — Moon's elongation from the Sun folded to 0..180, ÷ 3 for benefics
  // (0 at new, 60 at full); malefics get the complement (benefic + malefic = 60); Moon ×2.
  const beneficPts = sep(lonBy.Moon, lonBy.Sun) / 3;
  let paksha = benefic[planet] ? beneficPts : 60 - beneficPts;
  if (planet === "Moon") paksha *= 2;

  // (c)(f)(g) need the Vedic day (sunrise-bounded).
  const day = vedicDay(birthUtcMs, latitude, longitude);

  // (c) Tribhaga — Jupiter always 60; else 60 if the planet rules the birth third.
  let tribhaga = planet === "Jupiter" ? 60 : 0;
  const DAY_LORDS: Graha[] = ["Mercury", "Sun", "Saturn"];
  const NIGHT_LORDS: Graha[] = ["Moon", "Venus", "Mars"];
  if (birthUtcMs < day.sunsetMs) {
    const part = Math.min(2, Math.floor((birthUtcMs - day.sunriseMs) / ((day.sunsetMs - day.sunriseMs) / 3)));
    if (DAY_LORDS[part] === planet) tribhaga = 60;
  } else {
    const part = Math.min(2, Math.floor((birthUtcMs - day.sunsetMs) / ((day.nextSunriseMs - day.sunsetMs) / 3)));
    if (NIGHT_LORDS[part] === planet) tribhaga = 60;
  }

  // (d)(e) Abda / Masa — lords of the 360-day year and 30-day month (Kali ahargana).
  const days = ahargana(birthUtcMs);
  const abda = weekdayLordOfAhargana(days - (days % 360)) === planet ? 15 : 0;
  const masa = weekdayLordOfAhargana(days - (days % 30)) === planet ? 30 : 0;

  // (f) Vara — the Vedic day's weekday lord (its civil date's weekday).
  const vara = WEEKDAY_LORD[day.civilDate.getUTCDay()] === planet ? 45 : 0;

  // (g) Hora — the planetary hour running at birth.
  const horas = computeHoras(
    day.civilDate.getUTCFullYear(), day.civilDate.getUTCMonth() + 1, day.civilDate.getUTCDate(),
    latitude, longitude,
  );
  const birthHora = horaAt(horas, birthUtcMs);
  const hora = birthHora && birthHora.lord === planet ? 60 : 0;

  // (h) Ayana — 30 at the equator; north adds for Sun/Venus/Mars/Jupiter, reversed for
  // Saturn/Moon, |decl| always adds for Mercury; scale ±24° → ±30; Sun doubled. (p.314)
  let ayana: number | null = null;
  const decl = declBy?.[planet];
  if (decl != null) {
    const signed =
      planet === "Mercury" ? Math.abs(decl) :
      planet === "Saturn" || planet === "Moon" ? -decl : decl;
    ayana = clamp(30 + (signed / 24) * 30, 0, 60);
    if (planet === "Sun") ayana *= 2;
  }

  // (i) Yuddha — only when at war (two taras within 1°). Needs apparent disc diameters
  // (K&F p.314), which are not plumbed: a war marks the pair pending rather than faking it.
  const yuddha: number | null = warPartner ? null : 0;

  const parts = [natonnata, paksha, tribhaga, abda, masa, vara, hora];
  const total = ayana == null || yuddha == null ? null : parts.reduce((s, x) => s + x, 0) + ayana + yuddha;
  return { natonnata, paksha, tribhaga, abda, masa, vara, hora, ayana, yuddha, total };
}

// ── 4. CHESTA BALA (p.314) — speed relative to the planet's average ──────────────────────
// Slow or retrograde = high, fast = low; linear through (average speed → 30), clamped 0..60.
// Sun & Moon take no chesta (K&F: fairly regular, never retrograde).
function chestaBala(planet: Graha, speed: number | undefined): number | null {
  const avg = MEAN_SPEED[planet];
  if (avg == null) return 0; // Sun & Moon: none — contributes 0 to the total
  if (speed == null) return null;
  return clamp(30 * (2 - speed / avg), 0, 60);
}

// ── 6. DRIK BALA (p.315) — sputa drishti: benefics add, malefics subtract, net ÷ 4 ───────
// Curve (arc from aspecter FORWARD to target): 30→0, 60→25%, 90→75%, 120→50%, 150→0,
// 180→100%, then falling to 0 at 300; linear between (100% = 60 virupas).
export function sputaDrishti(arcForward: number): number {
  const d = norm(arcForward);
  if (d < 30 || d >= 300) return 0;
  if (d < 60) return (d - 30) / 2;         // 0 → 15
  if (d < 90) return 15 + (d - 60);        // 15 → 45
  if (d < 120) return 45 - (d - 90) / 2;   // 45 → 30
  if (d < 150) return 30 - (d - 120);      // 30 → 0
  if (d < 180) return (d - 150) * 2;       // 0 → 60
  return 60 - (d - 180) / 2;               // 60 → 0
}

function drikBala(planet: Graha, lonBy: Record<Graha, number>, benefic: Record<Graha, boolean>): number {
  let net = 0;
  for (const p of GRAHAS) {
    if (p === planet) continue;
    const v = sputaDrishti(norm(lonBy[planet] - lonBy[p]));
    net += benefic[p] ? v : -v;
  }
  return net / 4;
}

// ── Planetary war (graha yuddha) — two taras within 1° (Vol II Ch.3) ─────────────────────
const TARAS: Graha[] = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
function warPartnerOf(planet: Graha, lonBy: Record<Graha, number>): Graha | null {
  if (!TARAS.includes(planet)) return null;
  for (const other of TARAS) {
    if (other !== planet && sep(lonBy[planet], lonBy[other]) < 1) return other;
  }
  return null;
}

// ── Assembly ─────────────────────────────────────────────────────────────────────────────

/** Everything beyond longitudes that the full six sources need. */
export interface ShadbalaContext {
  /** Exact birth instant (UTC epoch ms). */
  birthUtcMs: number;
  latitude: number;
  /** East-positive geographic longitude. */
  longitude: number;
  /** Real sidereal MC — null on a no-time (Chandra) chart → Dig stays pending. */
  mcLon: number | null;
  /** Declinations (degrees, north positive) — enables Ayana. */
  declBy?: Partial<Record<Graha, number>>;
}

export type PendingSource = "dig" | "kala" | "ayana" | "yuddha" | "chesta" | "drik";

export interface PlanetShadbala {
  planet: Graha;
  sthanaBala: SthanaBala;
  digBala: number | null;
  kalaBala: KalaBala | null;
  chestaBala: number | null;
  naisargikaBala: number;
  drikBala: number | null;
  /** Sources that could not be computed with the inputs given (see module header). */
  pending: PendingSource[];
  /** Total points ÷ 60 — NULL until every source is real. Never treat a partial as final. */
  sixSourceRupas: number | null;
  /** rupas ÷ the planet's minimum requirement (p.316) — ≥ 1 = classically "strong". */
  strengthRatio: number | null;
}

function shadbalaOne(
  planet: Graha,
  lonBy: Record<Graha, number>,
  lagnaLon: number,
  speedBy?: Partial<Record<Graha, number>>,
  ctx?: ShadbalaContext,
): PlanetShadbala {
  const lon = lonBy[planet];
  const pending: PendingSource[] = [];

  // 1. Sthana — always computable.
  const uchcha = uchchaBala(planet, lon);
  const saptavargaja = SAPTAVARGA.reduce((s, v) => s + saptavargajaPoints(planet, lon, v, lonBy), 0);
  const ojayugma = ojayugmaBala(planet, lon);
  const houseFromLagna = ((signIndexOf(lon) - signIndexOf(lagnaLon) + 12) % 12) + 1;
  const kendra = kendraBala(houseFromLagna);
  const drekkana = drekkanaBala(planet, lon);
  const sthana: SthanaBala = {
    uchcha, saptavargaja, ojayugma, kendra, drekkana,
    total: uchcha + saptavargaja + ojayugma + kendra + drekkana,
  };

  const { benefic } = beneficMap(lonBy);

  // 2. Dig — needs the real angles.
  let dig: number | null = null;
  if (ctx && ctx.mcLon != null) dig = digBala(planet, lon, lagnaLon, ctx.mcLon);
  else pending.push("dig");

  // 3. Kala — needs the birth instant + place; ayana additionally needs declination.
  let kala: KalaBala | null = null;
  if (ctx) {
    const partner = warPartnerOf(planet, lonBy);
    try {
      kala = kalaBala(planet, {
        birthUtcMs: ctx.birthUtcMs, latitude: ctx.latitude, longitude: ctx.longitude,
        lonBy, benefic, declBy: ctx.declBy,
      }, partner);
      if (kala.ayana == null) pending.push("ayana");
      if (kala.yuddha == null) pending.push("yuddha");
    } catch {
      pending.push("kala"); // e.g. polar sunrise failure
    }
  } else {
    pending.push("kala");
  }

  // 4. Chesta — K&F relative speed.
  const chesta = chestaBala(planet, speedBy?.[planet]);
  if (chesta == null) pending.push("chesta");

  // 6. Drik — always computable from longitudes.
  const drik = drikBala(planet, lonBy, benefic);

  const complete = pending.length === 0 && kala?.total != null && dig != null && chesta != null;
  const totalPoints = complete
    ? sthana.total + dig! + kala!.total! + chesta! + NAISARGIKA[planet] + drik
    : null;
  const rupas = totalPoints == null ? null : totalPoints / 60;

  return {
    planet,
    sthanaBala: sthana,
    digBala: dig,
    kalaBala: kala,
    chestaBala: chesta,
    naisargikaBala: NAISARGIKA[planet],
    drikBala: drik,
    pending,
    sixSourceRupas: rupas,
    strengthRatio: rupas == null ? null : rupas / MIN_RUPAS[planet],
  };
}

/**
 * Shadbala for all seven grahas.
 * @param lonBy    sidereal longitude (0..360) of each graha (nodes welcome; ignored here)
 * @param lagnaLon sidereal ascendant longitude (degree-true)
 * @param speedBy  deg/day per graha (negative = retrograde) — enables Chesta
 * @param ctx      birth instant/place/MC/declinations — enables Dig + Kala (full totals)
 */
export function shadbala(
  lonBy: Record<Graha, number>,
  lagnaLon: number,
  speedBy?: Partial<Record<Graha, number>>,
  ctx?: ShadbalaContext,
): Record<Graha, PlanetShadbala> {
  return Object.fromEntries(
    GRAHAS.map((g) => [g, shadbalaOne(g, lonBy, lagnaLon, speedBy, ctx)]),
  ) as Record<Graha, PlanetShadbala>;
}
