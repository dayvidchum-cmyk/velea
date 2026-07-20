/**
 * Annual Profection Year Interpreter
 * 
 * Generates the 3-section profection year interpretation page.
 * All language is supportive and non-predictive.
 */

import type { ProfectionData } from "./calculator.js";
import type { NatalTimeLordPlacement, NatalChartContract, ProfectionInterpretationContract } from "./types.js";

// Re-export for backward compatibility
export type ProfectionInterpretation = ProfectionInterpretationContract;
export type NatalChart = NatalChartContract;

const HOUSE_INTERPRETATIONS: Record<number, {
  name: string;
  themes: string;
  growth: string;
  friction: string;
}> = {
  1: {
    name: "1st House",
    themes: "identity, body, visibility, self-direction, personal agency",
    growth: "The 1st House brings clarity and confidence. Use this year to step into leadership and visibility. Your authentic self becomes your greatest asset.",
    friction: "Ego, arrogance, or need for constant recognition can create conflict. Burnout from overextension or loss of identity in service to others may occur."
  },
  2: {
    name: "2nd House",
    themes: "money, what you own, what you earn, voice, material stability",
    growth: "The 2nd House brings financial depth and value clarification. Use this year to build security and refine what matters most to you. Speaking your truth becomes easier.",
    friction: "Overattachment to possessions or undervaluing yourself can create stagnation. Greed or scarcity thinking may surface—use as information to recalibrate."
  },
  3: {
    name: "3rd House",
    themes: "communication, learning, writing, repetition, siblings & close circle, local movement, skill-building",
    growth: "The 3rd House brings clarity and communication. Use this year to learn, write, analyze, and trade. Your words and ideas have power.",
    friction: "Overthinking, scattered focus, or communication breakdowns can create confusion. Superficiality or nervous energy may prevent depth."
  },
  4: {
    name: "4th House",
    themes: "home, emotional foundation, family, privacy, roots, inner stability",
    growth: "The 4th House brings emotional security and foundation-building. Use this year to tend to home/family and inner work. Privacy and rest are valuable.",
    friction: "Family drama, isolation, or avoidance of necessary change can create stagnation. Clinging to the past or unhealthy family patterns may intensify."
  },
  5: {
    name: "5th House",
    themes: "creativity, romance, pleasure, children, visibility through self-expression",
    growth: "The 5th House brings beauty and refinement. Use this year to cultivate pleasure, art, and relationships. Your values become clearer and more aligned.",
    friction: "Indulgence, vanity, or overattachment to beauty can create imbalance. Relationship drama or poor judgment with pleasure may surface."
  },
  6: {
    name: "6th House",
    themes: "work, service, health routines, discipline, repair, problem-solving, daily systems",
    growth: "The 6th House brings maturity and structure. Use this year to build lasting foundations. Discipline and responsibility yield real results.",
    friction: "Perfectionism, overwork, or health anxiety can create burnout. Criticism (of self or others) or getting lost in details may prevent seeing the bigger picture."
  },
  7: {
    name: "7th House",
    themes: "relationships, clients, agreements, public exchange, partnership dynamics",
    growth: "The 7th House brings partnership and negotiation. Use this year to strengthen relationships and agreements. Collaboration and public visibility flow naturally.",
    friction: "Codependency, conflict, or poor boundaries can create relationship strain. Projection onto partners or avoiding necessary conversations may intensify."
  },
  8: {
    name: "8th House",
    themes: "shared resources, debt, inheritance, intimacy, endings, transformation, hidden pressure",
    growth: "The 8th House brings depth and transformation. Use this year for research, inheritance matters, and releasing what no longer serves. Hidden knowledge becomes accessible.",
    friction: "Power struggles, financial entanglement, or avoiding necessary endings can create stagnation. Obsession or manipulation may surface—use as invitation to release control."
  },
  9: {
    name: "9th House",
    themes: "belief systems, teaching, publishing, higher learning, worldview, long-range direction",
    growth: "The 9th House brings expansion and wisdom. Use this year to teach, publish, and expand your horizons. Opportunities flow through generosity and vision.",
    friction: "Dogmatism, overconfidence, or spiritual bypassing can create disconnection. Preaching or imposing beliefs may alienate others."
  },
  10: {
    name: "10th House",
    themes: "career, reputation, visibility, public role, authority, achievement",
    growth: "The 10th House brings visibility and authority. Use this year to advance your career and public role. Recognition and leadership opportunities arise naturally.",
    friction: "Overambition, public failure, or loss of reputation can create setback. Obsession with status or climbing at others' expense may backfire."
  },
  11: {
    name: "11th House",
    themes: "networks, community, gains, audience, friendships, future plans",
    growth: "The 11th House brings community and collaboration. Use this year to build networks and achieve goals through others. Gains and opportunities flow through connections.",
    friction: "Superficial friendships, group think, or loss of individuality can create disconnection. Overreliance on others' approval or scattered focus may prevent real progress."
  },
  12: {
    name: "12th House",
    themes: "rest, withdrawal, subconscious patterns, closure, private work, spiritual retreat",
    growth: "The 12th House brings rest and closure. Use this year for meditation, therapy, and releasing patterns. Hidden work and private study bear fruit.",
    friction: "Escapism, isolation, or avoidance can create stagnation. Unresolved trauma, addiction, or self-sabotage may intensify—use as invitation to seek support."
  }
};

