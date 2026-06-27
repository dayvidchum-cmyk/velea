/**
 * INTERPRETATION LAYER — Kala / Celestial Field Notes
 *
 * Architecture (Base Mode + Qualifier):
 *   1. Moon sign → house from Lagna → BASE MODE (primary, not overrideable by single modifier)
 *   2. Nakshatra → QUALIFIER (how the mode expresses itself)
 *   3. Tithi → PACING QUALIFIER (intensity/direction of expression)
 *   4. Field Condition → diagnostic only (no longer triggers mode flips)
 *   5. finalMode = baseMode for all non-Flex modes (flips removed)
 *
 * Mode flip rule:
 *   Mode flips have been removed to preserve Lagna-based personalization.
 *   The qualifier layer (nakshatra + tithi) captures nuance without overriding
 *   the house-derived baseMode. finalMode === baseMode for all non-Flex modes.
 *
 * Outwardness scale (for diagnostics only, not for rounding):
 *   Restraint = 0, Selective = 1, Build = 2, Action = 3
 *
 * This module does NOT calculate astronomy.
 * It only applies meaning to the sky data.
 */

import type { AstronomyData } from './astronomy.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayMode = 'Action' | 'Build' | 'Selective' | 'Restraint' | 'Flex';
export type FinalMode = 'Action' | 'Build' | 'Selective' | 'Restraint';
export type FieldCondition = 'Open' | 'Neutral' | 'Restricted';

export interface NakshatraModifier {
  name: string;
  behavioralQuality: string;
  supports: string[];
  avoid: string[];
  modifierTags: string[];
  toneModifier: string;
}

export interface TithiPacing {
  tithi: string;
  paksha: 'Shukla' | 'Krishna';
  /** 'waxing' | 'waning' */
  phase: 'waxing' | 'waning';
  pacingLabel: string;
  pacingNote: string;
}

export interface ModeReason {
  baseMode: DayMode;
  baseScore: number;
  nakshatraModifier: number;
  nakshatraReason: string;
  tithiModifier: number;
  tithiReason: string;
  fieldCondition: FieldCondition;
  fieldModifier: number;
  fieldReason: string;
  /** Diagnostic score only — not used to determine finalMode */
  finalScore: number;
  finalMode: FinalMode;
  /** Human-readable qualifier describing how the mode expresses itself */
  qualifier: string;
  explanation: string;
}

export interface DayField {
  date: string;
  dayOfWeek: string;
  moonSign: string;
  houseActivated: number;
  nakshatra: string;
  nakshatraPada: number;
  tithi: string;
  tithiPaksha: 'Shukla' | 'Krishna';
  sunriseLocal: string;
  /** Legacy field — now equals finalMode for backward compatibility */
  mode: FinalMode;
  /** Base mode from house alone (before modifiers) */
  baseMode: DayMode;
  /** Final mode after all modifiers applied (equals baseMode in most cases) */
  finalMode: FinalMode;
  /** Human-readable qualifier, e.g. 'Assertive Restraint', 'Productive Build' */
  qualifier: string;
  instruction: string;
  /** Full modifier chain explanation */
  modeReason: ModeReason;
  /** Layer 2: Nakshatra behavioral modifier */
  nakshatraModifier: NakshatraModifier;
  /** Layer 3: Tithi pacing modifier */
  tithiPacing: TithiPacing;
  /** Nakshatra active at sunrise */
  nakshatraAtSunrise: string;
  /** Local time when the nakshatra changes mid-day. null if no transition. */
  nakshatraTransitionTime: string | null;
  /** Nakshatra name after the transition. null if no transition. */
  nakshatraAfterTransition: string | null;
  /** Ascendant (Lagna) sign used for this calculation, e.g. 'Virgo'. null when user has no birth chart. */
  lagnaSign?: string | null;
}

// ─── Outwardness Scale (diagnostic only) ────────────────────────────────────
// These scores are used for diagnostics display only.
// They do NOT determine finalMode — rule-based logic does.

const MODE_SCORE: Record<string, number> = {
  Restraint: 0,
  Selective: 1,
  Build: 2,
  Action: 3,
};

const SCORE_TO_MODE: FinalMode[] = ['Restraint', 'Selective', 'Build', 'Action'];

/** Clamp for diagnostic score display only. Never used to set finalMode. */
function clampScore(score: number): number {
  return Math.max(0, Math.min(3, Math.round(score)));
}

// ─── Sign-to-index map ────────────────────────────────────────────────────────

const SIGN_INDEX: Record<string, number> = {
  Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
  Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
};

// ─── House calculation ────────────────────────────────────────────────────────

export function moonSignToHouse(moonSignIndex: number, lagnaSign: string): number {
  const lagnaIndex = SIGN_INDEX[lagnaSign];
  if (lagnaIndex === undefined) throw new Error(`Unknown lagna sign: ${lagnaSign}`);
  return ((moonSignIndex - lagnaIndex + 12) % 12) + 1;
}

