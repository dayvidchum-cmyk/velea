import swephInitModule from "swisseph-wasm";

/**
 * LAYER 1: VEDIC NATAL CHART ENGINE
 *
 * Purpose: Calculate and store the user's natal chart accurately.
 * This layer ONLY returns structured chart data with no interpretation.
 *
 * Uses:
 * - Swiss Ephemeris WASM
 * - Sidereal zodiac (Lahiri ayanamsa)
 * - Whole Sign houses
 * - Accurate timezone conversion to UTC
 */

// Lahiri Ayanamsa (sidereal zodiac offset) as of J2000 epoch
// Updated to 23.6044° (23°36'16") for accurate sidereal calculations
const LAHIRI_AYANAMSA_J2000 = 23.6044; // degrees

// Zodiac signs
const ZODIAC_SIGNS = [
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

// Nakshatras (27 lunar mansions)
import { NAK27 as NAKSHATRAS } from "./nakshatra-names.js";

interface PlanetPosition {
  name: string;
  sign: string;
  degree: number;
  house: number;
  nakshatra?: string;
  pada?: number;
}

export interface VedicNatalChart {
  lagna: {
    sign: string;
    degree: number;
  };
  planets: Record<string, PlanetPosition>;
  houses: Array<{ number: number; sign: string; degree: number }>;
  calculatedAt: string;
}

// Memoize the PROMISE, never the instance.
//
// 2026-07-19 audit — THE COLD-START RACE. This used to assign the module-level `swissEph`
// BEFORE awaiting initSwissEph() and before set_sid_mode(). A second concurrent caller saw
// `swissEph` truthy at the guard and got a HALF-BUILT instance: it either threw on .ccall,
// or — far worse — returned one whose ayanamsa had not been set yet, silently producing
// Fagan–Bradley positions ~0.883° off the Lahiri frame everything else is stored in. That is
// the exact bug the C1 comment below was written to close, reachable again through a race.
// A probe measured 4–7 of 8 concurrent cold-start calls rejecting. It fires at container
// start after a deploy — the moment the app is opened.
//
// Awaiting one shared promise means every caller gets the SAME fully-initialised instance,
// with the sidereal mode already set, or they all get the same rejection. On failure the
// promise is cleared so a later call can retry rather than caching a permanent poison.
let swissEphP: Promise<any> | null = null;

/**
 * Initialize Swiss Ephemeris WASM module (single-flight; safe under concurrency)
 */
function initSwissEph(): Promise<any> {
  if (swissEphP) return swissEphP;

  swissEphP = (async () => {
    // Instantiate the Swiss Ephemeris class — into a LOCAL, published only when complete.
    const se: any = await new (swephInitModule as any)();

    // Initialize the WASM module
    await se.initSwissEph();

    // AYANAMSA (audit 2026-07-17, C1): every SEFLG_SIDEREAL call on THIS instance was
    // silently using Swiss Ephemeris' default Fagan–Bradley — ~0.883° behind the Lahiri
    // frame the natal charts (birthchart/calculator.ts) and panchang are stored in. Each
    // WASM instance holds its own C state, so this must be set here too. Without it, every
    // transit-to-natal orb, day-Moon sign, crown/tara scan, and Varshaphala return was off.
    if (se.set_sid_mode) {
      se.set_sid_mode(se.SE_SIDM_LAHIRI ?? 1, 0, 0);
    }

    // Try to set ephemeris path if available
    if (se.set_ephe_path) {
      se.set_ephe_path("./ephemeris");
    }

    return se;
  })().catch((error) => {
    swissEphP = null; // let a later call retry instead of caching the failure forever
    console.error("Failed to initialize Swiss Ephemeris:", error);
    throw new Error(`Swiss Ephemeris initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  });

  return swissEphP;
}

/**
 * Convert tropical longitude to sidereal using Lahiri ayanamsa
 */
function tropicalToSidereal(tropicalLon: number, jd: number): number {
  // Calculate ayanamsa for the given Julian Day
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = LAHIRI_AYANAMSA_J2000 + 0.004297 * T + 0.00000036 * T * T;

  let sidereal = tropicalLon - ayanamsa;
  if (sidereal < 0) sidereal += 360;
  if (sidereal >= 360) sidereal -= 360;

  return sidereal;
}

/**
 * Get zodiac sign and degree from longitude
 */
function getLongitudeSign(longitude: number): { sign: string; degree: number } {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: Math.round(degree * 100) / 100,
  };
}

/**
 * Get nakshatra from lunar longitude
 */
function getNakshatra(moonLon: number): { name: string; pada: number } {
  const nakshatraIndex = Math.floor(moonLon / (360 / 27));
  const nakshatraStart = nakshatraIndex * (360 / 27);
  const positionInNakshatra = moonLon - nakshatraStart;
  const pada = Math.floor(positionInNakshatra / (360 / 27 / 4)) + 1;

  return {
    name: NAKSHATRAS[nakshatraIndex],
    pada: pada,
  };
}

/**
 * Calculate Whole Sign houses
 */
function calculateWholeSigns(
  lagnaLon: number
): Array<{ number: number; sign: string; degree: number }> {
  const houses: Array<{ number: number; sign: string; degree: number }> = [];

  for (let i = 0; i < 12; i++) {
    const houseLon = (lagnaLon + i * 30) % 360;
    const signData = getLongitudeSign(houseLon);

    houses.push({
      number: i + 1,
      sign: signData.sign,
      degree: Math.round(houseLon * 100) / 100,
    });
  }

  return houses;
}

/**
 * Get house number for a planet based on its longitude and Lagna
 */
function getPlanetHouse(planetLon: number, lagnaLon: number): number {
  let diff = planetLon - lagnaLon;
  if (diff < 0) diff += 360;

  const houseIndex = Math.floor(diff / 30);
  return houseIndex + 1;
}

/**
 * Calculate Vedic Natal Chart
 *
 * @param birthDate - Birth date (YYYY-MM-DD)
 * @param birthTime - Birth time (HH:MM:SS in 24-hour format)
 * @param latitude - Birth latitude (positive = North, negative = South)
 * @param longitude - Birth longitude (positive = East, negative = West)
 * @param timezone - Timezone offset from UTC (e.g., +8 for UTC+8)
 * @returns VedicNatalChart with all planetary positions
 */
export async function calculateNatalChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  timezone: number
): Promise<VedicNatalChart> {
  const se = await initSwissEph();

  // Parse birth date and time
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute, second] = birthTime.split(":").map(Number);

  // Convert local time to UTC
  const utcHour = hour - timezone;
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, utcHour, minute, second)
  );

  // Calculate Julian Day
  const jd = se.julday(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600
  );

  // Set flags for sidereal zodiac
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL;

  // Calculate house cusps using Placidus system
  // With SEFLG_SIDEREAL flag, houses_ex returns sidereal coordinates directly
  const houseResult = se.houses_ex(jd, flags, latitude, longitude, "P");
  const lagnaLonSidereal = houseResult.ascmc[0];

  // Get Lagna sign and degree
  const lagnaData = getLongitudeSign(lagnaLonSidereal);

  // Calculate Whole Sign houses
  const houses = calculateWholeSigns(lagnaLonSidereal);

  // Calculate planetary positions
  const planets: Record<string, PlanetPosition> = {};

  const planetConfigs = [
    { key: "sun", index: se.SE_SUN, name: "Sun" },
    { key: "moon", index: se.SE_MOON, name: "Moon" },
    { key: "mercury", index: se.SE_MERCURY, name: "Mercury" },
    { key: "venus", index: se.SE_VENUS, name: "Venus" },
    { key: "mars", index: se.SE_MARS, name: "Mars" },
    { key: "jupiter", index: se.SE_JUPITER, name: "Jupiter" },
    { key: "saturn", index: se.SE_SATURN, name: "Saturn" },
    { key: "rahu", index: se.SE_RAHU, name: "Rahu" },
    { key: "ketu", index: se.SE_KETU, name: "Ketu" },
  ];

  for (const config of planetConfigs) {
    // Rahu/Ketu have no SE_RAHU/SE_KETU in this binding (they're undefined → index 0 = SE_SUN,
    // so both nodes computed as the SUN — re-audit 2026-07-18; test-only path, fixed so it can't
    // be revived into prod broken). Use the mean node, Ketu = Rahu + 180°, as the live paths do.
    let planetLonSidereal: number;
    if (config.name === "Rahu" || config.name === "Ketu") {
      const nodeCalc = se.calc_ut(jd, se.SE_MEAN_NODE, flags);
      const rahuLon = ((nodeCalc[0] % 360) + 360) % 360;
      planetLonSidereal = config.name === "Rahu" ? rahuLon : (rahuLon + 180) % 360;
    } else {
      const planetCalc = se.calc_ut(jd, config.index, flags);
      // With SEFLG_SIDEREAL flag, calc_ut returns sidereal coordinates directly
      planetLonSidereal = planetCalc[0];
    }

    const signData = getLongitudeSign(planetLonSidereal);
    const house = getPlanetHouse(planetLonSidereal, lagnaLonSidereal);

    const position: PlanetPosition = {
      name: config.name,
      sign: signData.sign,
      degree: signData.degree,
      house: house,
    };

    // Add nakshatra and pada for Moon
    if (config.key === "moon") {
      const nakshatra = getNakshatra(planetLonSidereal);
      position.nakshatra = nakshatra.name;
      position.pada = nakshatra.pada;
    }

    planets[config.key] = position;
  }

  return {
    lagna: lagnaData,
    planets,
    houses,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get sidereal longitudes (0–360) for the given planets at a given moment.
 *
 * Uses the EXACT same Swiss Ephemeris setup as calculateNatalChart
 * (SEFLG_SWIEPH | SEFLG_SIDEREAL, se.SE_* indices), so transiting positions are
 * directly comparable to the natal longitudes stored from this engine. Do not
 * swap in a different ayanamsa/method here — orb math depends on consistency.
 */
export async function getSiderealLongitudes(
  when: Date,
  planetNames: string[]
): Promise<Record<string, number>> {
  const se = await initSwissEph();
  const jd = se.julday(
    when.getUTCFullYear(),
    when.getUTCMonth() + 1,
    when.getUTCDate(),
    when.getUTCHours() + when.getUTCMinutes() / 60 + when.getUTCSeconds() / 3600
  );
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL;
  // This binding has SE_MEAN_NODE (10) but no SE_RAHU/SE_KETU. Rahu = mean node;
  // Ketu = Rahu + 180°. (Previously se.SE_RAHU was undefined, so the nodes silently
  // returned 0 — which broke Rahu/Ketu transit-pressure conjunctions.)
  const index: Record<string, number> = {
    Sun: se.SE_SUN,
    Moon: se.SE_MOON,
    Mercury: se.SE_MERCURY,
    Venus: se.SE_VENUS,
    Mars: se.SE_MARS,
    Jupiter: se.SE_JUPITER,
    Saturn: se.SE_SATURN,
  };

  const out: Record<string, number> = {};
  for (const name of planetNames) {
    if (name === "Rahu" || name === "Ketu") {
      const calc = se.calc_ut(jd, se.SE_MEAN_NODE, flags);
      const rahuLon = ((calc[0] % 360) + 360) % 360;
      out[name] = name === "Rahu" ? rahuLon : (rahuLon + 180) % 360;
      continue;
    }
    const idx = index[name];
    if (idx === undefined) continue;
    const calc = se.calc_ut(jd, idx, flags);
    out[name] = ((calc[0] % 360) + 360) % 360;
  }
  return out;
}

const PLANET_INDEX_NAMES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu",
] as const;

/**
 * Sidereal longitude AND daily speed for the given planets at a moment. Same
 * ayanamsa/method as getSiderealLongitudes (so directly comparable to natal),
 * plus SEFLG_SPEED so we get longitudeSpeed (deg/day). Negative speed = retrograde.
 */
export async function getSiderealLongitudesWithSpeed(
  when: Date,
  planetNames: readonly string[] = PLANET_INDEX_NAMES,
): Promise<Record<string, { longitude: number; speed: number }>> {
  const se = await initSwissEph();
  const jd = se.julday(
    when.getUTCFullYear(),
    when.getUTCMonth() + 1,
    when.getUTCDate(),
    when.getUTCHours() + when.getUTCMinutes() / 60 + when.getUTCSeconds() / 3600
  );
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL | se.SEFLG_SPEED;
  // This binding has SE_MEAN_NODE (10) but no SE_RAHU/SE_KETU. Rahu = mean node;
  // Ketu = Rahu + 180° (same handling as getSiderealLongitudes above).
  const index: Record<string, number> = {
    Sun: se.SE_SUN, Moon: se.SE_MOON, Mercury: se.SE_MERCURY, Venus: se.SE_VENUS,
    Mars: se.SE_MARS, Jupiter: se.SE_JUPITER, Saturn: se.SE_SATURN,
  };
  const out: Record<string, { longitude: number; speed: number }> = {};
  for (const name of planetNames) {
    if (name === "Rahu" || name === "Ketu") {
      const calc = se.calc_ut(jd, se.SE_MEAN_NODE, flags);
      const rahuLon = ((calc[0] % 360) + 360) % 360;
      const speed = calc[3] ?? 0;
      out[name] = name === "Rahu"
        ? { longitude: rahuLon, speed }
        : { longitude: (rahuLon + 180) % 360, speed };
      continue;
    }
    const idx = index[name];
    if (idx === undefined) continue;
    const calc = se.calc_ut(jd, idx, flags);
    out[name] = { longitude: ((calc[0] % 360) + 360) % 360, speed: calc[3] ?? 0 };
  }
  return out;
}

