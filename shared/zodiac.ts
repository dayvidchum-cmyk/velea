/**
 * Zodiac sign ordering (0-indexed)
 */
export const ZODIAC_SIGNS = [
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
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

/**
 * Get the index of a zodiac sign (0-11)
 */
export function getSignIndex(sign: string): number {
  const index = ZODIAC_SIGNS.indexOf(sign as ZodiacSign);
  if (index === -1) {
    throw new Error(`Invalid zodiac sign: ${sign}`);
  }
  return index;
}

/**
 * Convert a transit sign to house number using Whole Sign house system
 * 
 * In Whole Sign houses, each house corresponds to one zodiac sign.
 * The 1st house is the Lagna sign, and subsequent houses follow zodiac order.
 * 
 * @param lagnaSign - The Lagna (Ascendant) sign
 * @param transitSign - The sign where the planet is transiting
 * @returns House number (1-12)
 * 
 * @example
 * // Virgo Lagna, Venus in Aries
 * getHouseFromSign("Virgo", "Aries") // Returns 8
 * 
 * // Virgo Lagna, Venus in Taurus
 * getHouseFromSign("Virgo", "Taurus") // Returns 9
 */
export function getHouseFromSign(lagnaSign: string, transitSign: string): number {
  const lagnaIndex = getSignIndex(lagnaSign);
  const transitIndex = getSignIndex(transitSign);
  
  // Calculate the distance from Lagna sign to transit sign
  // House 1 is the Lagna sign itself (distance 0)
  // House 2 is the next sign (distance 1), etc.
  const distance = (transitIndex - lagnaIndex + 12) % 12;
  
  // House number is distance + 1 (since houses are 1-12, not 0-11)
  return distance + 1;
}
