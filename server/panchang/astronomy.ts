/**
 * ASTRONOMY LAYER — Celestial Field Notes
 *
 * Uses Swiss Ephemeris (WASM) to calculate raw sky data:
 *   - Sunrise time (local) via pure-JS solar algorithm
 *   - Moon sidereal longitude via swisseph-wasm (Lahiri ayanamsa)
 *   - Nakshatra (dominant by majority of day)
 *   - Tithi (dominant by majority of day)
 *
 * This module ONLY calculates astronomy.
 * It does NOT assign modes, meanings, or interpretations.
 * Mode assignment is handled separately in interpreter.ts.
 */

import { NAK27 as NAKSHATRAS } from "@shared/nakshatra-names";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AstronomyData {
  /** Date string YYYY-MM-DD */
  date: string;
  /** Sunrise time as HH:MM in local timezone */
  sunriseLocal: string;
  /** Sunrise as Julian Day (UT) */
  sunriseJD: number;
  /** Set when the Sun does not cross the horizon at this latitude on this date, so `sunriseLocal`
   *  and `sunriseJD` are a NOMINAL anchor rather than an observed event — and every value keyed to
   *  the vedic day (nakshatra, tithi, paksha, karana, the majority walk) inherits that. null
   *  everywhere the Sun actually rises, which is everywhere the app currently has users. */
  noSunrise?: "polar-day" | "polar-night" | null;
  /** Moon sidereal longitude in degrees (0–360) at sunrise */
  moonLongitude: number;
  /** Moon sign index 0–11 (0=Aries … 11=Pisces) — the sign that RULES the vedic day by majority,
   *  sunrise to sunrise, on the same clock as the day's nakshatra (David 2026-07-20). */
  moonSignIndex: number;
  /** Moon sign name (the day's ruling sign) */
  moonSign: string;
  /** The sign at the sunrise INSTANT — usually identical; differs on the 21% of days where the
   *  Moon crosses a sign boundary early enough that the second sign owns most of the day. */
  moonSignAtSunriseIndex: number;
  /** Sign name at the sunrise instant */
  moonSignAtSunrise: string;
  /** Nakshatra index 0–26 */
  nakshatraIndex: number;
  /** Nakshatra name */
  nakshatra: string;
  /** Nakshatra pada (1–4) */
  nakshatraPada: number;
  /** Tithi index 0–29 */
  tithiIndex: number;
  /** Tithi name */
  tithi: string;
  /** Tithi paksha: 'Shukla' or 'Krishna' */
  tithiPaksha: 'Shukla' | 'Krishna';
  /** Sun sidereal longitude at sunrise */
  sunLongitude: number;
  /** Nakshatra active at sunrise (may differ from dominant if a transition occurs early in the day) */
  nakshatraAtSunrise: string;
  /** Local time string (HH:MM AM/PM) when the nakshatra changes during this day. null if no transition. */
  nakshatraTransitionTime: string | null;
  /** Nakshatra name that begins after the transition. null if no transition. */
  nakshatraAfterTransition: string | null;
  /** Local time the Moon crosses into the next SIGN this vedic day. null if it doesn't. */
  signTransitionTime: string | null;
  /** Sign name after that crossing. null if no crossing. */
  moonSignAfterTransition: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNS: string[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];


const TITHIS: string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
];

// Swiss Ephemeris flags — values from swisseph-wasm src/swisseph.js
const SEFLG_SWIEPH = 2;
const SEFLG_SIDEREAL = 65536; // swisseph-wasm uses 65536, not the C library's 64
const SE_SUN = 0;
const SE_MOON = 1;
const SE_SIDM_LAHIRI = 1;

// ─── Singleton WASM instance ──────────────────────────────────────────────────

let _sweInstance: any = null;

async function getSwe(): Promise<any> {
  if (_sweInstance) return _sweInstance;
  // Dynamic import to handle ESM-only package from CJS context
  const { default: SwissEph } = await import('swisseph-wasm');
  const swe = new SwissEph();
  await swe.initSwissEph();
  swe.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
  _sweInstance = swe;
  return swe;
}

