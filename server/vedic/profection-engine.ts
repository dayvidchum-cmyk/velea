import { VedicNatalChart } from "./natal-chart-engine";

/**
 * LAYER 2: PROFECTION CALCULATION ENGINE
 *
 * Purpose: Calculate profection year data using accurate natal chart from LAYER 1.
 * This layer ONLY calculates profection logic with no interpretation.
 *
 * Uses natal chart data to determine:
 * - Current profection year (based on age)
 * - Activated house
 * - Time Lord (ruling planet)
 * - Sub Time Lord
 */

export interface ProfectionData {
  age: number;
  activatedHouseNumber: number;
  activatedHouseSign: string;
  timeLord: string;
  timeLordSign: string;
  timeLordHouse: number;
  subTimeLord: string;
  subTimeLordSign: string;
  subTimeLordHouse: number;
  yearStart: string;
  yearEnd: string;
}

// Planetary rulers in order (for profection calculation)
const PLANETARY_RULERS = [
  "Sun",
  "Venus",
  "Mercury",
  "Moon",
  "Saturn",
  "Jupiter",
  "Mars",
];

// Planet name to chart key mapping
const PLANET_NAME_TO_KEY: Record<string, string> = {
  Sun: "sun",
  Moon: "moon",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Rahu: "rahu",
  Ketu: "ketu",
};

/**
 * Calculate profection year data
 *
 * @param natalChart - Natal chart from LAYER 1
 * @param currentDate - Current date for age calculation
 * @returns Profection data with no interpretation
 */
export function calculateProfection(
  natalChart: VedicNatalChart,
  currentDate: Date = new Date()
): ProfectionData {
  // NOTE: This legacy engine (server/vedic/profection-engine.ts) is not used in production routes.
  // Production profection calculations use server/profection/calculator.ts instead.
  // The hardcoded 1982-04-13 birth date has been removed. This function now requires
  // the caller to pass the correct currentDate for age-based calculations.
  // Without a birth date on the chart type, we cannot compute age accurately here.
  // Use server/profection/calculator.ts#calculateProfectionYear for production use.
  const birthDate = currentDate; // Placeholder — age will be 0, results are not meaningful

  // Calculate age
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff =
    currentDate.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // In profection, the cycle starts at age 0 = 1st house
  // Age 0-11 = 1st house, Age 12-23 = 2nd house, etc.
  // So: (age % 12) gives 0-11, and we add 1 to get house 1-12
  // But the mapping is: 0->1st, 1->2nd, ..., 8->9th, ..., 11->12th
  // So: activatedHouseNumber = (age % 12) + 1
  const activatedHouseNumber = (age % 12) + 1;
  const activatedHouse = natalChart.houses[activatedHouseNumber - 1];

  // Get the ruler of the activated house (the sign in that house)
  // We need to find which planet rules that sign
  const houseSign = activatedHouse.sign;

  // Find the planet that rules the activated house sign
  const timeLordPlanet = getPlanetRulingSign(houseSign);
  const timeLordKey = PLANET_NAME_TO_KEY[timeLordPlanet];
  const timeLordData = natalChart.planets[timeLordKey];

  // Get sub time lord (next planet in sequence)
  const timeLordIndex = PLANETARY_RULERS.indexOf(timeLordPlanet);
  const subTimeLordPlanet =
    PLANETARY_RULERS[(timeLordIndex + 1) % PLANETARY_RULERS.length];
  const subTimeLordKey = PLANET_NAME_TO_KEY[subTimeLordPlanet];
  const subTimeLordData = natalChart.planets[subTimeLordKey];

  // Calculate year dates (from birth date anniversary)
  const yearStart = new Date(
    currentDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );
  if (yearStart > currentDate) {
    yearStart.setFullYear(yearStart.getFullYear() - 1);
  }
  const yearEnd = new Date(yearStart);
  yearEnd.setFullYear(yearEnd.getFullYear() + 1);

  return {
    age,
    activatedHouseNumber,
    activatedHouseSign: houseSign,
    timeLord: timeLordPlanet,
    timeLordSign: timeLordData.sign,
    timeLordHouse: timeLordData.house,
    subTimeLord: subTimeLordPlanet,
    subTimeLordSign: subTimeLordData.sign,
    subTimeLordHouse: subTimeLordData.house,
    yearStart: yearStart.toISOString().split("T")[0],
    yearEnd: yearEnd.toISOString().split("T")[0],
  };
}

/**
 * Get the planet that rules a zodiac sign
 */
function getPlanetRulingSign(sign: string): string {
  const rulers: Record<string, string> = {
    Aries: "Mars",
    Taurus: "Venus",
    Gemini: "Mercury",
    Cancer: "Moon",
    Leo: "Sun",
    Virgo: "Mercury",
    Libra: "Venus",
    Scorpio: "Mars",
    Sagittarius: "Jupiter",
    Capricorn: "Saturn",
    Aquarius: "Saturn",
    Pisces: "Jupiter",
  };

  return rulers[sign] || "Sun";
}

/**
 * Get the house number where a planet is located
 */
function getPlanetHouse(
  natalChart: VedicNatalChart,
  planetName: string
): number {
  const planetKey = PLANET_NAME_TO_KEY[planetName];
  if (!planetKey) return 1;

  const planet = natalChart.planets[planetKey];
  return planet?.house || 1;
}
