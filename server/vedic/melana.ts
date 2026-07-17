/**
 * MELANA — the combined-reading engine (David blessed 2026-07-16: "2 & 3 should work
 * perfect"). Aṣṭakūṭa Moon-to-Moon matching, Velea-shaped:
 *  · VARṆA IS DROPPED (David's call) — the caste gate; its absence is explained, not hidden.
 *  · TĀRĀ IS DIRECTIONAL and never folded — two one-way currents, the tradition's own
 *    asymmetry (count A→B and B→A separately through the nine tārās).
 *  · DAŚĀ CONCURRENCE rides in the BASE reading (assembled in the router — two clocks).
 * Tables are standard published melana material, WRITTEN FROM STANDARD SOURCES and flagged
 * for verification against David's canon drop (B.V. Raman, Muhūrta Chintāmaṇi) — the canon
 * folder holds no melana chapter yet (see velea-combined-two-profile-reading memory).
 * Deterministic, pure, tested. The LLM only voices what this module locates.
 */

const NAKS = [
  "ashwini", "bharani", "krittika", "rohini", "mrigashira", "ardra", "punarvasu", "pushya", "ashlesha",
  "magha", "purvaphalguni", "uttaraphalguni", "hasta", "chitra", "swati", "vishakha", "anuradha", "jyeshtha",
  "mula", "purvaashadha", "uttaraashadha", "shravana", "dhanishta", "shatabhisha", "purvabhadrapada", "uttarabhadrapada", "revati",
];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Index a nakshatra name from any of the app's spellings (fuzzy: normalized prefix match). */
export function nakIndex(name: string): number {
  const n = norm(name);
  let i = NAKS.indexOf(n);
  if (i >= 0) return i;
  i = NAKS.findIndex((k) => k.startsWith(n.slice(0, 6)) || n.startsWith(k.slice(0, 6)));
  return i;
}

// ── TĀRĀ — the nine, counted DIRECTIONALLY (A's star → B's star, inclusive, mod 9) ──
const TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyari", "Sadhaka", "Vadha", "Mitra", "Parama Mitra"];
const TARA_FAVORABLE = new Set([1, 3, 5, 7, 8]); // Sampat, Kshema, Sadhaka, Mitra, Parama Mitra (0-indexed)
export function taraCurrent(fromNak: string, toNak: string): { count: number; tara: string; favorable: boolean } | null {
  const a = nakIndex(fromNak), b = nakIndex(toNak);
  if (a < 0 || b < 0) return null;
  const count = ((b - a + 27) % 27) % 9; // 0 = Janma
  return { count: count + 1, tara: TARA_NAMES[count], favorable: TARA_FAVORABLE.has(count) };
}

// ── GAṆA (max 6) — temperament class ──
const GANA: Record<string, "deva" | "manushya" | "rakshasa"> = Object.fromEntries([
  ...["ashwini", "mrigashira", "punarvasu", "pushya", "hasta", "swati", "anuradha", "shravana", "revati"].map((k) => [k, "deva"]),
  ...["bharani", "rohini", "ardra", "purvaphalguni", "uttaraphalguni", "purvaashadha", "uttaraashadha", "purvabhadrapada", "uttarabhadrapada"].map((k) => [k, "manushya"]),
  ...["krittika", "ashlesha", "magha", "chitra", "vishakha", "jyeshtha", "mula", "dhanishta", "shatabhisha"].map((k) => [k, "rakshasa"]),
]) as any;
export function ganaKuta(nakA: string, nakB: string): { a: string; b: string; points: number; max: 6 } | null {
  const a = GANA[NAKS[nakIndex(nakA)] ?? ""], b = GANA[NAKS[nakIndex(nakB)] ?? ""];
  if (!a || !b) return null;
  // Connection-agnostic symmetric table (classical direction nuances noted for the canon pass).
  const points = a === b ? 6 : (a === "rakshasa" || b === "rakshasa") ? ((a === "deva" || b === "deva") ? 1 : 0) : 5;
  return { a, b, points, max: 6 };
}

