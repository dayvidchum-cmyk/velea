import SwissEph from 'swisseph-wasm';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];


// Reuse one warm Swiss Ephemeris instance instead of a cold init on every call.
let _sharedSe: any = null;
async function getSharedSe() {
  if (!_sharedSe) {
    const se = new (SwissEph as any)();
    await se.initSwissEph();
    _sharedSe = se;
  }
  return _sharedSe;
}

// Scan step (days) tuned to the Time Lord's sign-dwell time — well under half the
// minimum time it spends in a sign, so no sign/retrograde change is skipped.
// The Moon changes sign every ~2.25 days (needs a daily step); slow planets sit
// for months to years, so a coarse step avoids hundreds of wasted ephemeris calls.
const SCAN_STEP_DAYS: Record<string, number> = {
  Moon: 1, Sun: 2, Mercury: 2, Venus: 2, Mars: 3, Jupiter: 6, Saturn: 8, Rahu: 8, Ketu: 8,
};

function getZodiacSign(longitude: number): string {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30);
  return ZODIAC_SIGNS[index] || "Aries";
}

/** The Time Lord's co-present planets ("guests"), combustion & solitary status RIGHT NOW —
 *  live, so the current segment reflects the present moment rather than its stored midpoint. */
export async function timeLordGuestsNow(planet: string): Promise<{ coPresentPlanets: string[]; solitaryStatus: boolean; combustionStatus: boolean } | null> {
  try {
    const se = await getSharedSe();
    return computeCoPresent(se, dateToJD(new Date()), planet);
  } catch {
    return null;
  }
}

/** The Time Lord planet's actual sidereal sign right now — for detecting stale rows. */
export async function timeLordCurrentSign(planet: string): Promise<string | null> {
  try {
    const se = await getSharedSe();
    const r = se.calc(dateToJD(new Date()), getPlanetNumber(planet), se.SEFLG_SIDEREAL);
    if (r?.longitude == null) return null;
    return getZodiacSign(r.longitude);
  } catch {
    return null;
  }
}

function getNakshatraFromLongitude(longitude: number): string {
  const NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
  ];
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor((normalized / 360) * 27);
  return NAKSHATRAS[index] || "Ashwini";
}

export interface TimeLordTransit {
  timeLord: string;
  startDate: string;
  endDate: string;
  sign: string;
  house: number;
  nakshatra?: string;
  isRetrograde: boolean;
  condition: string;
  operationalMeaning: string;
  recommendedUse: string;
  coPresentPlanets?: string[]; // other planets sharing the sign during this segment (its "guests")
  solitaryStatus?: boolean;    // true when no guests
  combustionStatus?: boolean;  // Time Lord within 8° of the Sun
}

// Planets checked for co-presence in the Time Lord's sign (its "guests" this segment).
const CO_PRESENT_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

/** Which other planets share the Time Lord's sidereal sign at `jd` (+ combustion by the Sun). */
function computeCoPresent(se: any, jd: number, timeLordPlanet: string) {
  const tl = se.calc(jd, getPlanetNumber(timeLordPlanet), se.SEFLG_SIDEREAL);
  const tlLon = ((tl.longitude % 360) + 360) % 360;
  const tlSign = getZodiacSign(tlLon);
  const coPresentPlanets: string[] = [];
  let combustion = false;
  for (const name of CO_PRESENT_PLANETS) {
    if (name === timeLordPlanet) continue;
    const r = se.calc(jd, getPlanetNumber(name), se.SEFLG_SIDEREAL);
    const lon = ((r.longitude % 360) + 360) % 360;
    if (getZodiacSign(lon) === tlSign) coPresentPlanets.push(name);
    if (name === "Sun" && timeLordPlanet !== "Sun") {
      let orb = Math.abs(tlLon - lon);
      if (orb > 180) orb = 360 - orb;
      if (orb < 8) combustion = true;
    }
  }
  return { coPresentPlanets, solitaryStatus: coPresentPlanets.length === 0, combustionStatus: combustion };
}

export interface TimeLordMovementTimeline {
  timeLord: string;
  profectionYearStart: string;
  profectionYearEnd: string;
  transits: TimeLordTransit[];
}

