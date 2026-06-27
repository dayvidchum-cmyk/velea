/**
 * Annual Profection Year Calculator
 * 
 * Calculates the activated house, sign, and Time Lord for a given profection year.
 * Profection years run from birthday to birthday (not calendar year).
 */

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SIGN_RULERS: Record<string, string> = {
  "Aries": "Mars",
  "Taurus": "Venus",
  "Gemini": "Mercury",
  "Cancer": "Moon",
  "Leo": "Sun",
  "Virgo": "Mercury",
  "Libra": "Venus",
  "Scorpio": "Mars",
  "Sagittarius": "Jupiter",
  "Capricorn": "Saturn",
  "Aquarius": "Saturn",
  "Pisces": "Jupiter"
};

const HOUSE_THEMES: Record<number, string> = {
  1: "identity, body, visibility, self-direction, personal agency",
  2: "money, values, resources, voice, self-worth, material stability",
  3: "communication, learning, writing, repetition, siblings, local movement, skill-building",
  4: "home, emotional foundation, family, privacy, roots, inner stability",
  5: "creativity, romance, pleasure, children, visibility through self-expression",
  6: "work, service, health routines, discipline, repair, problem-solving, daily systems",
  7: "relationships, clients, agreements, public exchange, partnership dynamics",
  8: "shared resources, debt, inheritance, intimacy, endings, transformation, hidden pressure",
  9: "belief systems, teaching, publishing, higher learning, worldview, long-range direction",
  10: "career, reputation, visibility, public role, authority, achievement",
  11: "networks, community, gains, audience, friendships, future plans",
  12: "rest, withdrawal, subconscious patterns, closure, private work, spiritual retreat"
};

const PLANETARY_THEMES: Record<string, string> = {
  "Sun": "visibility, identity, authority, leadership, recognition",
  "Moon": "emotion, responsiveness, care, fluctuation, instinct, nourishment",
  "Mars": "action, assertion, conflict, cutting, protection, urgency",
  "Mercury": "communication, analysis, learning, writing, systems, trade",
  "Jupiter": "growth, wisdom, teaching, ethics, expansion, guidance",
  "Venus": "beauty, value, refinement, attraction, art, pleasure, relationship to desire",
  "Saturn": "discipline, responsibility, limits, time, structure, maturity"
};

export interface ProfectionData {
  age: number;
  ageModulo: number;
  activatedHouse: number;
  activatedSign: string;
  timeLord: string;
  yearStart: string; // YYYY-MM-DD
  yearEnd: string;   // YYYY-MM-DD
  lagnaSign: string;
  houseThemes: string;
  planetaryThemes: string;
}

/**
 * Calculate the profection year for a given date
 * @param birthDate Birth date in YYYY-MM-DD format
 * @param currentDate Current date in YYYY-MM-DD format
 * @param lagnaSign User's Lagna/Ascendant sign
 * @returns Profection data for the year containing currentDate
 */
export function calculateProfectionYear(
  birthDate: string,
  currentDate: string,
  lagnaSign: string
): ProfectionData {
  // Parse dates
  const birth = new Date(birthDate);
  const current = new Date(currentDate);

  // Calculate age at the start of the profection year
  // The profection year starts on the user's birthday
  let profectionYearStart = new Date(birth);
  profectionYearStart.setFullYear(current.getFullYear());

  // If the birthday hasn't occurred yet this year, use last year's birthday
  if (profectionYearStart > current) {
    profectionYearStart.setFullYear(current.getFullYear() - 1);
  }

  // Calculate age at profection year start
  const age = profectionYearStart.getFullYear() - birth.getFullYear();

  // Calculate activated house: age % 12
  // 0 = 1st house, 1 = 2nd house, ..., 11 = 12th house
  const ageModulo = age % 12;
  const activatedHouse = ageModulo === 0 ? 1 : ageModulo + 1;

  // Get the sign of the activated house from the Lagna
  const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSign);
  if (lagnaIndex === -1) {
    throw new Error(`Invalid Lagna sign: ${lagnaSign}`);
  }

  // Calculate the sign at the activated house
  // Lagna is the 1st house, so we offset by (activatedHouse - 1)
  const signIndex = (lagnaIndex + activatedHouse - 1) % 12;
  const activatedSign = ZODIAC_SIGNS[signIndex];

  // Get the Time Lord (planetary ruler) of the activated sign
  const timeLord = SIGN_RULERS[activatedSign];
  if (!timeLord) {
    throw new Error(`No ruler found for sign: ${activatedSign}`);
  }

  // Calculate year end (next birthday - 1 day)
  const yearEnd = new Date(profectionYearStart);
  yearEnd.setFullYear(yearEnd.getFullYear() + 1);
  yearEnd.setDate(yearEnd.getDate() - 1);

  // Format dates as YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    age,
    ageModulo,
    activatedHouse,
    activatedSign,
    timeLord,
    yearStart: formatDate(profectionYearStart),
    yearEnd: formatDate(yearEnd),
    lagnaSign,
    houseThemes: HOUSE_THEMES[activatedHouse] || "",
    planetaryThemes: PLANETARY_THEMES[timeLord] || ""
  };
}

/**
 * Check if a date falls within a profection year
 * @param date Date to check in YYYY-MM-DD format
 * @param yearStart Start of profection year in YYYY-MM-DD format
 * @param yearEnd End of profection year in YYYY-MM-DD format
 * @returns true if date is within the profection year
 */
export function isDateInProfectionYear(
  date: string,
  yearStart: string,
  yearEnd: string
): boolean {
  const d = new Date(date);
  const start = new Date(yearStart);
  const end = new Date(yearEnd);
  return d >= start && d <= end;
}

/**
 * Get all profection years for a date range
 * Useful for handling date ranges that cross the user's birthday
 * @param birthDate Birth date in YYYY-MM-DD format
 * @param startDate Start of range in YYYY-MM-DD format
 * @param endDate End of range in YYYY-MM-DD format
 * @param lagnaSign User's Lagna/Ascendant sign
 * @returns Array of profection data, one for each profection year in the range
 */
export function getProfectionYearsInRange(
  birthDate: string,
  startDate: string,
  endDate: string,
  lagnaSign: string
): ProfectionData[] {
  const profections: ProfectionData[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Start from the first date and iterate through each day
  // to find all unique profection years in the range
  const seenYears = new Set<string>();
  let current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    const profection = calculateProfectionYear(birthDate, dateStr, lagnaSign);
    const yearKey = `${profection.yearStart}-${profection.yearEnd}`;

    if (!seenYears.has(yearKey)) {
      seenYears.add(yearKey);
      profections.push(profection);
      // Jump to the day after this profection year ends
      const nextYearStart = new Date(profection.yearEnd);
      nextYearStart.setDate(nextYearStart.getDate() + 1);
      if (nextYearStart <= end) {
        current = nextYearStart;
      } else {
        break;
      }
    } else {
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
  }

  return profections;
}
