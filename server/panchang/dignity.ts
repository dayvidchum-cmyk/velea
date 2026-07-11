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

export const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

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

// Exact exaltation POINTS (absolute ecliptic longitude) — the classical degree table
// (David's workbook, 2026-07): Sun 10° Aries, Moon 3° Taurus, Mars 28° Capricorn,
// Mercury 15° Virgo, Jupiter 5° Cancer, Venus 27° Pisces, Saturn 20° Libra.
// The debilitation point is exactly opposite (+180°).
const EXALT_POINT: Record<string, number> = {
  Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200,
};

export type UcchaDepth = "peak" | "strong" | "middling" | "low" | "hollow";
export type Uccha = { value: number; depth: UcchaDepth };

/**
 * Uccha bala — the degree GRADIENT the sign-level tier can't see: angular distance from
 * the planet's exact debilitation point, normalized. 1 = sitting on the exact exaltation
 * degree, 0 = sitting on the exact debilitation degree, continuous everywhere between —
 * so "exalted" near the sign's edge reads weaker than exalted ON the point, and strength
 * exists on days the binary tier calls merely neutral. Null for Rahu/Ketu (no consensus
 * points — the workbook marks them "handled contextually").
 */
export function ucchaBala(planet: string, lonDeg: number): Uccha | null {
  const ep = EXALT_POINT[planet];
  if (ep == null || !Number.isFinite(lonDeg)) return null;
  const deb = (ep + 180) % 360;
  let d = Math.abs((((lonDeg % 360) + 360) % 360) - deb);
  if (d > 180) d = 360 - d;
  const value = +(d / 180).toFixed(3);
  const depth: UcchaDepth =
    value >= 0.92 ? "peak" : value >= 0.7 ? "strong" : value >= 0.35 ? "middling" : value >= 0.12 ? "low" : "hollow";
  return { value, depth };
}

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

// ---- PANCHADHA MAITRI (fivefold friendship) — David's textbook, "Planetary
// Conditions" ch. (2026-07-10 PDF). The permanent (naisargika) table above is only
// half the method: TEMPORARY relationships come from the live sky, and the compound
// of the two is what actually judges a placement.

export type Fivefold = "great_friend" | "friend" | "neutral" | "enemy" | "great_enemy";

/** Temporary relationship by sign count: a planet in the 2nd, 3rd, 4th, 10th, 11th or
 *  12th sign AS COUNTED FROM the planet under consideration is a temporary friend;
 *  same sign or 5th/6th/7th/8th/9th is a temporary enemy. */
export function temporalRelation(fromSign: string, toSign: string): "friend" | "enemy" {
  const count = ((SIGNS.indexOf(toSign) - SIGNS.indexOf(fromSign) + 12) % 12) + 1;
  return [2, 3, 4, 10, 11, 12].includes(count) ? "friend" : "enemy";
}

/**
 * The fivefold compound: permanent × temporary.
 *   Friend+Friend = Great Friend · Neutral+Friend = Friend · Friend+Enemy = Neutral
 *   Neutral+Enemy = Enemy · Enemy+Enemy = Great Enemy
 * Directional (A's relationship TO B), from A's occupied sign to B's occupied sign.
 * Null for Rahu/Ketu (not in the classification).
 */
export function fivefoldMaitri(a: string, b: string, aSign: string, bSign: string): Fivefold | null {
  if (!EXALT[a] || !EXALT[b] || a === b) return null;
  const perm = FRIEND[a]?.includes(b) ? 1 : ENEMY[a]?.includes(b) ? -1 : 0;
  const temp = temporalRelation(aSign, bSign) === "friend" ? 1 : -1;
  const sum = perm + temp;
  return sum === 2 ? "great_friend" : sum === 1 ? "friend" : sum === 0 ? "neutral" : sum === -1 ? "enemy" : "great_enemy";
}

/** Lord of a sign (classical seven only — Rahu/Ketu rule nothing here). */
export function signLordOf(sign: string): string | undefined {
  return SIGN_LORD[sign];
}

/** The signs a planet rules (its own signs) — used to map a planet to the houses it
 *  rules from a given lagna. Returns [] for Rahu/Ketu (no rulership). */
export function signsRuledBy(planet: string): string[] {
  return OWN[planet] ?? [];
}

// Composite strength weights — the ONE place to tune. Dignity tier → base points; live
// afflictions subtract. Legible, not claimed as canonical Shadbala.
const TIER_SCORE: Record<DignityTier, number> = {
  exalted: 5, moolatrikona: 4, own: 3, friend: 2, neutral: 0, enemy: -2, debilitated: -5,
};
const COMBUST_PENALTY = 3;
const NODAL_PENALTY = 2;

export type StrengthLabel = "dignified" | "steady" | "weak" | "compromised";
export type Strength = { tier: DignityTier; score: number; label: StrengthLabel; combust: boolean; nodal: boolean; uccha: Uccha | null; maitri: { lord: string; compound: Fivefold } | null };

/**
 * Composite "how able to deliver is this planet right now": essential dignity minus live
 * affliction (combustion, nodal grip). Returns null for Rahu/Ketu (no dignity).
 */
export function strength(
  planet: string,
  sign: string,
  degInSign: number | undefined,
  opts: { combust?: boolean; nodal?: boolean; lonDeg?: number; lordSign?: string } = {},
): Strength | null {
  const tier = dignityTier(planet, sign, degInSign);
  if (!tier) return null;
  const combust = !!opts.combust, nodal = !!opts.nodal;
  const score = TIER_SCORE[tier] - (combust ? COMBUST_PENALTY : 0) - (nodal ? NODAL_PENALTY : 0);
  const label: StrengthLabel = score >= 3 ? "dignified" : score >= 0 ? "steady" : score >= -3 ? "weak" : "compromised";
  // Degree gradient rides ALONGSIDE the tier (informational — does not move the score;
  // the tier system stays stable, the gradient grades it).
  const uccha = opts.lonDeg != null ? ucchaBala(planet, opts.lonDeg) : null;
  // Fivefold relation to the occupied sign's lord (needs the lord's CURRENT sign) —
  // grades friend/neutral/enemy placements into the five true bands. Own sign → null.
  const lord = SIGN_LORD[sign];
  const compound = opts.lordSign && lord && lord !== planet ? fivefoldMaitri(planet, lord, sign, opts.lordSign) : null;
  return { tier, score, label, combust, nodal, uccha, maitri: compound ? { lord, compound } : null };
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