const PLANETARY_INTERPRETATIONS: Record<string, {
  themes: string;
  growth: string;
  friction: string;
}> = {
  "Sun": {
    themes: "visibility, identity, authority, leadership, recognition",
    growth: "The Sun brings clarity and confidence. Your authentic self becomes your greatest asset.",
    friction: "Ego, arrogance, or need for constant recognition can create conflict."
  },
  "Moon": {
    themes: "emotion, responsiveness, care, fluctuation, instinct, nourishment",
    growth: "The Moon brings emotional depth and responsiveness. Intuition and emotional intelligence are your guides.",
    friction: "Moodiness, emotional reactivity, or codependency can create instability."
  },
  "Mars": {
    themes: "action, assertion, conflict, cutting, protection, urgency",
    growth: "Mars brings courage and decisive action. Conflict can be productive when channeled wisely.",
    friction: "Aggression, impulsiveness, or unnecessary conflict can create damage."
  },
  "Mercury": {
    themes: "communication, analysis, learning, writing, systems, trade",
    growth: "Mercury brings clarity and communication. Your words and ideas have power.",
    friction: "Overthinking, scattered focus, or communication breakdowns can create confusion."
  },
  "Jupiter": {
    themes: "growth, wisdom, teaching, ethics, expansion, guidance",
    growth: "Jupiter brings expansion and wisdom. Opportunities and luck flow through generosity.",
    friction: "Overexpansion, overconfidence, or excess can create imbalance."
  },
  "Venus": {
    themes: "beauty, value, refinement, attraction, art, pleasure, relationship to desire",
    growth: "Venus brings beauty and refinement. Your values become clearer and more aligned.",
    friction: "Indulgence, vanity, or overattachment to beauty can create imbalance."
  },
  "Saturn": {
    themes: "discipline, responsibility, limits, time, structure, maturity",
    growth: "Saturn brings maturity and structure. Discipline and responsibility yield real results.",
    friction: "Restriction, fear, or excessive self-criticism can create heaviness."
  },
  "Rahu": {
    themes: "expansion, ambition, worldly gain, obsession, illusion, shadow desires",
    growth: "Rahu brings ambition and expansion. Channel desires toward meaningful goals.",
    friction: "Obsession, illusion, or chasing empty gains can create confusion."
  },
  "Ketu": {
    themes: "release, detachment, spiritual insight, loss, completion, hidden knowledge",
    growth: "Ketu brings wisdom through release. Hidden knowledge and closure become accessible.",
    friction: "Detachment, loss of motivation, or spiritual bypassing can create stagnation."
  }
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const SIGN_THEMES: Record<string, string> = {
  "Aries": "initiative, courage, directness, pioneering energy",
  "Taurus": "stability, values, sensuality, material grounding",
  "Gemini": "communication, adaptability, curiosity, mental agility",
  "Cancer": "emotional depth, nurturing, family, inner security",
  "Leo": "creativity, self-expression, generosity, visibility",
  "Virgo": "discernment, service, refinement, practical wisdom",
  "Libra": "balance, relationships, aesthetics, fairness",
  "Scorpio": "depth, transformation, intensity, hidden power",
  "Sagittarius": "expansion, wisdom, vision, philosophical direction",
  "Capricorn": "discipline, structure, authority, long-term building",
  "Aquarius": "innovation, community, idealism, future-oriented thinking",
  "Pisces": "intuition, compassion, dissolution, spiritual connection"
};

/**
 * Generate the 3-section profection year interpretation
 * 
 * @param profection - The profection year data (house, sign, time lord, dates)
 * @param natalChart - Complete natal chart with all planet data
 */
export function generateProfectionInterpretation(
  profection: ProfectionData,
  natalChart: NatalChartContract
): ProfectionInterpretationContract {
  const houseInfo = HOUSE_INTERPRETATIONS[profection.activatedHouse];
  const planetInfo = PLANETARY_INTERPRETATIONS[profection.timeLord];
  const signThemes = SIGN_THEMES[profection.activatedSign] || profection.activatedSign.toLowerCase();

  if (!houseInfo || !planetInfo) {
    throw new Error(`Missing interpretation data for house ${profection.activatedHouse} or planet ${profection.timeLord}`);
  }

  // Find the natal placement of the Time Lord
  const timeLordNatal = natalChart.bodies.find(b => b.planet === profection.timeLord);
  
  // FAIL EXPLICITLY if natal Time Lord placement is missing
  if (!timeLordNatal) {
    throw new Error(`Complete birth chart data is required.`);
  }
  
  // Build natal context string
  const nakshatraStr = timeLordNatal.nakshatra ? ` in ${timeLordNatal.nakshatra}` : "";
  const padaStr = timeLordNatal.pada ? ` (Pada ${timeLordNatal.pada})` : "";
  const natContext = ` Your natal ${profection.timeLord} is in ${timeLordNatal.sign} at ${timeLordNatal.degree}°${nakshatraStr}${padaStr} in the ${ordinal(timeLordNatal.house)} house, anchoring this year's work in that foundation.`;

  // Build operational chain with proper ordinal formatting
  const activatedHouseOrdinal = ordinal(profection.activatedHouse);
  const natalHouseOrdinal = ordinal(timeLordNatal.house);
  const operationalChain = `${activatedHouseOrdinal} House\n↓\n${profection.activatedSign}\n↓\nthrough ${profection.timeLord}\n↓\nexpressed through natal ${profection.timeLord} in ${timeLordNatal.sign} / ${natalHouseOrdinal} House / ${timeLordNatal.nakshatra}`;

  // Section 5: Yearly Focus — operational and concise
  const section5 = `Your attention shifts to ${houseInfo.themes.split(', ').slice(0, 2).join(' and ')}.${natContext} This year emphasizes ${houseInfo.themes.toLowerCase()}. Work with ${profection.timeLord}'s natural strengths to navigate this focus.`;

  // Section 6: What Supports Growth — behavior-oriented, no repetition
  const primaryTheme = houseInfo.themes.split(', ')[0];
  const natalSignThemes = timeLordNatal ? SIGN_THEMES[timeLordNatal.sign] || timeLordNatal.sign.toLowerCase() : '';
  const section6 = `• ${planetInfo.growth}
• Your natal ${profection.timeLord} in ${timeLordNatal?.sign || 'unknown'} (${natalHouseOrdinal} House) brings ${natalSignThemes.toLowerCase()} to this work
• Prioritize ${primaryTheme}
• Build concrete practices aligned with this focus
• Track progress through measurable outcomes`;

  // Section 7: What Creates Friction — diagnostic, not predictive
  const section7 = `• ${planetInfo.friction}
• ${houseInfo.friction}
• Your natal ${profection.timeLord} in ${timeLordNatal?.nakshatra || 'unknown'} may amplify these patterns—observe without judgment
• Watch for overextension in ${primaryTheme}
• Use friction as diagnostic information`;

  // Quick Reference — compact, scannable
  const quickReference = `Age ${profection.age}: ${activatedHouseOrdinal} House (${profection.activatedSign})\nTime Lord: ${profection.timeLord}\nPeriod: ${profection.yearStart} – ${profection.yearEnd}\nFocus: ${primaryTheme}`;

  return {
    operationalChain,
    section5,
    section6,
    section7,
    quickReference
  };
}
