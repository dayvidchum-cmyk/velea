/**
 * MODIFIER CONFIGURATION — Velea Mode Engine
 *
 * This file contains ALL modifier values in one place for review and adjustment.
 * The interpreter.ts imports from here.
 *
 * ─── OUTWARDNESS SCALE ───
 *   Restraint = 0
 *   Selective = 1
 *   Build     = 2
 *   Action    = 3
 *
 * ─── HOW MODIFIERS WORK ───
 *   Final Score = Base Score + Nakshatra Modifier + Tithi Modifier + Field Modifier
 *   Then: Selective Bias applied (if applicable)
 *   Then: Clamped to [0, 3] and rounded to nearest integer
 *   Then: Mapped to mode name via OUTWARDNESS_SCALE
 */

// ─── HOUSE → BASE MODE ──────────────────────────────────────────────────────
// DELETED v810. This was a private COPY of interpreter.ts's HOUSE_MODE that stopped being updated
// on 2026-07-12, when David corrected the 3rd/5th/9th assignments. It disagreed with the live map on
// exactly those three houses — 3: Build vs Selective, 5: Selective vs Build, 9: Flex vs Action — and
// it was still being SERVED, unauthenticated, by the /config endpoint. It corrupted no computation
// (nothing else imported it) but anything reading that API got three houses wrong for eight days.
// A second copy of a table is not a config file, it is a bug with a delay. There is one map, in
// interpreter.ts, and the endpoint now serves that one.

// ─── NAKSHATRA MODIFIERS ─────────────────────────────────────────────────────
// Each nakshatra falls into one of four categories:
//   Upgrade (+1): supports expansion/outward movement
//   Downgrade (-1): supports containment/correction
//   Selective (bias toward score 1): supports precision
//   Neutral (0): no mode shift

export const NAKSHATRA_MODIFIERS: Record<string, { score: number; category: string }> = {
  // ─── UPGRADE (+1) ───
  Ashwini:           { score: +1, category: 'Upgrade' },
  Rohini:            { score: +1, category: 'Upgrade' },
  Pushya:            { score: +1, category: 'Upgrade' },
  Swati:             { score: +1, category: 'Upgrade' },
  Dhanishtha:        { score: +1, category: 'Upgrade' }, // audit M11: was 'Dhanishta' — never matched the emitted name

  // ─── CORRECTED AGAINST THE CITED CANON (David's ruling, 2026-07-20) ───
  // These four sat in UPGRADE (+1 = "supports expansion/outward movement") while the ONE table in
  // this app with a source citation — canon/muhurta-tables.json, from Muhurta Chintamani and
  // Brihat Samhita 98 — classifies them as FIERCE or MIXED. David: "Cited tables from the textbooks
  // win. I'm not sure how something described as fierce or mixed is expansive because fierce makes
  // me think danger, bad, aggressive."
  //
  // The replacement scores are taken from what the canon says each nature SUPPORTS and AVOIDS, not
  // from taste:
  //   FIERCE (Ugra)  supports "force, demolition, hard confrontation, acts requiring ruthlessness";
  //                  avoids "almost everything gentle, beginnings, journeys"  → containment, -1.
  //   MIXED (Misra)  supports "routine and mundane work, day-to-day duties";
  //                  avoids "the extremes — neither launch nor cut"           → no shift, 0.
  //
  // SCOPE, deliberately narrow: this changes ONLY the stars where the hand-made table asserted the
  // OPPOSITE of the cited one. A wholesale remap of nature→score would have moved eleven stars, and
  // the other seven were Selective/Neutral — which does not contradict "fixed" or "movable", it just
  // says less. Those seven are a method question for David, not a correction I get to make. See the
  // audit sheet.
  Magha:             { score: -1, category: 'Downgrade' },  // canon: fierce
  'Purva Phalguni':  { score: -1, category: 'Downgrade' },  // canon: fierce
  'Purva Ashadha':   { score: -1, category: 'Downgrade' },  // canon: fierce
  Vishakha:          { score:  0, category: 'Neutral' },    // canon: mixed — avoid the extremes

  // ─── DOWNGRADE (-1) ───
  Bharani:              { score: -1, category: 'Downgrade' },
  Ardra:                { score: -1, category: 'Downgrade' },
  Ashlesha:             { score: -1, category: 'Downgrade' },
  Jyeshtha:             { score: -1, category: 'Downgrade' },
  Mula:                 { score: -1, category: 'Downgrade' },
  'Purva Bhadrapada':   { score: -1, category: 'Downgrade' },

  // ─── SELECTIVE (bias toward 1) ───
  Hasta:                { score: 0, category: 'Selective' },
  Chitra:               { score: 0, category: 'Selective' },
  Anuradha:             { score: 0, category: 'Selective' },
  Shravana:             { score: 0, category: 'Selective' },
  Shatabhisha:          { score: 0, category: 'Selective' },
  'Uttara Phalguni':    { score: 0, category: 'Selective' },
  'Uttara Ashadha':     { score: 0, category: 'Selective' },

  // ─── NEUTRAL (0) ───
  Krittika:             { score: 0, category: 'Neutral' },
  Mrigashira:           { score: 0, category: 'Neutral' },
  Punarvasu:            { score: 0, category: 'Neutral' },
  'Uttara Bhadrapada':  { score: 0, category: 'Neutral' },
  Revati:               { score: 0, category: 'Neutral' },
};