// ── YONI (max 4) — instinct pairing. Same=4 · sworn enemies=0 · otherwise 2 (graded
//    14×14 matrix awaits the canon drop; the enemy pairs are the standard set). ──
const YONI: Record<string, string> = Object.fromEntries([
  ["ashwini", "horse"], ["bharani", "elephant"], ["krittika", "goat"], ["rohini", "serpent"], ["mrigashira", "serpent"],
  ["ardra", "dog"], ["punarvasu", "cat"], ["pushya", "goat"], ["ashlesha", "cat"], ["magha", "rat"],
  ["purvaphalguni", "rat"], ["uttaraphalguni", "cow"], ["hasta", "buffalo"], ["chitra", "tiger"], ["swati", "buffalo"],
  ["vishakha", "tiger"], ["anuradha", "deer"], ["jyeshtha", "deer"], ["mula", "dog"], ["purvaashadha", "monkey"],
  ["uttaraashadha", "mongoose"], ["shravana", "monkey"], ["dhanishta", "lion"], ["shatabhisha", "horse"],
  ["purvabhadrapada", "lion"], ["uttarabhadrapada", "cow"], ["revati", "elephant"],
]);
const YONI_ENEMIES: [string, string][] = [
  ["cow", "tiger"], ["elephant", "lion"], ["horse", "buffalo"], ["dog", "deer"], ["serpent", "mongoose"], ["monkey", "goat"], ["cat", "rat"],
];
export function yoniKuta(nakA: string, nakB: string): { a: string; b: string; points: number; max: 4 } | null {
  const a = YONI[NAKS[nakIndex(nakA)] ?? ""], b = YONI[NAKS[nakIndex(nakB)] ?? ""];
  if (!a || !b) return null;
  const enemy = YONI_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return { a, b, points: a === b ? 4 : enemy ? 0 : 2, max: 4 };
}

// ── NĀḌĪ (max 8) — the heaviest gate; same nāḍī is the classical veto ──
const NADI: Record<string, "adi" | "madhya" | "antya"> = Object.fromEntries([
  ...["ashwini", "ardra", "punarvasu", "uttaraphalguni", "hasta", "jyeshtha", "mula", "shatabhisha", "purvabhadrapada"].map((k) => [k, "adi"]),
  ...["bharani", "mrigashira", "pushya", "purvaphalguni", "chitra", "anuradha", "purvaashadha", "dhanishta", "uttarabhadrapada"].map((k) => [k, "madhya"]),
  ...["krittika", "rohini", "ashlesha", "magha", "swati", "vishakha", "uttaraashadha", "shravana", "revati"].map((k) => [k, "antya"]),
]) as any;
export function nadiKuta(nakA: string, nakB: string): { a: string; b: string; points: number; max: 8 } | null {
  const a = NADI[NAKS[nakIndex(nakA)] ?? ""], b = NADI[NAKS[nakIndex(nakB)] ?? ""];
  if (!a || !b) return null;
  return { a, b, points: a === b ? 0 : 8, max: 8 };
}

// ── BHAKŪṬA (max 7) — the Moon-sign axis. Classical doṣa axes score 0: 2/12, 5/9, 6/8.
//    (NOTE: 5/9 is a trine — auspicious in general lore, doṣa in bhakūṭa specifically;
//    divergence flagged for the canon pass, scored classically here.) ──
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export function bhakootKuta(signA: string, signB: string): { axis: string; points: number; max: 7 } | null {
  const a = SIGNS.indexOf(signA), b = SIGNS.indexOf(signB);
  if (a < 0 || b < 0) return null;
  const d1 = ((b - a + 12) % 12) + 1, d2 = ((a - b + 12) % 12) + 1;
  const axis = `${Math.min(d1, d2)}/${Math.max(d1, d2)}`;
  const dosha = ["2/12", "5/9", "6/8"].includes(axis);
  return { axis, points: dosha ? 0 : 7, max: 7 };
}