// ─── Sunrise calculation (pure JS, accurate to ~1 minute) ────────────────────

/**
 * Calculate sunrise Julian Day (UT) for a given date and location.
 * Uses the NOAA solar algorithm (accurate to within ~1 minute).
 *
 * @param year  4-digit year
 * @param month 1-based month
 * @param day   1-based day
 * @param lat   latitude in decimal degrees
 * @param lon   longitude in decimal degrees (negative = west)
 * @returns Julian Day number (UT) of sunrise
 */
function calcSunriseSolve(year: number, month: number, day: number, lat: number, lon: number): { jd: number; noSunrise: "polar-day" | "polar-night" | null } {
  // Julian Day Number for the date at noon UT
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  // jdn = JD at noon UT of the civil date
  // The NOAA algorithm uses Julian Day Number (integer) as its epoch base
  // n = days since J2000.0 (noon Jan 1 2000 = JD 2451545.0)
  const n = jdn - 2451545.0;
  // jd = JD at midnight UT (used for time extraction later)
  const jd = jdn - 0.5;

  // Mean solar noon (in Julian days)
  const Jstar = n - lon / 360.0;

  // Solar mean anomaly (degrees)
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = (M * Math.PI) / 180;

  // Equation of center
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);

  // Ecliptic longitude of the Sun
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = (lambda * Math.PI) / 180;

  // Solar transit
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);

  // Declination of the Sun
  const sinDec = Math.sin(lambdaRad) * Math.sin((23.4397 * Math.PI) / 180);
  const dec = Math.asin(sinDec);

  // Hour angle
  const latRad = (lat * Math.PI) / 180;
  const cosOmega =
    (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latRad) * sinDec) /
    (Math.cos(latRad) * Math.cos(dec));

  // POLAR DAY / POLAR NIGHT (v801). |cosOmega| > 1 means the Sun does not cross the horizon at this
  // latitude on this date — there IS no sunrise. Clamping and returning a time anyway makes the
  // engine assert an event that did not happen, and the whole vedic day is anchored to it: the
  // nakshatra, tithi, paksha, karana and the majority walk all start from this instant. Shadbala
  // refuses honestly in the same situation; this path invented an answer instead.
  // The clamp STAYS — every downstream caller needs a number and a nominal anchor (solar transit ±
  // 12h) is the least-wrong one — but the fabrication is now VISIBLE, so a reading can say so
  // instead of silently asserting it. Zero effect anywhere the Sun actually rises.
  const noSunrise = cosOmega > 1 ? "polar-night" : cosOmega < -1 ? "polar-day" : null;
  const clampedCosOmega = Math.max(-1, Math.min(1, cosOmega));
  const omega = (Math.acos(clampedCosOmega) * 180) / Math.PI;

  // Sunrise Julian Day (UT)
  const Jsunrise = Jtransit - omega / 360.0;
  return { jd: Jsunrise, noSunrise };
}

/** Backwards-compatible accessor: the anchor instant alone, fabricated or not. */
function calcSunriseJD(year: number, month: number, day: number, lat: number, lon: number): number {
  return calcSunriseSolve(year, month, day, lat, lon).jd;
}

/**
 * Convert Julian Day (UT) to a local time string HH:MM given a UTC offset in hours.
 */