// ─── House-to-mode mapping (Base Mode) ───────────────────────────────────────

const HOUSE_MODE: Record<number, DayMode> = {
  1: 'Action',
  2: 'Flex',
  3: 'Build',
  4: 'Restraint',
  5: 'Selective',
  6: 'Build',
  7: 'Selective',
  8: 'Restraint',
  9: 'Flex',
  10: 'Action',
  11: 'Action',
  12: 'Restraint',
};

// ─── Mode base instructions ───────────────────────────────────────────────────

const MODE_BASE_INSTRUCTIONS: Record<string, string> = {
  Action:
    'Use this day for visible movement — publish, reach out, make decisions, and initiate.',
  Build:
    'Prioritize preparation, editing, and systems work. Strengthen the container.',
  Selective:
    'Move existing threads forward — warm leads, active conversations, and follow-ups only.',
  Restraint:
    'Keep this contained. Repair, stabilize, and reduce exposure. Do not force outcomes.',
  Flex:
    'Use judgment. Lean Action if you have clear momentum; lean Build if you need structure.',
};

// ─── Nakshatra Mode Modifier Categories ──────────────────────────────────────
// These determine how each nakshatra shifts the base mode score.

/** Expansion / outward movement nakshatras: upgrade +1 */
const NAKSHATRA_UPGRADE: string[] = [
  'Purva Ashadha', 'Rohini', 'Pushya', 'Purva Phalguni', 'Vishakha',
  'Ashwini', 'Magha', 'Swati', 'Dhanishta',
];

/** Correction / containment nakshatras: downgrade -1 */
const NAKSHATRA_DOWNGRADE: string[] = [
  'Ashlesha', 'Jyeshtha', 'Mula', 'Ardra', 'Purva Bhadrapada',
  'Bharani',
];

/** Precision / selective nakshatras: shift toward Selective (score → 1) */
const NAKSHATRA_SELECTIVE: string[] = [
  'Hasta', 'Chitra', 'Anuradha', 'Shravana', 'Shatabhisha',
  'Uttara Phalguni', 'Uttara Ashadha',
];

/**
 * Calculate the nakshatra mode modifier score.
 * Returns a value between -1 and +1.
 */
function getNakshatraModeModifier(nakshatra: string): { score: number; reason: string } {
  if (NAKSHATRA_UPGRADE.includes(nakshatra)) {
    return { score: +1, reason: `${nakshatra} supports expansion/outward movement (+1)` };
  }
  if (NAKSHATRA_DOWNGRADE.includes(nakshatra)) {
    return { score: -1, reason: `${nakshatra} supports containment/correction (-1)` };
  }
  if (NAKSHATRA_SELECTIVE.includes(nakshatra)) {
    return { score: 0, reason: `${nakshatra} supports precision/selective action (→ Selective bias)` };
  }
  // Neutral nakshatras: no modifier
  return { score: 0, reason: `${nakshatra} is neutral (no mode shift)` };
}

/**
 * For selective nakshatras, we apply a special rule:
 * If the base score is above Selective (1), pull it toward 1.
 * If the base score is below Selective (1), push it toward 1.
 * This is applied as a separate adjustment after the main scoring.
 */
function applySelectiveBias(currentScore: number, nakshatra: string): number {
  if (!NAKSHATRA_SELECTIVE.includes(nakshatra)) return currentScore;
  // Pull toward Selective (1)
  if (currentScore > 1) return currentScore - 0.5;
  if (currentScore < 1) return currentScore + 0.5;
  return currentScore;
}

// ─── Tithi Mode Modifier ─────────────────────────────────────────────────────

/** Strong restraint/discipline tithis that downgrade */
const STRONG_RESTRAINT_TITHIS = ['Ekadashi', 'Ashtami', 'Chaturdashi', 'Amavasya'];

/**
 * Calculate the tithi mode modifier.
 * Waxing supports outward movement (+0.5), waning supports inward (-0.5).
 * Strong restraint tithis get an additional -0.5.
 */
function getTithiModeModifier(tithi: string, paksha: 'Shukla' | 'Krishna'): { score: number; reason: string } {
  const isWaxing = paksha === 'Shukla';
  let score = isWaxing ? +0.5 : -0.5;
  let reason = isWaxing
    ? 'Waxing tithi supports outward movement (+0.5)'
    : 'Waning tithi supports inward movement (-0.5)';

  // Check for strong restraint tithis
  const tithiName = tithi.replace(/^(Shukla|Krishna)\s+/, '');
  if (STRONG_RESTRAINT_TITHIS.some(t => tithiName.includes(t) || tithi.includes(t))) {
    score -= 0.5;
    reason += ` | ${tithiName} is a strong discipline tithi (-0.5 additional)`;
  }

  return { score, reason };
}

// ─── Field Condition ─────────────────────────────────────────────────────────