// ─── TITHI MODIFIERS ─────────────────────────────────────────────────────────
// Two layers:
//   1. Paksha phase: Shukla (waxing) = +0.5, Krishna (waning) = -0.5
//   2. Strong discipline tithis: additional -0.5

export const TITHI_PHASE_MODIFIER = {
  Shukla: +0.5,   // Waxing: supports outward movement
  Krishna: -0.5,  // Waning: supports inward movement
};

export const STRONG_RESTRAINT_TITHIS: string[] = [
  'Ekadashi',     // Additional -0.5
  'Ashtami',      // Additional -0.5
  'Chaturdashi',  // Additional -0.5
  'Amavasya',     // Additional -0.5
];

export const STRONG_RESTRAINT_ADDITIONAL_MODIFIER = -0.5;

// ─── FIELD CONDITION RULES ───────────────────────────────────────────────────
// Field condition is determined by the COMBINATION of nakshatra + tithi signals.
//
// Open (modifier: 0):
//   Upgrade nakshatra + Shukla paksha + NOT strong restraint tithi
//   → Both signals align outward. No additional modifier (already counted individually).
//
// Restricted (modifier: -1 or -0.5):
//   Downgrade nakshatra + Krishna paksha + strong restraint tithi → -1
//   Downgrade nakshatra + strong restraint tithi (any paksha) → -0.5
//   → Signals compound toward containment.
//
// Neutral (modifier: 0):
//   Everything else.

export const FIELD_CONDITION_MODIFIERS = {
  Open: 0,
  Restricted_Full: -1,    // Downgrade + Krishna + strong restraint
  Restricted_Partial: -0.5, // Downgrade + strong restraint (any paksha)
  Neutral: 0,
};

// ─── SELECTIVE BIAS RULE ─────────────────────────────────────────────────────
// When a "Selective" category nakshatra is active:
//   If current score > 1: subtract 0.5 (pull toward Selective)
//   If current score < 1: add 0.5 (pull toward Selective)
//   If current score = 1: no change

export const SELECTIVE_BIAS_STRENGTH = 0.5;

// ─── FLEX RESOLUTION RULES ──────────────────────────────────────────────────
// Flex houses (2, 9) resolve based on context:
//   Upgrade nakshatra + Shukla → Build (2)
//   Upgrade nakshatra OR Shukla → Build (2)
//   Otherwise → Selective (1)

export const FLEX_RESOLUTION = {
  withUpwardSignal: 2,   // Build
  withoutSignal: 1,      // Selective
};

// ─── CONFIDENCE CALCULATION ──────────────────────────────────────────────────
// Confidence represents how strongly the modifiers agree with the final mode.
//
// Formula:
//   rawScore = baseScore + nakshatraModifier + tithiModifier + fieldModifier
//   distance = |rawScore - clampedFinalScore|
//   agreement = number of modifiers pointing in same direction as final mode
//
//   confidence = base 50% + (agreement * 16%) - (distance * 10%)
//   Clamped to [25%, 95%]

export const CONFIDENCE_CONFIG = {
  baseConfidence: 50,
  agreementBonus: 16,  // per agreeing modifier
  distancePenalty: 10, // per unit of distance from raw to clamped
  min: 25,
  max: 95,
};
