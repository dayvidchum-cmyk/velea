/**
 * DIGNITY & STRENGTH — Velea's chosen "planetary strength" method (Layer 4): a
 * dignity/placement score, NOT full Shadbala. Every input is a FIXED classical table
 * (exaltation, sign lords, moolatrikona ranges, naisargika friendships), so the dignity
 * TIER is verifiable to the degree; the composite strength score's weights are declared
 * here in one place and are tunable. Composes with the live afflictions (affliction.ts).
 *
 * Chosen over Shadbala deliberately: Shadbala's cross-software references disagree
 * (unprovable), and its output is an opaque number; this is auditable and legible.
 */

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const SIGN_LORD: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury",
  Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};

// Exaltation sign per planet (debilitation is the sign opposite).
const EXALT: Record<string, string> = {
  Sun:"Aries", Moon:"Taurus", Mars:"Capricorn", Mercury:"Virgo", Jupiter:"Cancer", Venus:"Pisces", Saturn:"Libra",
};

// Own signs (swakshetra).
const OWN: Record<string, string[]> = {
  Sun:["Leo"], Moon:["Cancer"], Mars:["Aries","Scorpio"], Mercury:["Gemini","Virgo"],
  Jupiter:["Sagittarius","Pisces"], Venus:["Taurus","Libra"], Saturn:["Capricorn","Aquarius"],
};

// Moolatrikona sign + degree range [lo, hi) within that sign.
const MOOLA: Record<string, { sign: string; lo: number; hi: number }> = {
  Sun:{sign:"Leo",lo:0,hi:20}, Moon:{sign:"Taurus",lo:3,hi:30}, Mars:{sign:"Aries",lo:0,hi:12},
  Mercury:{sign:"Virgo",lo:15,hi:20}, Jupiter:{sign:"Sagittarius",lo:0,hi:10},
  Venus:{sign:"Libra",lo:0,hi:15}, Saturn:{sign:"Aquarius",lo:0,hi:20},
};

// Naisargika (natural) friendship — Parashara. Anything not friend/enemy is neutral.
const FRIEND: Record<string, string[]> = {
  Sun:["Moon","Mars","Jupiter"], Moon:["Sun","Mercury"], Mars:["Sun","Moon","Jupiter"],
  Mercury:["Sun","Venus"], Jupiter:["Sun","Moon","Mars"], Venus:["Mercury","Saturn"], Saturn:["Mercury","Venus"],
};
const ENEMY: Record<string, string[]> = {
  Sun:["Venus","Saturn"], Moon:[], Mars:["Mercury"], Mercury:["Moon"],
  Jupiter:["Mercury","Venus"], Venus:["Sun","Moon"], Saturn:["Sun","Moon","Mars"],
};

const oppositeSign = (s: string) => SIGNS[(SIGNS.indexOf(s) + 6) % 12];

export type DignityTier = "exalted" | "moolatrikona" | "own" | "friend" | "neutral" | "enemy" | "debilitated";

/**
 * A planet's essential dignity in the sign it occupies. `degInSign` (0..30) sharpens the
 * moolatrikona range; omit it and moolatrikona falls back to "own". Returns null for the
 * shadow planets (Rahu/Ketu), which have no consensus dignity. Precedence:
 * exalted → debilitated → moolatrikona → own → friend/neutral/enemy (by the sign's lord).
 */
export function dignityTier(planet: string, sign: string, degInSign?: number): DignityTier | null {
  const exalt = EXALT[planet];
  if (!exalt) return null; // Rahu/Ketu (or unknown)
  if (sign === exalt) return "exalted";
  if (sign === oppositeSign(exalt)) return "debilitated";
  const mt = MOOLA[planet];
  if (mt && sign === mt.sign && degInSign != null && degInSign >= mt.lo && degInSign < mt.hi) return "moolatrikona";
  if (OWN[planet].includes(sign)) return "own";
  const lord = SIGN_LORD[sign];
  if (lord === planet) return "own";
  if (FRIEND[planet]?.includes(lord)) return "friend";
  if (ENEMY[planet]?.includes(lord)) return "enemy";
  return "neutral";
}

// Composite strength weights — the ONE place to tune. Dignity tier → base points; live
// afflictions subtract. Legible, not claimed as canonical Shadbala.
const TIER_SCORE: Record<DignityTier, number> = {
  exalted: 5, moolatrikona: 4, own: 3, friend: 2, neutral: 0, enemy: -2, debilitated: -5,
};
const COMBUST_PENALTY = 3;
const NODAL_PENALTY = 2;

export type StrengthLabel = "dignified" | "steady" | "weak" | "compromised";
export type Strength = { tier: DignityTier; score: number; label: StrengthLabel; combust: boolean; nodal: boolean };

/**
 * Composite "how able to deliver is this planet right now": essential dignity minus live
 * affliction (combustion, nodal grip). Returns null for Rahu/Ketu (no dignity).
 */
export function strength(
  planet: string,
  sign: string,
  degInSign: number | undefined,
  opts: { combust?: boolean; nodal?: boolean } = {},
): Strength | null {
  const tier = dignityTier(planet, sign, degInSign);
  if (!tier) return null;
  const combust = !!opts.combust, nodal = !!opts.nodal;
  const score = TIER_SCORE[tier] - (combust ? COMBUST_PENALTY : 0) - (nodal ? NODAL_PENALTY : 0);
  const label: StrengthLabel = score >= 3 ? "dignified" : score >= 0 ? "steady" : score >= -3 ? "weak" : "compromised";
  return { tier, score, label, combust, nodal };
}

// Capitalized tier label for the human-facing natal dignity string (superset of the old
// Exalted/Debilitated/Own/Neutral — now also Moolatrikona/Friend/Enemy).
const TIER_LABEL: Record<DignityTier, string> = {
  exalted:"Exalted", moolatrikona:"Moolatrikona", own:"Own", friend:"Friend", neutral:"Neutral", enemy:"Enemy", debilitated:"Debilitated",
};
export function dignityLabel(planet: string, sign: string, degInSign?: number): string {
  const t = dignityTier(planet, sign, degInSign);
  return t ? TIER_LABEL[t] : "—";
}