/**
 * Determine field condition based on combined nakshatra + tithi signals.
 *
 * Open: upgrade nakshatra + waxing tithi
 * Restricted: downgrade nakshatra + waning tithi + strong restraint tithi
 * Neutral: everything else
 */
function determineFieldCondition(
  nakshatra: string,
  tithi: string,
  paksha: 'Shukla' | 'Krishna'
): { condition: FieldCondition; modifier: number; reason: string } {
  const isUpgrade = NAKSHATRA_UPGRADE.includes(nakshatra);
  const isDowngrade = NAKSHATRA_DOWNGRADE.includes(nakshatra);
  const isWaxing = paksha === 'Shukla';
  const tithiName = tithi.replace(/^(Shukla|Krishna)\s+/, '');
  const isStrongRestraint = STRONG_RESTRAINT_TITHIS.some(t => tithiName.includes(t) || tithi.includes(t));

  // Open: upgrade nakshatra + waxing tithi (both signals align outward)
  if (isUpgrade && isWaxing && !isStrongRestraint) {
    return {
      condition: 'Open',
      modifier: 0, // Already accounted for in individual modifiers; Open just permits the upgrade
      reason: 'Field Open: nakshatra and tithi both support outward movement',
    };
  }

  // Restricted: downgrade nakshatra + waning + strong restraint tithi
  if (isDowngrade && !isWaxing && isStrongRestraint) {
    return {
      condition: 'Restricted',
      modifier: -1,
      reason: 'Field Restricted: nakshatra, tithi phase, and tithi name all signal containment (-1)',
    };
  }

  // Restricted (lighter): downgrade nakshatra + strong restraint tithi
  if (isDowngrade && isStrongRestraint) {
    return {
      condition: 'Restricted',
      modifier: -0.5,
      reason: 'Field Restricted: downgrade nakshatra + strong discipline tithi (-0.5)',
    };
  }

  // Neutral
  return {
    condition: 'Neutral',
    modifier: 0,
    reason: 'Field Neutral: no strong combined signal',
  };
}

// ─── Flex Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve Flex base mode into a numeric score based on modifiers.
 * Flex = 2 (Build level) but can shift based on context.
 * - If upward modifiers dominate → Build (2)
 * - If selective/caution modifiers dominate → Selective (1)
 * - If no clear signal → Selective (1)
 */
function resolveFlexScore(nakshatra: string, paksha: 'Shukla' | 'Krishna'): number {
  const isUpgrade = NAKSHATRA_UPGRADE.includes(nakshatra);
  const isWaxing = paksha === 'Shukla';

  if (isUpgrade && isWaxing) return 2; // Build
  if (isUpgrade || isWaxing) return 2; // Build (one upward signal)
  return 1; // Selective (default for ambiguous)
}

// ─── Nakshatra behavioral library ────────────────────────────────────────────
// Source: Kala Nakshatra Interpretation Library
// These are operational behavioral modifiers, NOT predictive meanings.

