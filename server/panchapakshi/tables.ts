/**
 * Pancha Pakshi Sastra — the five-birds timing system. Reference tables, validated
 * against the user's app. The tradition is PAKSHA-DEPENDENT: the 27 nakshatras fall into
 * five fixed groups, but the bird assigned to each group rotates between the waxing
 * (Shukla) and waning (Krishna) fortnights. Verified: Jyeshtha → Cock (Shukla) / Owl
 * (Krishna); David's app says Owl → David is a Krishna-paksha birth.
 *
 * The five states, most→least auspicious: Ruling · Eating · Walking · Sleeping · Dying.
 */

export type Bird = "Vulture" | "Owl" | "Crow" | "Cock" | "Peacock";
export type Paksha = "Shukla" | "Krishna";
export const BIRDS: Bird[] = ["Vulture", "Owl", "Crow", "Cock", "Peacock"];

// The five fixed nakshatra groups (same membership in both pakshas).
const GROUPS: string[][] = [
  ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira"],
  ["Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni"],
  ["Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha"],
  ["Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha"],
  ["Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"],
];

// Bird per group index [0..4], by paksha. (Crow is the fixed axis; the other four swap
// in pairs: Vulture↔Peacock, Owl↔Cock.)
const BIRDS_BY_PAKSHA: Record<Paksha, Bird[]> = {
  Shukla:  ["Vulture", "Owl", "Crow", "Cock", "Peacock"],
  Krishna: ["Peacock", "Cock", "Crow", "Owl", "Vulture"],
};

// Tolerate spelling variants from the chart DB.
const ALIASES: Record<string, string> = {
  Moola: "Mula", Aslesha: "Ashlesha", Ashwani: "Ashwini", Aswini: "Ashwini",
  Mrigasira: "Mrigashira", Mrigashirsha: "Mrigashira", Arudra: "Ardra", Aardra: "Ardra",
  Poorvashada: "Purva Ashadha", Uttarashada: "Uttara Ashadha", Sravana: "Shravana",
  Dhanishtha: "Dhanishta", Satabhisha: "Shatabhisha", Shatabhishak: "Shatabhisha",
  "Uttara Bhadra": "Uttara Bhadrapada", "Purva Bhadra": "Purva Bhadrapada", Revathi: "Revati",
};

function groupIndex(nakshatra: string): number {
  const key = ALIASES[nakshatra.trim()] ?? nakshatra.trim();
  return GROUPS.findIndex((g) => g.includes(key));
}

/** Your bird from birth nakshatra + birth paksha. */
export function getBird(nakshatra: string | null | undefined, paksha: Paksha): Bird | null {
  if (!nakshatra) return null;
  const gi = groupIndex(nakshatra);
  return gi >= 0 ? BIRDS_BY_PAKSHA[paksha][gi] : null;
}

/** Birth paksha from natal Sun/Moon longitudes. Moon ahead of Sun by 0–180° = Shukla. */
export function pakshaFromSunMoon(sunLongitude: number, moonLongitude: number): Paksha {
  const diff = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  return diff < 180 ? "Shukla" : "Krishna";
}
