import SwissEph from 'swisseph-wasm';

/**
 * Vedic zodiac signs (sidereal)
 */
const VEDIC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/**
 * 27 Nakshatras in order
 */
const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

/**
 * Get Vedic sign from sidereal longitude (0-360)
 */
function getLongitudeSign(siderealLongitude: number): {
  sign: string;
  degree: number;
} {
  const signIndex = Math.floor(siderealLongitude / 30);
  const degreeInSign = siderealLongitude % 30;
  return {
    sign: VEDIC_SIGNS[signIndex],
    degree: degreeInSign,
  };
}

/**
 * Get nakshatra and pada from sidereal longitude.
 * Each Nakshatra spans 360°/27 = 13°20' = 13.3333...°
 * Each Pada spans 13.3333.../4 = 3°20' = 3.3333...°
 */
function getNakshatraAndPada(siderealLongitude: number): {
  nakshatra: string;
  pada: number;
} {
  const NAKSHATRA_SPAN = 360 / 27; // 13.333...
  const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3.333...

  const nakshatraIndex = Math.floor(siderealLongitude / NAKSHATRA_SPAN) % 27;
  const degreeInNakshatra = siderealLongitude % NAKSHATRA_SPAN;
  const pada = Math.min(Math.floor(degreeInNakshatra / PADA_SPAN) + 1, 4);

  return {
    nakshatra: NAKSHATRAS[nakshatraIndex],
    pada,
  };
}

/**
 * Calculate house from Lagna using Whole Sign system
 */
function getHouseFromLagna(
  lagnaLongitude: number,
  planetLongitude: number
): number {
  const lagnaSign = Math.floor(lagnaLongitude / 30);
  const planetSign = Math.floor(planetLongitude / 30);
  const house = (planetSign - lagnaSign + 12) % 12;
  return house + 1; // Houses are 1-12
}

/**
 * Convert a local date/time in a given IANA timezone to a UTC Date object.
 *
 * Strategy: use the Intl API to format a reference UTC instant in the target
 * timezone, then binary-search for the UTC instant whose local representation
 * matches the requested local time.  This correctly handles:
 *   - Negative offsets (Americas)
 *   - Fractional-hour offsets (India UTC+5:30, Nepal UTC+5:45, etc.)
 *   - DST transitions
 *   - Historical dates (the Intl engine uses the IANA tz database)
 *
 * @param dateStr  "YYYY-MM-DD"
 * @param timeStr  "HH:mm"
 * @param timezone IANA timezone string, e.g. "Asia/Manila"
 * @returns UTC Date
 */
function localToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Build a formatter that returns the local time components for a given UTC instant
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function getLocalParts(utcMs: number): { year: number; month: number; day: number; hour: number; minute: number } {
    const parts = fmt.formatToParts(new Date(utcMs));
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      hour: get("hour"),
      minute: get("minute"),
    };
  }

  // Initial estimate: assume UTC+0 and adjust
  // Start with a rough estimate: midnight UTC on the birth date
  let lo = Date.UTC(year, month - 1, day - 1, 0, 0, 0); // 1 day before
  let hi = Date.UTC(year, month - 1, day + 1, 23, 59, 59); // 1 day after

  // Binary search for the UTC millisecond whose local time matches
  const targetMinutes = hour * 60 + minute;

  for (let i = 0; i < 50; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const local = getLocalParts(mid);
    const localMinutes = local.hour * 60 + local.minute;
    const localDate = local.year * 10000 + local.month * 100 + local.day;
    const targetDate = year * 10000 + month * 100 + day;

    if (localDate < targetDate || (localDate === targetDate && localMinutes < targetMinutes)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return new Date(lo);
}

// Global Swiss Ephemeris instance
let swissEphInstance: any = null;

/**
 * Initialize Swiss Ephemeris
 */
async function initSwissEph() {
  if (swissEphInstance) {
    return swissEphInstance;
  }

  const se = new SwissEph();
  await se.initSwissEph();
  swissEphInstance = se;
  return se;
}

type PlanetData = { sign: string; degree: number; longitude: number; house: number; nakshatra: string; pada: number; isRetrograde: boolean };

export interface BirthChartResult {
  utcBirthIso: string;
  julianDay: number;
  lagna: { sign: string; degree: number; longitude: number };
  sun: PlanetData;
  moon: PlanetData;
  mercury: PlanetData;
  venus: PlanetData;
  mars: PlanetData;
  jupiter: PlanetData;
  saturn: PlanetData;
  rahu: PlanetData;
  ketu: PlanetData;
}

/**
 * Calculate Vedic birth chart from birth data using Swiss Ephemeris.
 *
 * @param birthDate  "YYYY-MM-DD"
 * @param birthTime  "HH:mm"
 * @param latitude   decimal degrees (positive = North)
 * @param longitude  decimal degrees (positive = East)
 * @param timezone   IANA timezone string, e.g. "Asia/Manila"
 */
export async function calculateBirthChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<BirthChartResult> {
  // Initialize Swiss Ephemeris
  const se = await initSwissEph();

  // CRITICAL: Set Lahiri ayanamsa BEFORE any sidereal calculation.
  // Without this, SEFLG_SIDEREAL uses the default Fagan-Bradley ayanamsa (~24.49°)
  // instead of Lahiri (~23.61°), producing a Moon longitude error of ~0.88°.
  se.set_sid_mode(se.SE_SIDM_LAHIRI, 0, 0);

  // Convert local birth time to UTC using proper IANA timezone handling
  const utcDate = localToUtc(birthDate, birthTime, timezone);
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth() + 1;
  const utcDay = utcDate.getUTCDate();
  const utcHour = utcDate.getUTCHours();
  const utcMinute = utcDate.getUTCMinutes();

  // Calculate Julian Day (UT)
  const jd = se.julday(utcYear, utcMonth, utcDay, utcHour + utcMinute / 60);

  // SEFLG_SPEED (256) is required for swisseph-wasm to return non-zero speeds in calc[3].
  // Without it the speed field is always 0, making retrograde detection impossible.
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL | (se.SEFLG_SPEED ?? 256);

  // Calculate Ascendant using Placidus house system.
  // We only use ascmc[0] (the Ascendant degree) — house assignments are
  // computed via Whole Sign (getHouseFromLagna), which is standard for Vedic.
  const houseResult = se.houses_ex(jd, flags, latitude, longitude, 'P');
  const lagnaLongitude = houseResult.ascmc[0]; // sidereal ascendant
  const lagnaData = getLongitudeSign(lagnaLongitude);
  // Sidereal Midheaven (MC) — ascmc[1]. The IC is the opposite point (mc + 180).
  // Vedic whole-sign ignores this degree, but it's the Western meridian axis we read.
  const mcLongitude = houseResult.ascmc[1];
  const mcData = getLongitudeSign(mcLongitude);
  const icLongitude = (mcLongitude + 180) % 360;
  const icData = getLongitudeSign(icLongitude);

  // Calculate planetary positions
  const planetCodes = [
    { name: "sun",     code: se.SE_SUN },
    { name: "moon",    code: se.SE_MOON },
    { name: "mercury", code: se.SE_MERCURY },
    { name: "venus",   code: se.SE_VENUS },
    { name: "mars",    code: se.SE_MARS },
    { name: "jupiter", code: se.SE_JUPITER },
    { name: "saturn",  code: se.SE_SATURN },
    { name: "rahu",    code: se.SE_MEAN_NODE }, // Mean North Node
  ];

  const result: any = {
    utcBirthIso: utcDate.toISOString(),
    julianDay: jd,
    lagna: {
      ...lagnaData,
      longitude: lagnaLongitude,
    },
    mc: { ...mcData, longitude: mcLongitude },
    ic: { ...icData, longitude: icLongitude },
  };

  for (const planet of planetCodes) {
    const calc = se.calc_ut(jd, planet.code, flags);
    const siderealLongitude = calc[0];
    const speed = calc[3]; // degrees/day — negative = retrograde
    const signData = getLongitudeSign(siderealLongitude);
    const house = getHouseFromLagna(lagnaLongitude, siderealLongitude);
    const nakshatraData = getNakshatraAndPada(siderealLongitude);

    result[planet.name] = {
      ...signData,
      longitude: siderealLongitude,
      ...nakshatraData,
      house,
      isRetrograde: speed < 0,
    };
  }

  // Ketu is exactly 180° opposite Rahu (true South Node)
  const rahuLongitude = result.rahu.longitude;
  const ketuLongitude = (rahuLongitude + 180) % 360;
  const ketuSignData = getLongitudeSign(ketuLongitude);
  const ketuHouse = getHouseFromLagna(lagnaLongitude, ketuLongitude);
  const ketuNakshatraData = getNakshatraAndPada(ketuLongitude);
  result.ketu = {
    ...ketuSignData,
    longitude: ketuLongitude,
    ...ketuNakshatraData,
    house: ketuHouse,
    isRetrograde: true, // Ketu (South Node) is always retrograde
  };

  return result as BirthChartResult;
}