const NAKSHATRA_LIBRARY: Record<string, NakshatraModifier> = {
  Ashwini: {
    name: 'Ashwini',
    behavioralQuality: 'fast-moving, initiating, impulsive, energizing',
    supports: ['starting', 'movement', 'quick decisions', 'outreach', 'experimentation'],
    avoid: ['rushing', 'lack of follow-through', 'impulsive reactions'],
    modifierTags: ['fast-paced', 'high initiation', 'light structure recommended'],
    toneModifier: 'Move quickly, but avoid acting without enough structure.',
  },
  Bharani: {
    name: 'Bharani',
    behavioralQuality: 'pressure, responsibility, emotional weight, containment',
    supports: ['difficult decisions', 'boundaries', 'disciplined work', 'accountability'],
    avoid: ['overload', 'emotional excess', 'forcing outcomes'],
    modifierTags: ['heavy', 'constraint', 'measured pacing'],
    toneModifier: 'Move carefully and avoid unnecessary pressure.',
  },
  Krittika: {
    name: 'Krittika',
    behavioralQuality: 'sharp, refining, decisive, cutting',
    supports: ['editing', 'refinement', 'clarity', 'removing excess'],
    avoid: ['harshness', 'overcorrection', 'conflict escalation'],
    modifierTags: ['precise', 'high discernment', 'clarity-focused'],
    toneModifier: 'Simplify and refine rather than expand.',
  },
  Rohini: {
    name: 'Rohini',
    behavioralQuality: 'attractive, fertile, magnetic, growth-oriented',
    supports: ['visibility', 'aesthetics', 'relationship-building', 'creation'],
    avoid: ['indulgence', 'attachment', 'overextension'],
    modifierTags: ['magnetic', 'growth-supportive', 'soft expansion'],
    toneModifier: 'Build steadily and allow attention to gather naturally.',
  },
  Mrigashira: {
    name: 'Mrigashira',
    behavioralQuality: 'searching, exploratory, curious, unsettled',
    supports: ['research', 'testing', 'brainstorming', 'gathering information'],
    avoid: ['scattering attention', 'indecision', 'chasing too many directions'],
    modifierTags: ['experimental', 'restless', 'discovery-oriented'],
    toneModifier: 'Explore possibilities without forcing conclusions.',
  },
  Ardra: {
    name: 'Ardra',
    behavioralQuality: 'intense, disruptive, emotionally charged, transformative',
    supports: ['confronting truth', 'breaking patterns', 'emotional processing', 'restructuring'],
    avoid: ['emotional volatility', 'destructive reactions', 'reactive decisions'],
    modifierTags: ['high intensity', 'unstable', 'deep processing'],
    toneModifier: 'Keep movement controlled and avoid emotionally reactive choices.',
  },
  Punarvasu: {
    name: 'Punarvasu',
    behavioralQuality: 'renewal, restoration, recalibration, optimism',
    supports: ['restarting', 'repairing', 'reconnecting', 'soft rebuilding'],
    avoid: ['repeating unstable patterns', 'overpromising'],
    modifierTags: ['restorative', 'hopeful', 'steady rebuilding'],
    toneModifier: 'Return to what is sustainable and rebuild carefully.',
  },
  Pushya: {
    name: 'Pushya',
    behavioralQuality: 'supportive, nourishing, stabilizing, constructive',
    supports: ['agreements', 'planning', 'responsible growth', 'supportive outreach'],
    avoid: ['overgiving', 'dependency', 'stagnation'],
    modifierTags: ['stable', 'supportive', 'high functionality'],
    toneModifier: 'This is a good day for steady, grounded movement.',
  },
  Ashlesha: {
    name: 'Ashlesha',
    behavioralQuality: 'binding, psychological, strategic, emotionally charged',
    supports: ['observation', 'contained communication', 'private planning', 'subtle strategy'],
    avoid: ['manipulation', 'impulsive reactions', 'emotional escalation', 'overexposure'],
    modifierTags: ['emotionally sensitive', 'strategic', 'low clarity'],
    toneModifier: 'Proceed carefully and avoid emotionally reactive decisions.',
  },
  Magha: {
    name: 'Magha',
    behavioralQuality: 'authoritative, legacy-focused, status-aware, commanding',
    supports: ['leadership', 'visibility', 'authority positioning', 'formal recognition'],
    avoid: ['ego conflicts', 'arrogance', 'performative behavior'],
    modifierTags: ['high visibility', 'authority', 'legacy-oriented'],
    toneModifier: 'Step into visibility with restraint and clarity.',
  },
  'Purva Phalguni': {
    name: 'Purva Phalguni',
    behavioralQuality: 'social, expressive, attractive, pleasure-oriented',
    supports: ['connection', 'creativity', 'audience engagement', 'aesthetics'],
    avoid: ['laziness', 'distraction', 'excessive indulgence'],
    modifierTags: ['visible', 'social', 'creative'],
    toneModifier: 'Engage openly, but maintain structure.',
  },
  'Uttara Phalguni': {
    name: 'Uttara Phalguni',
    behavioralQuality: 'agreement-oriented, stabilizing, relationally mature',
    supports: ['contracts', 'commitments', 'collaboration', 'follow-through'],
    avoid: ['overcommitting', 'dependency dynamics'],
    modifierTags: ['partnership', 'stability', 'structured growth'],
    toneModifier: 'Strengthen long-term structures and agreements.',
  },
  Hasta: {
    name: 'Hasta',
    behavioralQuality: 'precise, skilled, controlled, hands-on',
    supports: ['detailed work', 'craftsmanship', 'execution', 'organization'],
    avoid: ['perfectionism', 'micromanagement', 'overcontrol'],
    modifierTags: ['technical', 'precise', 'execution-focused'],
    toneModifier: 'Use precision and skill rather than force.',
  },
  Chitra: {
    name: 'Chitra',
    behavioralQuality: 'design-oriented, aesthetic, expressive, polished',
    supports: ['branding', 'aesthetics', 'presentation', 'refinement'],
    avoid: ['vanity', 'image obsession', 'surface-only decisions'],
    modifierTags: ['beautiful', 'high visibility', 'refinement'],
    toneModifier: 'Focus on quality, presentation, and intentional visibility.',
  },
  Swati: {
    name: 'Swati',
    behavioralQuality: 'independent, flexible, mobile, adaptable',
    supports: ['networking', 'outreach', 'movement', 'experimentation'],
    avoid: ['inconsistency', 'lack of grounding', 'drifting'],
    modifierTags: ['mobile', 'independent', 'light structure needed'],
    toneModifier: 'Stay flexible, but maintain direction.',
  },
  Vishakha: {
    name: 'Vishakha',
    behavioralQuality: 'goal-oriented, ambitious, focused, determined',
    supports: ['pursuit', 'strategic action', 'measurable progress', 'focused effort'],
    avoid: ['obsession', 'tunnel vision', 'forcing outcomes'],
    modifierTags: ['achievement-focused', 'high drive', 'targeted effort'],
    toneModifier: 'Direct energy carefully toward one clear objective.',
  },
  Anuradha: {
    name: 'Anuradha',
    behavioralQuality: 'relational, loyal, connective, cooperative',
    supports: ['partnerships', 'trust-building', 'client relationships', 'meaningful outreach'],
    avoid: ['emotional dependency', 'over-accommodation'],
    modifierTags: ['relationship-focused', 'steady', 'warm engagement'],
    toneModifier: 'Strengthen trust and existing relationships.',
  },
  Jyeshtha: {
    name: 'Jyeshtha',
    behavioralQuality: 'protective, intense, strategic, pressure-sensitive',
    supports: ['leadership under pressure', 'protection', 'prioritization', 'discernment'],
    avoid: ['control struggles', 'burnout', 'emotional defensiveness'],
    modifierTags: ['high pressure', 'protective', 'strategic restraint'],
    toneModifier: 'Keep priorities tight and avoid unnecessary conflict.',
  },
  Mula: {
    name: 'Mula',
    behavioralQuality: 'root-level, dismantling, truth-seeking, disruptive',
    supports: ['cutting away excess', 'restructuring', 'deep review', 'difficult honesty'],
    avoid: ['destruction without purpose', 'impulsive endings'],
    modifierTags: ['deep restructuring', 'intense', 'foundational'],
    toneModifier: 'Strip away what is unstable before rebuilding.',
  },
  'Purva Ashadha': {
    name: 'Purva Ashadha',
    behavioralQuality: 'campaign-oriented, expressive, forward-moving',
    supports: ['visibility', 'promotion', 'messaging', 'persuasive communication'],
    avoid: ['overconfidence', 'premature expansion'],
    modifierTags: ['momentum-building', 'public-facing', 'assertive'],
    toneModifier: 'Push forward carefully without overextending.',
  },
  'Uttara Ashadha': {
    name: 'Uttara Ashadha',
    behavioralQuality: 'disciplined, enduring, structured, long-term',
    supports: ['consistency', 'serious work', 'sustainable growth', 'leadership'],
    avoid: ['rigidity', 'emotional suppression'],
    modifierTags: ['stable', 'high discipline', 'long-term focus'],
    toneModifier: 'Focus on what will remain valuable over time.',
  },
  Shravana: {
    name: 'Shravana',
    behavioralQuality: 'observant, learning-focused, attentive, receptive',
    supports: ['listening', 'studying', 'strategic observation', 'gathering information'],
    avoid: ['passivity', 'overconsumption of information'],
    modifierTags: ['receptive', 'thoughtful', 'informational'],
    toneModifier: 'Pay attention before making major moves.',
  },
  Dhanishta: {
    name: 'Dhanishta',
    behavioralQuality: 'rhythmic, productive, socially connected, execution-oriented',
    supports: ['teamwork', 'production', 'consistency', 'operational movement'],
    avoid: ['overcommitment', 'scattered priorities'],
    modifierTags: ['productive', 'social', 'high movement'],
    toneModifier: 'Maintain momentum through disciplined execution.',
  },
  Shatabhisha: {
    name: 'Shatabhisha',
    behavioralQuality: 'isolated, analytical, detached, corrective',
    supports: ['repair', 'systems analysis', 'healing', 'technical refinement'],
    avoid: ['emotional withdrawal', 'excessive isolation'],
    modifierTags: ['detached', 'repair-oriented', 'analytical'],
    toneModifier: 'Focus on correction and clarity rather than visibility.',
  },
  'Purva Bhadrapada': {
    name: 'Purva Bhadrapada',
    behavioralQuality: 'intense, transitional, philosophical, emotionally layered',
    supports: ['reflection', 'internal shifts', 'strategic reassessment', 'deep thinking'],
    avoid: ['emotional spiraling', 'extremism', 'unstable reactions'],
    modifierTags: ['transitional', 'deep processing', 'psychological intensity'],
    toneModifier: 'Move deliberately and avoid reactive decisions.',
  },
  'Uttara Bhadrapada': {
    name: 'Uttara Bhadrapada',
    behavioralQuality: 'stable, reflective, patient, emotionally grounded',
    supports: ['endurance', 'long-term planning', 'emotional regulation', 'steady work'],
    avoid: ['stagnation', 'emotional shutdown'],
    modifierTags: ['grounded', 'stable', 'deep calm'],
    toneModifier: 'Use patience and consistency over force.',
  },
  Revati: {
    name: 'Revati',
    behavioralQuality: 'gentle, transitional, compassionate, completion-oriented',
    supports: ['closure', 'compassion', 'transitions', 'soft endings'],
    avoid: ['drifting', 'lack of boundaries', 'avoidance'],
    modifierTags: ['soft', 'transitional', 'completion-focused'],
    toneModifier: 'Close loops carefully and move with clarity.',
  },
};