// House interpretations for Time Lord transits
const HOUSE_INTERPRETATIONS: Record<number, string> = {
  1: "self-direction, body, visibility, identity, personal agency",
  2: "money, values, resources, voice, self-worth, material stability",
  3: "communication, writing, repetition, siblings, short trips, skill-building",
  4: "home, roots, privacy, emotional foundation, family, inner stability",
  5: "creativity, romance, pleasure, children, visibility through expression",
  6: "work, repair, health routines, service, discipline, daily systems",
  7: "relationships, clients, contracts, agreements, public exchange",
  8: "shared resources, debt, intimacy, endings, pressure, hidden complexity",
  9: "beliefs, teaching, publishing, higher learning, long-range direction",
  10: "career, reputation, public role, authority, achievement",
  11: "networks, audience, community, gains, future plans",
  12: "rest, withdrawal, closure, subconscious patterns, private work",
};

function getPlanetNumber(planetName: string): number {
  const planetMap: Record<string, number> = {
    Sun: 0,
    Moon: 1,
    Mercury: 2,
    Venus: 3,
    Mars: 4,
    Jupiter: 5,
    Saturn: 6,
    Rahu: 9,
    Ketu: 10,
  };
  return planetMap[planetName] || 0;
}

function getPlanetHouse(planetLongitude: number, lagnaLongitude: number): number {
  const planet = ((planetLongitude % 360) + 360) % 360;
  const lagna = ((lagnaLongitude % 360) + 360) % 360;
  let offset = (planet - lagna + 360) % 360;
  const house = Math.floor(offset / 30) + 1;
  return Math.min(12, Math.max(1, house));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getHouseName(house: number): string {
  const names = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  return names[house] || "";
}

function dateToJD(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jdn + (hour - 12) / 24;
}

function getPlanetState(se: any, jd: number, planetNum: number, lagnaLongitude: number, lagnaSign: string) {
  // SEFLG_SIDEREAL already returns Lahiri sidereal longitude — do NOT subtract the
  // ayanamsa again (that double-count put every Time Lord ~one sign behind).
  const result = se.calc(jd, planetNum, se.SEFLG_SIDEREAL);
  const normalizedLon = ((result.longitude % 360) + 360) % 360;
  const transitSign = getZodiacSign(normalizedLon);
  
  // Use Whole Sign house mapping instead of longitude-based
  const house = getHouseFromSign(lagnaSign, transitSign);
  
  return {
    sign: transitSign,
    house: house,
    isRetrograde: result.longitudeSpeed < 0,
    longitude: normalizedLon,
  };
}

function getHouseFromSign(lagnaSign: string, transitSign: string): number {
  const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSign);
  const transitIndex = ZODIAC_SIGNS.indexOf(transitSign);
  
  if (lagnaIndex === -1 || transitIndex === -1) {
    return 12; // Fallback
  }
  
  const distance = (transitIndex - lagnaIndex + 12) % 12;
  return distance + 1;
}

/**
 * Calculate Time Lord transits for a profection year using optimized stepping
 */
