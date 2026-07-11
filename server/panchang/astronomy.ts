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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AstronomyData {
  /** Date string YYYY-MM-DD */
  date: string;
  /** Sunrise time as HH:MM in local timezone */
  sunriseLocal: string;
  /** Sunrise as Julian Day (UT) */
  sunriseJD: number;
  /** Moon sidereal longitude in degrees (0–360) at sunrise */
  moonLongitude: number;
  /** Moon sign index 0–11 (0=Aries … 11=Pisces) */
  moonSignIndex: number;
  /** Moon sign name */
  moonSign: string;
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

const NAKSHATRAS: string[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
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
function calcSunriseJD(year: number, month: number, day: number, lat: number, lon: number): number {
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

  // Clamp to handle polar day/night
  const clampedCosOmega = Math.max(-1, Math.min(1, cosOmega));
  const omega = (Math.acos(clampedCosOmega) * 180) / Math.PI;

  // Sunrise Julian Day (UT)
  const Jsunrise = Jtransit - omega / 360.0;
  return Jsunrise;
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

  // Sample at 6 points across the day
  const samples = 6;
  const step = (nextSunriseJD - sunriseJD) / samples;

  const nakshatraCounts: Record<number, number> = {};
  const tithiCounts: Record<number, number> = {};
  let lastMoon: MoonData | null = null;
  let lastTithi: TithiData | null = null;

  for (let i = 0; i < samples; i++) {
    const sampleJD = sunriseJD + step * (i + 0.5);
    const moonResult = swe.calc_ut(sampleJD, SE_MOON, flags);
    const sunResult = swe.calc_ut(sampleJD, SE_SUN, flags);
    const moonLon = moonResult[0];
    const sunLon = sunResult[0];

    const moon = moonDataFromLongitude(moonLon);
    const tithi = calcTithi(moonLon, sunLon);

    nakshatraCounts[moon.nakshatraIndex] = (nakshatraCounts[moon.nakshatraIndex] || 0) + 1;
    tithiCounts[tithi.index] = (tithiCounts[tithi.index] || 0) + 1;
    lastMoon = moon;
    lastTithi = tithi;
  }

  // Dominant = most frequent
  const dominantNakshatraIdx = Number(
    Object.entries(nakshatraCounts).sort((a, b) => b[1] - a[1])[0][0]
  );
  const dominantTithiIdx = Number(
    Object.entries(tithiCounts).sort((a, b) => b[1] - a[1])[0][0]
  );

  // Get moon data at sunrise for the dominant nakshatra sign
  const sunriseMoonResult = swe.calc_ut(sunriseJD, SE_MOON, flags);
  const sunriseMoon = moonDataFromLongitude(sunriseMoonResult[0]);

  // Use dominant nakshatra but sunrise moon sign (sign changes are less frequent)
  const dominantMoon: MoonData = {
    ...sunriseMoon,
    nakshatraIndex: dominantNakshatraIdx,
    nakshatra: NAKSHATRAS[dominantNakshatraIdx],
    nakshatraPada: lastMoon?.nakshatraPada ?? 1,
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
  const sunriseJD = calcSunriseJD(year, month, day, lat, lon);

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

  // Moon sign is determined at sunrise (more stable than nakshatra)
  const moonSignIndex = Math.floor(moonLonAtSunrise / 30);

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
  const signTransJD = await findSignTransition(sunriseJD, nextSunriseJD, moonSignIndex);
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
    moonLongitude: moonLonAtSunrise,
    signTransitionTime,
    moonSignAfterTransition,
    moonSignIndex,
    moonSign: SIGNS[moonSignIndex],
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