// Fallback for unrecognized nakshatra names
const NAKSHATRA_FALLBACK: NakshatraModifier = {
  name: 'Unknown',
  behavioralQuality: 'neutral',
  supports: ['steady movement'],
  avoid: ['overextension'],
  modifierTags: ['neutral'],
  toneModifier: 'Proceed with steady, grounded movement.',
};

/**
 * Look up a nakshatra modifier, tolerating alternate spellings.
 * Tries exact match first, then case-insensitive, then partial match.
 */
export function getNakshatraModifier(nakshatra: string): NakshatraModifier {
  if (NAKSHATRA_LIBRARY[nakshatra]) return NAKSHATRA_LIBRARY[nakshatra];
  // Case-insensitive fallback
  const lower = nakshatra.toLowerCase();
  const key = Object.keys(NAKSHATRA_LIBRARY).find((k) => k.toLowerCase() === lower);
  if (key) return NAKSHATRA_LIBRARY[key];
  // Partial match (e.g. "Ashlesha Nakshatra" → "Ashlesha")
  const partial = Object.keys(NAKSHATRA_LIBRARY).find((k) => lower.includes(k.toLowerCase()));
  if (partial) return NAKSHATRA_LIBRARY[partial];
  return { ...NAKSHATRA_FALLBACK, name: nakshatra };
}