function jdToLocalTime(jd: number, utcOffsetHours: number): string {
  const fractional = (jd + 0.5) % 1; // fraction of day since midnight UT
  const utHours = fractional * 24;
  const localHours = (utHours + utcOffsetHours + 24) % 24;
  const h = Math.floor(localHours);
  const m = Math.floor((localHours - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── Moon calculations ────────────────────────────────────────────────────────

interface MoonData {
  longitude: number;
  signIndex: number;
  sign: string;
  nakshatraIndex: number;
  nakshatra: string;
  nakshatraPada: number;
}

function moonDataFromLongitude(lon: number): MoonData {
  const signIndex = Math.floor(lon / 30);
  const nakshatraIndex = Math.floor(lon / (360 / 27));
  const nakshatraPada = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1;
  return {
    longitude: lon,
    signIndex,
    sign: SIGNS[signIndex],
    nakshatraIndex,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraPada,
  };
}

// ─── Tithi calculation ────────────────────────────────────────────────────────

interface TithiData {
  index: number;
  name: string;
  paksha: 'Shukla' | 'Krishna';
}

function calcTithi(moonLon: number, sunLon: number): TithiData {
  let diff = (moonLon - sunLon + 360) % 360;
  const tithiRaw = Math.floor(diff / 12); // 0–29
  const paksha: 'Shukla' | 'Krishna' = tithiRaw < 15 ? 'Shukla' : 'Krishna';
  const tithiIndex = tithiRaw % 15; // 0–14
  const name = tithiIndex === 14
    ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya')
    : TITHIS[tithiIndex];
  return { index: tithiRaw, name, paksha };
}

// ─── Dominant by majority of day ─────────────────────────────────────────────

/**
 * Determine which nakshatra and tithi govern the majority of the day
 * (from sunrise to next sunrise). Samples every 2 hours.
 */
async function getDominantByMajority(
  sunriseJD: number,
  nextSunriseJD: number
): Promise<{ nakshatra: MoonData; tithi: TithiData }> {
  const swe = await getSwe();
  const flags = SEFLG_SWIEPH | SEFLG_SIDEREAL;

  // EXACT MAJORITY, SUNRISE TO SUNRISE (David 2026-07-19: "named by the majority starting at
  // sunrise to the next sunrise, THOROUGHLY, not 6 samples").
  //
  // The old code took 6 samples ~4h apart and counted them: a transition landing between 41.7%
  // and 58.3% of the day was decided by a 3-3 tie broken on key ORDER, not duration.
  //
  // Sampling is not needed — the boundaries can be found exactly. NOTE THE TRAP: it is tempting
  // to assume at most ONE crossing per day (the Moon covers ~13.2° against a 13.33° nakshatra).
  // That is FALSE when the day opens near a boundary. 2026-07-09 opened at 13.23° — a tenth of a
  // degree from Ashwini's edge — crossed into Bharani at 5:26 AM, then had a full nakshatra of
  // room and crossed into Krittika before the next sunrise. A one-crossing assumption hands that
  // day to Krittika and skips Bharani, which actually ruled ~99% of it. So walk EVERY boundary
  // and sum real durations. (Caught by dense-sampling control, not by the tests.)
  const TOL = 1 / 2880; // ~30s in JD, the tolerance findNakshatraTransition already uses
  const moonIdxAt = (jd: number) => moonDataFromLongitude(swe.calc_ut(jd, SE_MOON, flags)[0]).nakshatraIndex;
  const tithiIdxAt = (jd: number) => calcTithi(swe.calc_ut(jd, SE_MOON, flags)[0], swe.calc_ut(jd, SE_SUN, flags)[0]).index;

  /** Total time each value holds between lo and hi, by bisecting every boundary in order. */
  function durations(lo: number, hi: number, valueAt: (jd: number) => number): Record<number, number> {
    const held: Record<number, number> = {};
    let segStart = lo, cur = valueAt(lo), guard = 0;
    while (guard++ < 8) {
      if (valueAt(hi) === cur) { held[cur] = (held[cur] ?? 0) + (hi - segStart); break; }
      let a = segStart, b = hi;
      while (b - a > TOL) { const mid = (a + b) / 2; if (valueAt(mid) === cur) a = mid; else b = mid; }
      const t = (a + b) / 2;
      held[cur] = (held[cur] ?? 0) + (t - segStart);
      segStart = t; cur = valueAt(Math.min(t + TOL, hi));
    }
    return held;
  }
  const pickMax = (h: Record<number, number>) =>
    Number(Object.entries(h).sort((x, y) => y[1] - x[1])[0][0]);

  const nakHeld = durations(sunriseJD, nextSunriseJD, moonIdxAt);
  const dominantNakshatraIdx = pickMax(nakHeld);
  const dominantTithiIdx = pickMax(durations(sunriseJD, nextSunriseJD, tithiIdxAt));

  // THE MOON'S SIGN, BY MAJORITY TOO (David 2026-07-20: "2. majority").
  // The day's STAR was ruled majority on 2026-07-09 and made exact in v774, but the day's SIGN was
  // left on the sunrise instant — one Moon read on two different clocks. That sign is what
  // chandrabala counts from, so it drives the crown, the day mode and the house.
  // MEASURED over 365 real days: the Moon changes sign inside the vedic day on 43.8% of days, and
  // on 21.1% of ALL days the sunrise sign was NOT the sign that ruled the day — worst case
  // (2026-08-02) the sunrise sign held 1% of the day and decided all of it.
  // Same engine, same trap-avoidance: every boundary walked, real durations summed.
  const signIdxAt = (jd: number) => Math.floor(((swe.calc_ut(jd, SE_MOON, flags)[0] % 360) + 360) % 360 / 30);
  const dominantMoonSignIdx = pickMax(durations(sunriseJD, nextSunriseJD, signIdxAt));

  // The pada of the RULING star, taken from the middle of the window that star actually holds.
  //
  // WHAT THE CANON SAYS (checked 2026-07-19, so this is not an invented convention): the canon set
  // defines pada only as a property of a MOMENT — melana's nadi-by-pada reckoning and the
  // same-star-different-pada rule (melana.json), both NATAL, plus the Arudha bhava padas. There is
  // no canonical "day's pada", and classical panchang quotes nakshatra-and-pada at a reference
  // instant rather than as a daily majority. A pada is a quarter-nakshatra and the Moon crosses
  // 3-4 of them per day, so no pada can hold a majority of a day in any case.
  // So this stays coherent with the ruling star rather than claiming a day-level meaning it does
  // not have. It currently reaches no prose and no screen; it is stored only.
  let padaWinStart = sunriseJD, padaWinEnd = nextSunriseJD;
  {
    let segStart = sunriseJD, cur = moonIdxAt(sunriseJD), guard = 0;
    while (guard++ < 8) {
      if (moonIdxAt(nextSunriseJD) === cur) {
        if (cur === dominantNakshatraIdx) { padaWinStart = segStart; padaWinEnd = nextSunriseJD; }
        break;
      }
      let a = segStart, b = nextSunriseJD;
      while (b - a > TOL) { const mid = (a + b) / 2; if (moonIdxAt(mid) === cur) a = mid; else b = mid; }
      const t = (a + b) / 2;
      if (cur === dominantNakshatraIdx) { padaWinStart = segStart; padaWinEnd = t; break; }
      segStart = t; cur = moonIdxAt(Math.min(t + TOL, nextSunriseJD));
    }
  }
  const padaByNak: Record<number, number> = {
    [dominantNakshatraIdx]: moonDataFromLongitude(
      swe.calc_ut((padaWinStart + padaWinEnd) / 2, SE_MOON, flags)[0],
    ).nakshatraPada,
  };
  const lastMoon: MoonData = moonDataFromLongitude(swe.calc_ut(nextSunriseJD, SE_MOON, flags)[0]);
  const lastTithi: TithiData = calcTithi(
    swe.calc_ut(nextSunriseJD, SE_MOON, flags)[0], swe.calc_ut(nextSunriseJD, SE_SUN, flags)[0],
  );

  // Get moon data at sunrise for the dominant nakshatra sign
  const sunriseMoonResult = swe.calc_ut(sunriseJD, SE_MOON, flags);
  const sunriseMoon = moonDataFromLongitude(sunriseMoonResult[0]);

  // The dominant nakshatra AND the dominant sign — the same Moon, on one clock (David 2026-07-20).
  const dominantMoon: MoonData = {
    ...sunriseMoon,
    nakshatraIndex: dominantNakshatraIdx,
    nakshatra: NAKSHATRAS[dominantNakshatraIdx],
    // Pada from WITHIN the dominant nakshatra (audit M14), not lastMoon's end-of-day pada.
    nakshatraPada: padaByNak[dominantNakshatraIdx] ?? sunriseMoon.nakshatraPada,
    signIndex: dominantMoonSignIdx,
    sign: SIGNS[dominantMoonSignIdx],
  };

  const dominantTithi: TithiData = {
    index: dominantTithiIdx,
    name: dominantTithiIdx % 15 === 14
      ? (dominantTithiIdx < 15 ? 'Purnima' : 'Amavasya')
      : TITHIS[dominantTithiIdx % 15],
    paksha: dominantTithiIdx < 15 ? 'Shukla' : 'Krishna',
  };

  return { nakshatra: dominantMoon, tithi: dominantTithi };
}

// ─── Nakshatra transition finder ─────────────────────────────────────────────

/**
 * Binary-search for the exact Julian Day when the nakshatra index changes
 * between startJD and endJD.
 *
 * Returns the JD of the transition, or null if no transition occurs.
 * Accuracy: within ~30 seconds (tolerance = 1/2880 day).
 */
async function findSignTransition(
  startJD: number,
  endJD: number,
  startSignIndex: number
): Promise<number | null> {
  const swe = await getSwe();
  const flags = SEFLG_SWIEPH | SEFLG_SIDEREAL;
  const endMoonResult = swe.calc_ut(endJD, SE_MOON, flags);
  const endSign = Math.floor((((endMoonResult[0] % 360) + 360) % 360) / 30);
  if (endSign === startSignIndex) return null;
  let lo = startJD, hi = endJD;
  const TOLERANCE = 1 / 2880;
  while (hi - lo > TOLERANCE) {
    const mid = (lo + hi) / 2;
    const midMoonResult = swe.calc_ut(mid, SE_MOON, flags);
    const midSign = Math.floor((((midMoonResult[0] % 360) + 360) % 360) / 30);
    if (midSign === startSignIndex) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

async function findNakshatraTransition(
  startJD: number,
  endJD: number,
  startNakshatraIndex: number
): Promise<number | null> {
  const swe = await getSwe();
  const flags = SEFLG_SWIEPH | SEFLG_SIDEREAL;

  // Check if a transition actually occurs in this window
  const endMoonResult = swe.calc_ut(endJD, SE_MOON, flags);
  const endMoon = moonDataFromLongitude(endMoonResult[0]);
  if (endMoon.nakshatraIndex === startNakshatraIndex) return null;

  // Binary search
  let lo = startJD;
  let hi = endJD;
  const TOLERANCE = 1 / 2880; // ~30 seconds in JD units

  while (hi - lo > TOLERANCE) {
    const mid = (lo + hi) / 2;
    const midMoonResult = swe.calc_ut(mid, SE_MOON, flags);
    const midMoon = moonDataFromLongitude(midMoonResult[0]);
    if (midMoon.nakshatraIndex === startNakshatraIndex) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calculate full panchang astronomy data for a given date and location.
 *
 * @param dateStr  'YYYY-MM-DD'
 * @param lat      latitude (decimal degrees)
 * @param lon      longitude (decimal degrees, negative = west)
 * @param utcOffset  UTC offset in hours for the planner location (e.g. -4 for EDT)
 */
export async function calcPanchang(
  dateStr: string,
  lat: number,
  lon: number,
  utcOffset: number
): Promise<AstronomyData> {
  const [year, month, day] = dateStr.split('-').map(Number);

  // Calculate sunrise JD for this day and next day
  const sunriseSolve = calcSunriseSolve(year, month, day, lat, lon);
  const sunriseJD = sunriseSolve.jd;

  // Next day sunrise for majority-of-day calculation
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextSunriseJD = calcSunriseJD(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate(),
    lat,
    lon
  );

  const swe = await getSwe();
  const flags = SEFLG_SWIEPH | SEFLG_SIDEREAL;

  // Moon and Sun at sunrise
  const moonAtSunrise = swe.calc_ut(sunriseJD, SE_MOON, flags);
  const sunAtSunrise = swe.calc_ut(sunriseJD, SE_SUN, flags);
  const moonLonAtSunrise = moonAtSunrise[0];
  const sunLonAtSunrise = sunAtSunrise[0];

  // Dominant nakshatra and tithi by majority of day
  const { nakshatra: dominantMoon, tithi: dominantTithi } = await getDominantByMajority(
    sunriseJD,
    nextSunriseJD
  );

  // THE DAY'S MOON SIGN = the sign that RULES the day, sunrise to sunrise (David 2026-07-20:
  // "2. majority"). It was the sunrise instant, justified as "more stable than nakshatra" — the
  // same reasoning the 2026-07-09 majority ruling overturned for the star. Since chandrabala counts
  // from this sign, the sunrise instant was setting the crown, the day mode and the house from a
  // sign that on 21.1% of days ruled a MINORITY of the day (as little as 1% of it).
  // The sunrise sign is kept below as `moonSignAtSunriseIndex` for anything that wants the instant.
  const moonSignIndex = dominantMoon.signIndex;
  const moonSignAtSunriseIndex = Math.floor(moonLonAtSunrise / 30);

  // Nakshatra at sunrise (before any mid-day transition)
  const moonAtSunriseData = moonDataFromLongitude(moonLonAtSunrise);
  const nakshatraAtSunrise = moonAtSunriseData.nakshatra;

  // Find nakshatra transition time if one occurs during this day
  const transitionJD = await findNakshatraTransition(
    sunriseJD,
    nextSunriseJD,
    moonAtSunriseData.nakshatraIndex
  );

  let nakshatraTransitionTime: string | null = null;
  let nakshatraAfterTransition: string | null = null;

  if (transitionJD !== null) {
    nakshatraTransitionTime = jdToLocalTime(transitionJD, utcOffset);
    const transitionMoonResult = swe.calc_ut(transitionJD + 1 / 1440, SE_MOON, flags);
    const transitionMoon = moonDataFromLongitude(transitionMoonResult[0]);
    nakshatraAfterTransition = transitionMoon.nakshatra;
  }

  // Sign crossing within the same vedic day (sunrise → next sunrise) — the Moon changes
  // sign every ~2¼ days, so many days carry one. The sign sets the HOUSE sets the MODE,
  // so this is the day's biggest possible turn (David's literal-switch school, extended).
  let signTransitionTime: string | null = null;
  let moonSignAfterTransition: string | null = null;
  // NOTE: this asks "when does the Moon LEAVE the sign it was in at sunrise", so it must use the
  // SUNRISE sign, not the day's ruling sign — with the majority sign (which is often the second
  // sign of the day) it would hunt for a crossing that never happens and report no transition.
  const signTransJD = await findSignTransition(sunriseJD, nextSunriseJD, moonSignAtSunriseIndex);
  if (signTransJD !== null) {
    signTransitionTime = jdToLocalTime(signTransJD, utcOffset);
    const afterResult = swe.calc_ut(signTransJD + 1 / 1440, SE_MOON, flags);
    const afterIdx = Math.floor((((afterResult[0] % 360) + 360) % 360) / 30);
    moonSignAfterTransition = SIGNS[afterIdx];
  }

  return {
    date: dateStr,
    sunriseLocal: jdToLocalTime(sunriseJD, utcOffset),
    sunriseJD,
    noSunrise: sunriseSolve.noSunrise,
    moonLongitude: moonLonAtSunrise,
    signTransitionTime,
    moonSignAfterTransition,
    moonSignIndex,
    moonSign: SIGNS[moonSignIndex],
    /** The sign at the sunrise INSTANT — kept for anything that genuinely wants the moment
     *  (and for the transition math above). The day's sign is the majority one. */
    moonSignAtSunriseIndex,
    moonSignAtSunrise: SIGNS[moonSignAtSunriseIndex],
    nakshatraIndex: dominantMoon.nakshatraIndex,
    nakshatra: dominantMoon.nakshatra,
    nakshatraPada: dominantMoon.nakshatraPada,
    tithiIndex: dominantTithi.index,
    tithi: dominantTithi.name,
    tithiPaksha: dominantTithi.paksha,
    sunLongitude: sunLonAtSunrise,
    nakshatraAtSunrise,
    nakshatraTransitionTime,
    nakshatraAfterTransition,
  };
}