export async function calculateTimeLordTransits(
  timeLordPlanet: string,
  yearStart: string,
  yearEnd: string,
  lagnaLongitude: number,
  timezone: string,
  lagnaSign: string = "Virgo"
): Promise<TimeLordMovementTimeline> {
  const transits: TimeLordTransit[] = [];

  try {
    // Reuse the warm Swiss Ephemeris singleton (no cold init per call).
    const se = await getSharedSe();

    const startDate = new Date(yearStart);
    const endDate = new Date(yearEnd);
    const planetNum = getPlanetNumber(timeLordPlanet);
    const stepDays = SCAN_STEP_DAYS[timeLordPlanet] ?? 2;

    // Step 1: Scan (step tuned to the planet's speed) for sign/house/retrograde changes
    const changePoints: { date: Date; state: any }[] = [];

    let currentDate = new Date(startDate);
    let lastState = getPlanetState(se, dateToJD(currentDate), planetNum, lagnaLongitude, lagnaSign);
    changePoints.push({ date: new Date(currentDate), state: lastState });

    // Scan at the planet-tuned step for accuracy without wasted calls
    while (currentDate < endDate) {
      currentDate.setDate(currentDate.getDate() + stepDays);
      if (currentDate > endDate) currentDate = new Date(endDate);

      const newState = getPlanetState(se, dateToJD(currentDate), planetNum, lagnaLongitude, lagnaSign);

      // Check if anything changed
      if (
        newState.sign !== lastState.sign ||
        newState.house !== lastState.house ||
        newState.isRetrograde !== lastState.isRetrograde
      ) {
        changePoints.push({ date: new Date(currentDate), state: newState });
        lastState = newState;
      }
    }

    // Step 2: For each change point, binary search to find exact transition date
    for (let i = 0; i < changePoints.length - 1; i++) {
      const startPoint = changePoints[i];
      const endPoint = changePoints[i + 1];

      // Binary search for exact transition date
      let left = new Date(startPoint.date);
      let right = new Date(endPoint.date);

      while (right.getTime() - left.getTime() > 24 * 60 * 60 * 1000) { // Stop when within 1 day
        const mid = new Date((left.getTime() + right.getTime()) / 2);
        const midState = getPlanetState(se, dateToJD(mid), planetNum, lagnaLongitude, lagnaSign);

        if (
          midState.sign === startPoint.state.sign &&
          midState.house === startPoint.state.house &&
          midState.isRetrograde === startPoint.state.isRetrograde
        ) {
          left = mid;
        } else {
          right = mid;
        }
      }

      // Create transit from startPoint to the day before transition
      // `right` is the first day of the new sign, so end on the day before
      const transitStartDate = new Date(startPoint.date);
      const dayBeforeTransition = new Date(right);
      dayBeforeTransition.setDate(dayBeforeTransition.getDate() - 1);
      
      // Only include transits that start on or after yearStart
      const formattedStart = formatDate(startPoint.date);
      if (transitStartDate >= startDate) {
        const transit = createTransit(
          formattedStart,
          formatDate(dayBeforeTransition),
          timeLordPlanet,
          startPoint.state.sign,
          startPoint.state.house,
          startPoint.state.isRetrograde
        );
        const midJd = dateToJD(new Date((transitStartDate.getTime() + dayBeforeTransition.getTime()) / 2));
        Object.assign(transit, computeCoPresent(se, midJd, timeLordPlanet));
        transits.push(transit);
      }
    }

    // Final segment: the loop only covers gaps BETWEEN change points, so the last
    // change point through the end of the year would otherwise be dropped.
    const lastCp = changePoints[changePoints.length - 1];
    if (lastCp && new Date(lastCp.date) >= startDate) {
      const transit = createTransit(
        formatDate(lastCp.date),
        formatDate(endDate),
        timeLordPlanet,
        lastCp.state.sign,
        lastCp.state.house,
        lastCp.state.isRetrograde,
      );
      const midJd = dateToJD(new Date((new Date(lastCp.date).getTime() + endDate.getTime()) / 2));
      Object.assign(transit, computeCoPresent(se, midJd, timeLordPlanet));
      transits.push(transit);
    }

  } catch (error) {
    console.error("[Transit Calculator] Error:", error);
  }

  return {
    timeLord: timeLordPlanet,
    profectionYearStart: yearStart,
    profectionYearEnd: yearEnd,
    transits,
  };
}

/**
 * Create a transit record with interpretation
 */
function createTransit(
  startDate: string,
  endDate: string,
  timeLord: string,
  sign: string,
  house: number,
  isRetrograde: boolean
): TimeLordTransit {
  const condition = `${sign} in ${getHouseName(house)}${isRetrograde ? " (Retrograde)" : ""}`;
  const houseInterpretation = HOUSE_INTERPRETATIONS[house] || "";

  return {
    timeLord,
    startDate,
    endDate,
    sign,
    house,
    isRetrograde,
    condition,
    operationalMeaning: `The Time Lord emphasizes ${houseInterpretation}`,
    recommendedUse: generateRecommendedUse(timeLord, house, isRetrograde),
  };
}

/**
 * Generate recommended use text for a Time Lord transit
 */
function generateRecommendedUse(timeLord: string, house: number, isRetrograde: boolean): string {
  const baseRecommendations: Record<number, string> = {
    1: "Use this period for self-direction, personal projects, visibility, and establishing your presence.",
    2: "Use this period for financial decisions, value clarification, voice, and material stability.",
    3: "Use this period for writing, communication, learning, short trips, and skill-building.",
    4: "Use this period for home, family, emotional processing, rest, and establishing roots.",
    5: "Use this period for creative projects, romance, pleasure, and self-expression.",
    6: "Use this period for work, health routines, service, repair, and daily systems.",
    7: "Use this period for relationships, contracts, public exchange, and partnerships.",
    8: "Use this period for shared resources, intimacy, transformation, and handling complexity.",
    9: "Use this period for learning, teaching, publishing, and clarifying your worldview.",
    10: "Use this period for career advancement, public role, reputation, and authority.",
    11: "Use this period for networking, community, audience-building, and future planning.",
    12: "Use this period for rest, reflection, private work, and spiritual practice.",
  };

  let recommendation = baseRecommendations[house] || "Use this period wisely.";

  if (isRetrograde) {
    recommendation += " The retrograde motion suggests reviewing, refining, or completing unfinished work in this area.";
  }

  return recommendation;
}