// ─── Tithi pacing ─────────────────────────────────────────────────────────────
// Tithi 1-15 = Shukla Paksha (waxing) → outward growth support
// Tithi 16-30 = Krishna Paksha (waning) → reduction/refinement support

export function getTithiPacing(tithi: string, paksha: 'Shukla' | 'Krishna'): TithiPacing {
  const isWaxing = paksha === 'Shukla';
  return {
    tithi,
    paksha,
    phase: isWaxing ? 'waxing' : 'waning',
    pacingLabel: isWaxing ? 'Outward' : 'Inward',
    pacingNote: isWaxing
      ? 'Waxing phase supports outward growth, expansion, and new starts.'
      : 'Waning phase supports reduction, refinement, and completion.',
  };
}

// ─── Day-of-week helper ───────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
}

// ─── Compose layered instruction ─────────────────────────────────────────────

/**
 * Integrate the nakshatra behavioral modifier into the mode instruction
 * as a "how" qualifier — not a second contradictory sentence.
 */
/** Exported so the cache path in service.ts can re-derive instructions without duplicating logic. */
export function composeInstructionFromParts(mode: FinalMode | DayMode, nakshatraModifier: NakshatraModifier): string {
  return composeInstruction(mode, nakshatraModifier);
}

function composeInstruction(mode: FinalMode | DayMode, nakshatraModifier: NakshatraModifier): string {
  const base = MODE_BASE_INSTRUCTIONS[mode] ?? MODE_BASE_INSTRUCTIONS['Selective'];
  const tone = nakshatraModifier.toneModifier;

  const CAUTIONARY_TAGS = ['emotionally sensitive', 'low clarity', 'high intensity',
    'unstable', 'deep processing', 'heavy', 'constraint', 'psychological intensity',
    'transitional', 'repair-oriented', 'detached'];

  const isCautionary = nakshatraModifier.modifierTags.some(tag =>
    CAUTIONARY_TAGS.includes(tag)
  );

  if (isCautionary) {
    const baseClean = base.replace(/\.$/, '');
    const toneClean = tone.charAt(0).toLowerCase() + tone.slice(1).replace(/\.$/, '');
    return `${baseClean} — ${toneClean}.`;
  }

  return `${base} ${tone}`;
}

// ─── Qualifier Generation ────────────────────────────────────────────────────

/**
 * Nakshatra direction categories for qualifier generation.
 * 'outward' = expansion/momentum nakshatras
 * 'inward'  = containment/correction nakshatras
 * 'focused' = precision/selective nakshatras
 * 'neutral' = no strong directional signal
 */
function getNakshatraDirection(nakshatra: string): 'outward' | 'inward' | 'focused' | 'neutral' {
  if (NAKSHATRA_UPGRADE.includes(nakshatra)) return 'outward';
  if (NAKSHATRA_DOWNGRADE.includes(nakshatra)) return 'inward';
  if (NAKSHATRA_SELECTIVE.includes(nakshatra)) return 'focused';
  return 'neutral';
}

/**
 * Tithi direction for qualifier generation.
 * 'outward' = waxing (Shukla)
 * 'inward'  = waning (Krishna), especially strong restraint tithis
 */
function getTithiDirection(tithi: string, paksha: 'Shukla' | 'Krishna'): 'outward' | 'inward' {
  const isWaxing = paksha === 'Shukla';
  const tithiName = tithi.replace(/^(Shukla|Krishna)\s+/, '');
  const isStrongRestraint = STRONG_RESTRAINT_TITHIS.some(t => tithiName.includes(t) || tithi.includes(t));
  if (isWaxing && !isStrongRestraint) return 'outward';
  return 'inward';
}

