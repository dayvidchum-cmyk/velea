/**
 * narrative-data.ts
 * Static lookup tables for composing the WHY THIS MODE narrative paragraph.
 * All data is editorial copy — no calculations here.
 *
 * Mode flips have been removed from the interpreter; baseMode === finalMode for
 * non-Flex modes, so these tables describe the mode's expression, not its cause.
 */

// ─── House themes ─────────────────────────────────────────────────────────────
export const NARRATIVE_HOUSE_THEMES: Record<number, string> = {
  1:  "identity, body, and self-direction",
  2:  "money, voice, and resources",
  3:  "communication, writing, and short-range connections",
  4:  "home, foundation, and inner stability",
  5:  "creativity, self-expression, and pleasure",
  6:  "work routines, health, and daily discipline",
  7:  "partnerships, contracts, and open exchange",
  8:  "shared resources, depth, and transformation",
  9:  "learning, systems, and expansion of perspective",
  10: "public work, authority, and reputation",
  11: "networks, community, and future planning",
  12: "retreat, hidden work, and inner restoration",
};

// ─── Nakshatra qualities (plain-language, no Sanskrit jargon) ─────────────────
export const NARRATIVE_NAKSHATRA_QUALITIES: Record<string, string> = {
  Ashwini:              "swift, initiating energy",
  Bharani:              "pressure, containment, and weight",
  Krittika:             "sharpness and a drive to refine",
  Rohini:               "magnetic, growth-oriented pull",
  Mrigashira:           "restless curiosity and searching quality",
  Ardra:                "intensity and a disruptive, transformative edge",
  Punarvasu:            "restorative, renewal-oriented movement",
  Pushya:               "steady, nourishing, and constructive support",
  Ashlesha:             "strategic, psychologically charged undercurrent",
  Magha:                "authoritative, legacy-conscious presence",
  "Purva Phalguni":     "social, expressive, pleasure-seeking energy",
  "Uttara Phalguni":    "agreement-oriented, stabilizing quality",
  Hasta:                "precise, skillful, hands-on execution energy",
  Chitra:               "aesthetic refinement and high-visibility pull",
  Swati:                "independent, mobile, adaptable movement",
  Vishakha:             "goal-oriented, determined, focused drive",
  Anuradha:             "relational, loyal, connective warmth",
  Jyeshtha:             "protective intensity and strategic pressure",
  Mula:                 "root-level, dismantling, truth-seeking force",
  "Purva Ashadha":      "forward-moving, campaign-oriented momentum",
  "Uttara Ashadha":     "disciplined, enduring, long-term structure",
  Shravana:             "receptive, observant, listening quality",
  Dhanishta:            "rhythmic, productive, execution-oriented energy",
  Shatabhisha:          "analytical, corrective, detached clarity",
  "Purva Bhadrapada":   "intense, transitional, philosophically charged depth",
  "Uttara Bhadrapada":  "stable, patient, emotionally grounded endurance",
  Revati:               "gentle, closing, compassionate completion energy",
};

// ─── Tithi pacing (based on paksha) ──────────────────────────────────────────
export const NARRATIVE_TITHI_PACING: Record<string, string> = {
  Shukla: "the waxing moon supports outward movement and expansion",
  Krishna: "the waning moon supports inward movement and refinement",
};

// ─── Time lord emphasis ───────────────────────────────────────────────────────
export const NARRATIVE_TIME_LORD_EMPHASIS: Record<string, string> = {
  Sun:     "visibility, authority, and self-directed leadership",
  Moon:    "emotional rhythm, care, and nurturing relationships",
  Mars:    "decisive action, courage, and forward movement",
  Mercury: "communication, exchange, and learning",
  Jupiter: "expansion, teaching, and growth through wisdom",
  Venus:   "refining and building within relationships, beauty, and value",
  Saturn:  "structure, discipline, and long-term endurance",
  Rahu:    "ambition, disruption, and unconventional forward movement",
  Ketu:    "detachment, release, and spiritual discernment",
};

// ─── Ordinal suffix ───────────────────────────────────────────────────────────
export function getOrdinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ─── Compose narrative ────────────────────────────────────────────────────────
export interface NarrativeInput {
  moonSign: string;
  houseActivated: number;
  nakshatra: string;
  tithi: string;
  tithiPaksha: string;
  timeLord?: string | null;
}

export function composeNarrative(input: NarrativeInput): string {
  const { moonSign, houseActivated, nakshatra, tithi, tithiPaksha, timeLord } = input;

  const houseTheme = NARRATIVE_HOUSE_THEMES[houseActivated] ?? "the activated life area";
  const ordinal = getOrdinal(houseActivated);
  const nakshatraQuality = NARRATIVE_NAKSHATRA_QUALITIES[nakshatra] ?? "a distinct quality";
  const tithiPacing = NARRATIVE_TITHI_PACING[tithiPaksha] ?? "a balanced lunar rhythm";
  const timeLordEmphasis = timeLord
    ? (NARRATIVE_TIME_LORD_EMPHASIS[timeLord] ?? `${timeLord}'s domain`)
    : null;

  const s1 = `The Moon is in ${moonSign} today, moving through your ${ordinal} house — ${houseTheme}.`;
  const s2 = `${nakshatra} adds ${nakshatraQuality}, while ${tithi} arrives as ${tithiPacing}.`;
  const s3 = timeLordEmphasis
    ? `With ${timeLord} as your year's time lord, the emphasis falls on ${timeLordEmphasis}.`
    : "";

  return [s1, s2, s3].filter(Boolean).join(" ");
}
