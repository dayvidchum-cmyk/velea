/**
 * MEANING SYNTHESIS ENGINE
 *
 * Generates "Expected Meaning" for profection years using structured interpretation libraries.
 * Synthesizes meaning from: activated house, activated sign, Time Lord, and natal Time Lord placement.
 *
 * Output style: operational, psychologically-grounded, modern, structured.
 * Avoids: mysticism, fate language, certainty statements, doom language.
 */

import type { ProfectionData } from "./profection-engine";
import type { VedicNatalChart } from "./natal-chart-engine";

export interface ExpectedMeaning {
  emphasis: string;
  natalAnchor: string;
  supportsFocus: string[];
  potentialFriction: string[];
}

// House themes for meaning synthesis
const HOUSE_THEMES: Record<number, { name: string; themes: string[] }> = {
  1: { name: "1st House", themes: ["identity", "self-direction", "personal agency", "visibility"] },
  2: { name: "2nd House", themes: ["values", "resources", "self-worth", "voice"] },
  3: { name: "3rd House", themes: ["communication", "learning", "skill-building", "local connections"] },
  4: { name: "4th House", themes: ["emotional foundation", "home", "family", "roots"] },
  5: { name: "5th House", themes: ["creativity", "self-expression", "pleasure", "visibility"] },
  6: { name: "6th House", themes: ["work", "health routines", "problem-solving", "discipline"] },
  7: { name: "7th House", themes: ["partnerships", "agreements", "collaboration", "public exchange"] },
  8: { name: "8th House", themes: ["transformation", "shared resources", "intimacy", "depth"] },
  9: { name: "9th House", themes: ["belief systems", "higher learning", "teaching", "worldview"] },
  10: { name: "10th House", themes: ["career", "public role", "achievement", "authority"] },
  11: { name: "11th House", themes: ["networks", "community", "collaboration", "future direction"] },
  12: { name: "12th House", themes: ["rest", "spiritual work", "closure", "private reflection"] },
};

// Planetary themes for meaning synthesis
const PLANET_THEMES: Record<string, { themes: string[]; focus: string[] }> = {
  Sun: {
    themes: ["clarity", "confidence", "leadership", "authenticity"],
    focus: ["stepping into visibility", "authentic self-expression", "leadership opportunities"],
  },
  Moon: {
    themes: ["emotional depth", "responsiveness", "intuition", "nourishment"],
    focus: ["emotional intelligence", "nurturing relationships", "instinctive guidance"],
  },
  Mercury: {
    themes: ["communication", "analysis", "learning", "systems"],
    focus: ["clear communication", "skill development", "intellectual growth"],
  },
  Venus: {
    themes: ["refinement", "values alignment", "relationship quality", "aesthetic sense"],
    focus: ["cultivating pleasure", "value clarification", "relationship depth"],
  },
  Mars: {
    themes: ["decisive action", "assertion", "courage", "cutting away"],
    focus: ["clear boundaries", "productive action", "removing obstacles"],
  },
  Jupiter: {
    themes: ["expansion", "wisdom", "generosity", "opportunity"],
    focus: ["teaching and sharing", "expanding horizons", "ethical growth"],
  },
  Saturn: {
    themes: ["maturity", "structure", "discipline", "lasting foundations"],
    focus: ["building sustainable systems", "taking responsibility", "long-term planning"],
  },
  Rahu: {
    themes: ["growth edge", "ambition", "new territory", "expansion"],
    focus: ["exploring new areas", "ambitious projects", "stepping beyond comfort"],
  },
  Ketu: {
    themes: ["release", "wisdom", "completion", "letting go"],
    focus: ["releasing what no longer serves", "integrating lessons", "spiritual refinement"],
  },
};

// Sign themes for meaning synthesis
const SIGN_THEMES: Record<string, string[]> = {
  Aries: ["initiative", "courage", "directness", "pioneering"],
  Taurus: ["stability", "values", "sensuality", "persistence"],
  Gemini: ["communication", "flexibility", "learning", "connection"],
  Cancer: ["emotional security", "nurturing", "intuition", "protection"],
  Leo: ["self-expression", "creativity", "generosity", "visibility"],
  Virgo: ["discernment", "service", "refinement", "practical wisdom"],
  Libra: ["balance", "relationship", "aesthetics", "diplomacy"],
  Scorpio: ["depth", "transformation", "intensity", "truth-seeking"],
  Sagittarius: ["expansion", "wisdom", "optimism", "exploration"],
  Capricorn: ["structure", "responsibility", "achievement", "maturity"],
  Aquarius: ["innovation", "community", "ideals", "independence"],
  Pisces: ["compassion", "spirituality", "dissolution", "transcendence"],
};

/**
 * Generate Expected Meaning for a profection year
 *
 * Synthesizes meaning from:
 * 1. Activated house themes
 * 2. Activated sign themes
 * 3. Time Lord themes
 * 4. Natal Time Lord house placement
 * 5. Natal Time Lord sign themes
 */
export function generateExpectedMeaning(
  profection: ProfectionData,
  natalChart: VedicNatalChart
): ExpectedMeaning {
  const houseInfo = HOUSE_THEMES[profection.activatedHouseNumber];
  const planetInfo = PLANET_THEMES[profection.timeLord];
  const signThemes = SIGN_THEMES[profection.activatedHouseSign] || [];

  if (!houseInfo || !planetInfo) {
    throw new Error(
      `Missing interpretation data for house ${profection.activatedHouseNumber} or planet ${profection.timeLord}`
    );
  }

  // Get natal Time Lord data
  const timeLordKey = profection.timeLord.toLowerCase();
  const natalTimeLord = natalChart.planets[timeLordKey];
  const natalTimeLordSign = natalTimeLord?.sign || "Unknown";
  const natalTimeLordHouse = natalTimeLord?.house || 1;

  // === EMPHASIS ===
  // Synthesize from: activated house + activated sign + Time Lord
  const houseThemesStr = houseInfo.themes.slice(0, 2).join(" and ");
  const signThemesStr = signThemes.slice(0, 2).join(" and ");
  const planetThemesStr = planetInfo.themes.slice(0, 2).join(" and ");

  const emphasis = `This year emphasizes ${houseThemesStr} through a lens of ${signThemesStr}. The ${profection.timeLord} as your Time Lord brings ${planetThemesStr} to this focus area.`;

  // === NATAL ANCHOR ===
  // Synthesize from: natal Time Lord house + sign
  const natalSignThemes = SIGN_THEMES[natalTimeLordSign] || [];
  const natalSignStr = natalSignThemes.slice(0, 2).join(" and ");

  const natalAnchor = `Your natal ${profection.timeLord} is in the ${natalTimeLordHouse}th house (${natalTimeLordSign}), which adds emphasis to ${natalSignStr}. This natal placement shapes how the annual themes will unfold for you.`;

  // === SUPPORTS FOCUS ===
  // Practical areas where energy flows naturally
  const supportsFocus = [
    ...planetInfo.focus.slice(0, 2),
    `Strengthening ${houseInfo.themes[0].toLowerCase()}`,
  ];

  // === POTENTIAL FRICTION ===
  // Imbalances and overextensions to watch for
  const potentialFriction = [
    `Overextending in ${houseInfo.themes[0].toLowerCase()} without sustainable boundaries`,
    `Confusing ${profection.timeLord}'s themes with certainty—use as guidance, not guarantees`,
    `Neglecting the grounding influence of your natal ${profection.timeLord} placement`,
  ];

  return {
    emphasis,
    natalAnchor,
    supportsFocus,
    potentialFriction,
  };
}