/**
 * Qualifier map: [baseMode][nakshatraDirection][tithiDirection] → qualifier string
 *
 * These describe HOW the mode expresses itself, not a different mode.
 */
const QUALIFIER_MAP: Record<string, Record<string, Record<string, string>>> = {
  Restraint: {
    outward: {
      outward: 'Assertive Restraint',
      inward:  'Productive Restraint',
    },
    inward: {
      outward: 'Cautious Restraint',
      inward:  'Deep Restraint',
    },
    focused: {
      outward: 'Discerning Restraint',
      inward:  'Corrective Restraint',
    },
    neutral: {
      outward: 'Contained Restraint',
      inward:  'Still Restraint',
    },
  },
  Selective: {
    outward: {
      outward: 'Expansive Selective',
      inward:  'Assertive Selective',
    },
    inward: {
      outward: 'Cautious Selective',
      inward:  'Inward Selective',
    },
    focused: {
      outward: 'Focused Selective',
      inward:  'Discerning Selective',
    },
    neutral: {
      outward: 'Outward Selective',
      inward:  'Quiet Selective',
    },
  },
  Build: {
    outward: {
      outward: 'Expansive Build',
      inward:  'Productive Build',
    },
    inward: {
      outward: 'Corrective Build',
      inward:  'Restrained Build',
    },
    focused: {
      outward: 'Precise Build',
      inward:  'Focused Build',
    },
    neutral: {
      outward: 'Active Build',
      inward:  'Steady Build',
    },
  },
  Action: {
    outward: {
      outward: 'Full Action',
      inward:  'Directed Action',
    },
    inward: {
      outward: 'Measured Action',
      inward:  'Contained Action',
    },
    focused: {
      outward: 'Precise Action',
      inward:  'Selective Action',
    },
    neutral: {
      outward: 'Open Action',
      inward:  'Grounded Action',
    },
  },
};

/**
 * Generate the qualifier string for a given mode + nakshatra + tithi.
 * The qualifier describes HOW the mode expresses, not a different mode.
 */
function generateQualifier(
  mode: FinalMode,
  nakshatra: string,
  tithi: string,
  paksha: 'Shukla' | 'Krishna'
): string {
  const nakDir = getNakshatraDirection(nakshatra);
  const tithiDir = getTithiDirection(tithi, paksha);
  return QUALIFIER_MAP[mode]?.[nakDir]?.[tithiDir] ?? mode;
}

// ─── Rule-Based Mode Flip ────────────────────────────────────────────────────

/**
 * Mode flips have been removed to preserve Lagna-based personalization.
 * The qualifier layer captures nakshatra/tithi nuance without changing the
 * baseMode itself. Two users with different Lagnas (and therefore different
 * baseModes) must never converge to the same finalMode solely because of a
 * strong nakshatra/tithi combination.
 *
 * For non-Flex modes: finalMode === baseMode, always.
 * Flex resolution remains handled separately via resolveFlexScore.
 */
function resolveFlip(
  baseMode: FinalMode,
  _nakshatra: string,
  _tithi: string,
  _paksha: 'Shukla' | 'Krishna',
  _fieldCond: FieldCondition
): FinalMode {
  return baseMode;
}

// ─── Calculate Final Mode ────────────────────────────────────────────────────

/**
 * Calculate the final mode from base mode + qualifier model.
 *
 * Architecture:
 *   - House transit → BASE MODE (primary, authoritative)
 *   - Nakshatra + Tithi → QUALIFIER (how the mode expresses)
 *   - finalMode = baseMode for all non-Flex modes (no flips)
 *   - Flex resolves to Build or Selective via resolveFlexScore
 *   - Scores retained for diagnostics only, not used to determine finalMode
 */
