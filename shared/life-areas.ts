// Life areas a project can be tagged with, each mapped to the astrological house(s) it
// covers. The day's domain (the activated house from the panchang/Moon trigger) is matched
// against a project's areas so the day's astrology can surface that project's tasks in
// "Why now?". Stored on projects.lifeAreas as a JSON array of these keys.

export type LifeAreaKey =
  | "self_care" | "home" | "money" | "work" | "relationships" | "creativity"
  | "learning" | "community" | "health" | "intimacy" | "rest";

export const LIFE_AREAS: { key: LifeAreaKey; label: string; houses: number[] }[] = [
  { key: "self_care",     label: "Self care",            houses: [1, 4] },  // body + identity + home
  { key: "home",          label: "Home & Family",        houses: [4] },
  { key: "money",         label: "Money & Finances",     houses: [2] },
  { key: "work",          label: "Work & Career",        houses: [6, 10] },
  { key: "relationships", label: "Relationships",        houses: [7] },
  { key: "creativity",    label: "Creativity & Romance", houses: [5] },
  { key: "learning",      label: "Learning & Belief",    houses: [3, 9] },
  { key: "community",     label: "Community & Friends",  houses: [11] },
  { key: "health",        label: "Health & Body",        houses: [1, 6] },
  { key: "intimacy",      label: "Intimacy & Shared",    houses: [8] },
  { key: "rest",          label: "Rest & Spirit",        houses: [12] },
];

export const LIFE_AREA_BY_KEY: Record<string, { label: string; houses: number[] }> =
  Object.fromEntries(LIFE_AREAS.map((a) => [a.key, { label: a.label, houses: a.houses }]));

/** Parse the stored JSON-string column into a list of valid area keys. */
export function parseLifeAreas(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x in LIFE_AREA_BY_KEY) : [];
  } catch {
    return [];
  }
}

/** All houses covered by a set of area keys. */
export function housesForAreas(keys: string[]): number[] {
  const set = new Set<number>();
  for (const k of keys) for (const h of LIFE_AREA_BY_KEY[k]?.houses ?? []) set.add(h);
  return Array.from(set);
}

/** Given the day's domain house(s) and a project's area keys, the matching area labels. */
export function matchedAreaLabels(dayHouses: number[], keys: string[]): string[] {
  const days = new Set(dayHouses);
  return keys
    .map((k) => LIFE_AREA_BY_KEY[k])
    .filter(Boolean)
    .filter((a) => a.houses.some((h) => days.has(h)))
    .map((a) => a.label);
}