// ── VAŚYA (max 2) — mutual pull between the Moon signs ──
const VASHYA: Record<string, string[]> = {
  Aries: ["Leo", "Scorpio"], Taurus: ["Cancer", "Libra"], Gemini: ["Virgo"],
  Cancer: ["Scorpio", "Sagittarius"], Leo: ["Libra"], Virgo: ["Pisces", "Gemini"],
  Libra: ["Capricorn", "Virgo"], Scorpio: ["Cancer"], Sagittarius: ["Pisces"],
  Capricorn: ["Aries", "Aquarius"], Aquarius: ["Aries"], Pisces: ["Capricorn"],
};
export function vashyaKuta(signA: string, signB: string): { points: number; max: 2 } | null {
  if (!SIGNS.includes(signA) || !SIGNS.includes(signB)) return null;
  if (signA === signB) return { points: 2, max: 2 };
  const ab = (VASHYA[signA] ?? []).includes(signB), ba = (VASHYA[signB] ?? []).includes(signA);
  return { points: ab && ba ? 2 : ab || ba ? 1 : 0, max: 2 };
}

// ── GRAHA MAITRĪ (max 5) — the Moon-lords' natural friendship (canon table) ──
import friendships from "./canon/planetary-friendships.json" with { type: "json" };
const SIGN_LORD: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
function rel(p1: string, p2: string): "friend" | "neutral" | "enemy" {
  if (p1 === p2) return "friend";
  const f = (friendships as any).friendships[p1];
  if (!f) return "neutral";
  return f.friends.includes(p2) ? "friend" : f.enemies.includes(p2) ? "enemy" : "neutral";
}
export function maitriKuta(signA: string, signB: string): { lordA: string; lordB: string; aToB: string; bToA: string; points: number; max: 5 } | null {
  const lordA = SIGN_LORD[signA], lordB = SIGN_LORD[signB];
  if (!lordA || !lordB) return null;
  const aToB = rel(lordA, lordB), bToA = rel(lordB, lordA);
  const pair = [aToB, bToA].sort().join("-");
  const points = pair === "friend-friend" ? 5 : pair === "friend-neutral" ? 4 : pair === "neutral-neutral" ? 3 : pair === "enemy-friend" ? 1 : pair === "enemy-neutral" ? 1 : 0;
  return { lordA, lordB, aToB, bToA, points, max: 5 };
}

// ── KUJA DOṢA — Mars in the classical houses from the lagna; balanced when shared ──
const KUJA_HOUSES = new Set([1, 4, 7, 8, 12]);
export function kujaDosha(marsHouseFromLagna: number | null | undefined): boolean {
  return marsHouseFromLagna != null && KUJA_HOUSES.has(marsHouseFromLagna);
}

// ── THE ASSEMBLY ──
export type MelanaResult = {
  currents: { aToB: ReturnType<typeof taraCurrent>; bToA: ReturnType<typeof taraCurrent> };
  gates: { gana: any; yoni: any; nadi: any; bhakoot: any; vashya: any; maitri: any };
  score: { points: number; max: number };
  kuja: { a: boolean; b: boolean; balanced: boolean };
  varnaNote: string;
};
export function computeMelana(args: {
  nakA: string; nakB: string; moonSignA: string; moonSignB: string;
  marsHouseA?: number | null; marsHouseB?: number | null;
}): MelanaResult {
  const gates = {
    gana: ganaKuta(args.nakA, args.nakB),
    yoni: yoniKuta(args.nakA, args.nakB),
    nadi: nadiKuta(args.nakA, args.nakB),
    bhakoot: bhakootKuta(args.moonSignA, args.moonSignB),
    vashya: vashyaKuta(args.moonSignA, args.moonSignB),
    maitri: maitriKuta(args.moonSignA, args.moonSignB),
  };
  const scored = Object.values(gates).filter(Boolean) as { points: number; max: number }[];
  const kujaA = kujaDosha(args.marsHouseA), kujaB = kujaDosha(args.marsHouseB);
  return {
    currents: { aToB: taraCurrent(args.nakA, args.nakB), bToA: taraCurrent(args.nakB, args.nakA) },
    gates,
    score: { points: scored.reduce((s, g) => s + g.points, 0), max: scored.reduce((s, g) => s + g.max, 0) },
    kuja: { a: kujaA, b: kujaB, balanced: kujaA === kujaB },
    varnaNote: "Varna kuta is deliberately omitted — it is a caste-compatibility artifact; Velea does not score people by station.",
  };
}