export function calculateFinalMode(
  baseMode: DayMode,
  nakshatra: string,
  tithi: string,
  paksha: 'Shukla' | 'Krishna'
): ModeReason {
  // Step 1: Resolve base score (diagnostic)
  let baseScore: number;
  if (baseMode === 'Flex') {
    baseScore = resolveFlexScore(nakshatra, paksha);
  } else {
    baseScore = MODE_SCORE[baseMode] ?? 1;
  }

  // Step 2: Nakshatra modifier (diagnostic score)
  const nakshatraMod = getNakshatraModeModifier(nakshatra);

  // Step 3: Tithi modifier (diagnostic score)
  const tithiMod = getTithiModeModifier(tithi, paksha);

  // Step 4: Field condition
  const fieldCond = determineFieldCondition(nakshatra, tithi, paksha);

  // Step 5: Diagnostic score (not used for finalMode)
  const rawScore = baseScore + nakshatraMod.score + tithiMod.score + fieldCond.modifier;
  const finalScore = clampScore(rawScore);

  // Step 6: Determine finalMode
  // For Flex: resolve via rule-based logic (Flex is intentionally transitional)
  // For all other modes: only flip if ALL THREE layers align (rule-based)
  let finalMode: FinalMode;
  if (baseMode === 'Flex') {
    finalMode = SCORE_TO_MODE[resolveFlexScore(nakshatra, paksha)];
  } else {
    finalMode = resolveFlip(baseMode as FinalMode, nakshatra, tithi, paksha, fieldCond.condition);
  }

  // Step 7: Generate qualifier (how the finalMode expresses itself)
  const qualifier = generateQualifier(finalMode, nakshatra, tithi, paksha);

  // Build explanation
  const explanation = buildExplanation(baseMode, baseScore, nakshatraMod, tithiMod, fieldCond, finalScore, finalMode, qualifier);

  return {
    baseMode,
    baseScore,
    nakshatraModifier: nakshatraMod.score,
    nakshatraReason: nakshatraMod.reason,
    tithiModifier: tithiMod.score,
    tithiReason: tithiMod.reason,
    fieldCondition: fieldCond.condition,
    fieldModifier: fieldCond.modifier,
    fieldReason: fieldCond.reason,
    finalScore,
    finalMode,
    qualifier,
    explanation,
  };
}

function buildExplanation(
  baseMode: DayMode,
  baseScore: number,
  nakshatraMod: { score: number; reason: string },
  tithiMod: { score: number; reason: string },
  fieldCond: { condition: FieldCondition; modifier: number; reason: string },
  finalScore: number,
  finalMode: FinalMode,
  qualifier: string
): string {
  const parts: string[] = [];
  parts.push(`Base Mode: ${baseMode} (score ${baseScore})`);
  if (nakshatraMod.score !== 0) {
    parts.push(`Nakshatra: ${nakshatraMod.reason}`);
  }
  if (tithiMod.score !== 0) {
    parts.push(`Tithi: ${tithiMod.reason}`);
  }
  if (fieldCond.modifier !== 0) {
    parts.push(`Field: ${fieldCond.reason}`);
  }
  if (finalMode !== baseMode) {
    parts.push(`Mode Flip: ${baseMode} → ${finalMode} (all three layers aligned)`);
  } else {
    parts.push(`Final Mode: ${finalMode} (base mode preserved)`);
  }
  parts.push(`Qualifier: ${qualifier}`);
  return parts.join(' → ');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Apply Kala interpretation rules to raw astronomy data.
 *
 * Architecture:
 *   1. Moon house from Lagna → BASE MODE
 *   2. Nakshatra → mode modifier (upgrade/downgrade/selective shift)
 *   3. Tithi → mode modifier (waxing/waning pacing)
 *   4. Field Condition → mode modifier (Open/Neutral/Restricted)
 *   5. Score → FINAL MODE
 *
 * @param astro     Raw astronomy data from calcPanchang()
 * @param lagnaSign Client's Lagna/Ascendant sign name (e.g. 'Virgo')
 * @returns Complete day field ready for display
 */
export function interpretPanchang(astro: AstronomyData, lagnaSign: string): DayField {
  // Layer 1: base mode from Moon house
  const house = moonSignToHouse(astro.moonSignIndex, lagnaSign);
  const baseMode = HOUSE_MODE[house];

  // Layer 2: nakshatra behavioral modifier (for instruction text)
  const nakshatraModifier = getNakshatraModifier(astro.nakshatra);

  // Layer 3: tithi pacing (for display)
  const tithiPacing = getTithiPacing(astro.tithi, astro.tithiPaksha);

  // Calculate final mode with rule-based qualifier model
  const modeReason = calculateFinalMode(baseMode, astro.nakshatra, astro.tithi, astro.tithiPaksha);
  const finalMode = modeReason.finalMode;
  const qualifier = modeReason.qualifier;

  // Compose instruction based on FINAL mode + nakshatra tone
  const instruction = composeInstruction(finalMode, nakshatraModifier);

  return {
    date: astro.date,
    dayOfWeek: getDayOfWeek(astro.date),
    moonSign: astro.moonSign,
    houseActivated: house,
    nakshatra: astro.nakshatra,
    nakshatraPada: astro.nakshatraPada,
    tithi: astro.tithi,
    tithiPaksha: astro.tithiPaksha,
    sunriseLocal: astro.sunriseLocal,
    mode: finalMode, // backward compat: mode = finalMode
    baseMode,
    finalMode,
    qualifier,
    instruction,
    modeReason,
    nakshatraModifier,
    tithiPacing,
    nakshatraAtSunrise: astro.nakshatraAtSunrise,
    nakshatraTransitionTime: astro.nakshatraTransitionTime,
    nakshatraAfterTransition: astro.nakshatraAfterTransition,
    lagnaSign,
  };
}
