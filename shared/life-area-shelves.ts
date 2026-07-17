/**
 * THE LIFE-AREA SHELVES (David 2026-07-16: "money alone can mean so many things… DO THIS
 * PLEASE") — the circles treatment for life areas. Each big area breaks into its precise
 * classical seats; the picker shows shelves behind collapsed rows per THE MANTRA (low
 * friction, aesthetic elegance). Every sub-area routes to a PARENT area (the book-backed
 * varga registry in server/vedic/life-areas.ts) and carries a FOCUS — the exact seat
 * (houses + karaka + meaning) the reading must aim at. Whole-sign houses; the tradition's
 * own decomposition (e.g. salary = the 10th's money = the 11th, by bhavat bhavam).
 */
export type AreaFocus = { key: string; label: string; houses: number[]; karaka: string; blurb: string };
export type SubArea = AreaFocus & { parent: string };

export const AREA_SHELVES: { label: string; areas: SubArea[] }[] = [
  { label: "Money", areas: [
    { key: "money_livelihood", label: "What feeds you", parent: "money", houses: [2], karaka: "Jupiter", blurb: "daily income, the work that pays, livelihood" },
    { key: "money_kept", label: "What you keep", parent: "money", houses: [2], karaka: "Jupiter", blurb: "savings, assets, what is stored and held" },
    { key: "money_gains", label: "What arrives", parent: "money", houses: [11], karaka: "Jupiter", blurb: "gains, windfalls, what accumulates" },
    { key: "money_salary", label: "What the position pays", parent: "money", houses: [10, 11], karaka: "Sun", blurb: "salary and the seat's pay — the 10th's own money house is the 11th" },
    { key: "money_fortune", label: "Luck money", parent: "money", houses: [9], karaka: "Jupiter", blurb: "fortune, grace, the unearned" },
    { key: "money_debts", label: "Owed money", parent: "money", houses: [6], karaka: "Mars", blurb: "debts, drains, what leaks" },
    { key: "money_shared", label: "Shared & inherited", parent: "money", houses: [8], karaka: "Saturn", blurb: "joint accounts, inheritance, insurance, the partner's resources" },
    { key: "money_risked", label: "Risked money", parent: "money", houses: [5], karaka: "Jupiter", blurb: "investments, speculation, ventures" },
  ]},
  { label: "Love", areas: [
    { key: "love_union", label: "The union", parent: "love", houses: [7], karaka: "Venus", blurb: "marriage, life partnership, the one across from you" },
    { key: "love_romance", label: "Romance", parent: "love", houses: [5], karaka: "Venus", blurb: "courtship, the spark, affairs of the heart" },
    { key: "love_bed", label: "The bed", parent: "love", houses: [12], karaka: "Venus", blurb: "intimacy, pleasure, what happens in private" },
    { key: "love_friend", label: "The beloved friend", parent: "love", houses: [11], karaka: "Venus", blurb: "love that lives as friendship" },
  ]},
  { label: "Calling", areas: [
    { key: "calling_standing", label: "The standing", parent: "career", houses: [10], karaka: "Sun", blurb: "rank, title, how the world receives you" },
    { key: "calling_craft", label: "The craft", parent: "career", houses: [3], karaka: "Mercury", blurb: "the skill of the hands, the daily craft" },
    { key: "calling_service", label: "The daily work", parent: "career", houses: [6], karaka: "Saturn", blurb: "the workplace, duty, service, the grind" },
    { key: "calling_venture", label: "The venture", parent: "career", houses: [3, 5], karaka: "Mars", blurb: "what you start — initiative and the gamble of beginning" },
  ]},
  { label: "Family", areas: [
    { key: "family_mother", label: "Mother", parent: "parents", houses: [4], karaka: "Moon", blurb: "mother and the ground she gave you" },
    { key: "family_father", label: "Father", parent: "parents", houses: [9], karaka: "Sun", blurb: "father and the line he carries" },
    { key: "family_siblings", label: "Blood & inner circle", parent: "siblings", houses: [3], karaka: "Mars", blurb: "siblings by blood and the chosen closest few" },
    { key: "family_roots", label: "The line & its karma", parent: "parents", houses: [4, 9], karaka: "Jupiter", blurb: "ancestry, lineage, what the line hands down" },
  ]},
  { label: "Home", areas: [
    { key: "home_hearth", label: "The home itself", parent: "home", houses: [4], karaka: "Moon", blurb: "the dwelling, the hearth, the inner ground" },
    { key: "home_land", label: "Land & property", parent: "home", houses: [4], karaka: "Mars", blurb: "land, real estate, vehicles, what is deeded" },
    { key: "home_moves", label: "The move", parent: "home", houses: [4, 12], karaka: "Moon", blurb: "relocation, the change of ground" },
  ]},
  { label: "Body", areas: [
    { key: "body_vitality", label: "Vitality", parent: "health", houses: [1], karaka: "Sun", blurb: "the body's strength and fire" },
    { key: "body_illness", label: "Illness & recovery", parent: "health", houses: [6], karaka: "Mars", blurb: "acute illness, treatment, the fight back" },
    { key: "body_hidden", label: "The chronic & hidden", parent: "health", houses: [8], karaka: "Saturn", blurb: "the long conditions, the hidden processes" },
    { key: "body_rest", label: "Sleep & restoration", parent: "health", houses: [12, 4], karaka: "Moon", blurb: "sleep, rest, the body's repair" },
  ]},
  { label: "Children & creations", areas: [
    { key: "create_children", label: "Children", parent: "children", houses: [5], karaka: "Jupiter", blurb: "children — having them, raising them" },
    { key: "create_art", label: "What you make", parent: "children", houses: [5, 3], karaka: "Venus", blurb: "art, works, what you birth into the world" },
    { key: "create_students", label: "Students & mentees", parent: "children", houses: [5], karaka: "Jupiter", blurb: "those who learn from you" },
  ]},
  { label: "Spirit & the road", areas: [
    { key: "spirit_faith", label: "Faith & meaning", parent: "purpose", houses: [9], karaka: "Jupiter", blurb: "belief, dharma, the teacher found" },
    { key: "spirit_study", label: "Deep study", parent: "purpose", houses: [4, 5], karaka: "Mercury", blurb: "learning, study, the trained mind" },
    { key: "spirit_release", label: "Retreat & release", parent: "purpose", houses: [12], karaka: "Ketu", blurb: "solitude, endings, moksha, the letting-go" },
    { key: "spirit_journeys", label: "Journeys near & far", parent: "purpose", houses: [3, 9], karaka: "Jupiter", blurb: "travel — the short road and the long one" },
  ]},
];

export const SUB_AREAS: SubArea[] = AREA_SHELVES.flatMap((s) => s.areas);
export const AREA_LABEL: Record<string, string> = Object.fromEntries(SUB_AREAS.map((a) => [a.key, a.label]));

/** Resolve any picker key: a sub-area returns its parent + focus; unknown returns null. */
export function resolveArea(key: string): { parent: string; focus: AreaFocus } | null {
  const a = SUB_AREAS.find((x) => x.key === key);
  return a ? { parent: a.parent, focus: { key: a.key, label: a.label, houses: a.houses, karaka: a.karaka, blurb: a.blurb } } : null;
}
