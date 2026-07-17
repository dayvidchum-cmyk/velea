/**
 * MELANA — the combined-reading engine (David blessed 2026-07-16: "2 & 3 should work
 * perfect"). Aṣṭakūṭa Moon-to-Moon matching, Velea-shaped:
 *  · VARṆA IS DROPPED (David's call) — the caste gate; its absence is explained, not hidden.
 *  · TĀRĀ IS DIRECTIONAL and never folded — two one-way currents, the tradition's own
 *    asymmetry (count A→B and B→A separately through the nine tārās).
 *  · DAŚĀ CONCURRENCE rides in the BASE reading (assembled in the router — two clocks).
 * CANON-VERIFIED 2026-07-17 against David's scans (B.V. Raman, Muhurtha 1948 + the
 * Muhūrta Chintāmaṇi with Maṇiprabhā commentary) — full extraction with page cites in
 * canon/melana.json ("This is Jyeshtha, renewed"). Corrections applied: melana tārā
 * treats janma as favorable (MC p.177); gaṇa is DIRECTIONAL (MC p.183 grid); maitrī
 * friend+enemy = 2 (MC p.181 grid); kuja = houses 2/12/4/7/8 from Lagna, Moon AND Venus
 * with Raman's eight cancellations (pp.98-100); bhakūṭa + nāḍī cancellations in.
 * Where the two sources disagree, both readings live in the canon file; no winner picked.
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
// MELANA rule (MC p.177, stated twice + the 9×9 chakra): only Vipat, Pratyari, Vadha
// are hostile — JANMA IS FAVORABLE here (the engine's old set was Raman's ELECTION tārā).
const TARA_UNFAVORABLE = new Set([2, 4, 6]); // Vipat, Pratyari, Vadha (0-indexed)
export function taraCurrent(fromNak: string, toNak: string): { count: number; tara: string; favorable: boolean } | null {
  const a = nakIndex(fromNak), b = nakIndex(toNak);
  if (a < 0 || b < 0) return null;
  const count = ((b - a + 27) % 27) % 9; // 0 = Janma
  return { count: count + 1, tara: TARA_NAMES[count], favorable: !TARA_UNFAVORABLE.has(count) };
}

// ── GAṆA (max 6) — temperament class ──
const GANA: Record<string, "deva" | "manushya" | "rakshasa"> = Object.fromEntries([
  ...["ashwini", "mrigashira", "punarvasu", "pushya", "hasta", "swati", "anuradha", "shravana", "revati"].map((k) => [k, "deva"]),
  ...["bharani", "rohini", "ardra", "purvaphalguni", "uttaraphalguni", "purvaashadha", "uttaraashadha", "purvabhadrapada", "uttarabhadrapada"].map((k) => [k, "manushya"]),
  ...["krittika", "ashlesha", "magha", "chitra", "vishakha", "jyeshtha", "mula", "dhanishta", "shatabhisha"].map((k) => [k, "rakshasa"]),
]) as any;
/** The canon grid (MC p.183, rows = kanyā): same gaṇa 6 · kanyā-nara+vara-deva 5 ·
 *  kanyā-deva+vara-nara 4 · kanyā-deva+vara-rākṣasa 2 · kanyā-nara+vara-rākṣasa 1 ·
 *  kanyā-rākṣasa+vara-anything-else 0. Raman (p.186) confirms the direction. */
function ganaDirectional(kanya: string, vara: string): number {
  if (kanya === vara) return 6;
  if (kanya === "manushya" && vara === "deva") return 5;
  if (kanya === "deva" && vara === "manushya") return 4;
  if (kanya === "deva" && vara === "rakshasa") return 2;
  if (kanya === "manushya" && vara === "rakshasa") return 1;
  return 0; // kanyā rākṣasa with deva/manushya vara
}
export function ganaKuta(nakA: string, nakB: string): { a: string; b: string; aAsKanya: number; bAsKanya: number; points: number; max: 6 } | null {
  const a = GANA[NAKS[nakIndex(nakA)] ?? ""], b = GANA[NAKS[nakIndex(nakB)] ?? ""];
  if (!a || !b) return null;
  // Velea is connection-agnostic (no assumed bride/groom): BOTH orientations are computed
  // and shown — like the tārā currents — and the SCORE takes their mean (fractional totals
  // are native to the system: the Rāma–Sītā example totals 24½, MC p.190).
  const aAsKanya = ganaDirectional(a, b), bAsKanya = ganaDirectional(b, a);
  return { a, b, aAsKanya, bAsKanya, points: (aAsKanya + bAsKanya) / 2, max: 6 };
}

// ── YONI (max 4) — instinct pairing. Same=4 · sworn enemies=0 · otherwise 2. The enemy
//    pairs are CANON-CONFIRMED (MC p.179; Raman p.84 prints "monkey and cat" instead of
//    sheep–monkey — both recorded in canon/melana.json, no winner). The full 0–4 gradation
//    chakra exists (MC p.179, tiger×horse = 1) but several cells are uncertain in the worn
//    scan — NOT hard-coded until re-verified against MC p.179. ──
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
export function nadiKuta(
  nakA: string, nakB: string,
  ctx?: { rasiA?: string | null; rasiB?: string | null; padaA?: number | null; padaB?: number | null },
): { a: string; b: string; points: number; max: 8; cancelledBy?: string } | null {
  const a = NADI[NAKS[nakIndex(nakA)] ?? ""], b = NADI[NAKS[nakIndex(nakB)] ?? ""];
  if (!a || !b) return null;
  if (a !== b) return { a, b, points: 8, max: 8 };
  // Same nāḍī — the classical veto, UNLESS a canon exception applies (MC v.35, p.189):
  const sameNak = nakIndex(nakA) === nakIndex(nakB);
  if (ctx?.rasiA && ctx?.rasiB && ctx.rasiA === ctx.rasiB && !sameNak)
    return { a, b, points: 8, max: 8, cancelledBy: "same rāśi, different nakshatras — no nāḍī doṣa (MC v.35 p.189)" };
  if (sameNak && ctx?.rasiA && ctx?.rasiB && ctx.rasiA !== ctx.rasiB)
    return { a, b, points: 8, max: 8, cancelledBy: "same nakshatra, different rāśis — no nāḍī doṣa (MC v.35 p.189)" };
  if (sameNak && ctx?.padaA != null && ctx?.padaB != null && ctx.padaA !== ctx.padaB)
    return { a, b, points: 8, max: 8, cancelledBy: "same nakshatra, different pādas — no doṣa (MC v.35 p.189)" };
  return { a, b, points: 0, max: 8 };
}

// ── BHAKŪṬA (max 7) — the Moon-sign axis. Classical doṣa axes score 0: 2/12, 5/9, 6/8.
//    (NOTE: 5/9 is a trine — auspicious in general lore, doṣa in bhakūṭa specifically;
//    divergence flagged for the canon pass, scored classically here.) ──
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export function bhakootKuta(
  signA: string, signB: string,
  ctx?: { nadiDifferent?: boolean },
): { axis: string; points: number; max: 7; cancelledBy?: string } | null {
  const a = SIGNS.indexOf(signA), b = SIGNS.indexOf(signB);
  if (a < 0 || b < 0) return null;
  const d1 = ((b - a + 12) % 12) + 1, d2 = ((a - b + 12) % 12) + 1;
  const axis = `${Math.min(d1, d2)}/${Math.max(d1, d2)}`;
  const dosha = ["2/12", "5/9", "6/8"].includes(axis);
  if (!dosha) return { axis, points: 7, max: 7 };
  // Cancellations: same lord of both rāśis, or lords mutual friends (Raman p.85).
  // MC (v.32 p.186) conditions every parihāra on nāḍī-śuddhi — honored when ctx is given.
  const lordA = SIGN_LORD[signA], lordB = SIGN_LORD[signB];
  const nadiOk = ctx?.nadiDifferent !== false; // unknown context defaults to Raman's plain rule
  if (lordA && lordB && nadiOk) {
    if (lordA === lordB) return { axis, points: 7, max: 7, cancelledBy: `ekādhipatya — both rāśis ruled by ${lordA} (R p.85; MC v.32 p.186)` };
    if (rel(lordA, lordB) === "friend" && rel(lordB, lordA) === "friend")
      return { axis, points: 7, max: 7, cancelledBy: `rāśi lords ${lordA} and ${lordB} are mutual friends (R p.85; MC v.32 p.186)` };
  }
  return { axis, points: 0, max: 7 };
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
  // MC p.181 guṇa grid (cell-verified): friend+enemy = 2, neutral+enemy = 1 (the prose
  // line prints 0 for sama+śatru but contradicts its own grid — grid used, flagged in canon).
  const points = pair === "friend-friend" ? 5 : pair === "friend-neutral" ? 4 : pair === "neutral-neutral" ? 3 : pair === "enemy-friend" ? 2 : pair === "enemy-neutral" ? 1 : 0;
  return { lordA, lordB, aToB, bToA, points, max: 5 };
}

// ── KUJA DOṢA (Raman pp.98-100) — Mars in the 2nd/12th/4th/7th/8th (the 1st is NOT in
//    the stanza), reckoned from Lagna (weakest), Moon (stronger), and Venus (most powerful);
//    balanced when both charts carry it. Sign-conditional cancellations per house, the
//    Aquarius/Leo blanket exemption, and the Jupiter/Moon-conjunction counteraction. ──
const KUJA_HOUSES = new Set([2, 12, 4, 7, 8]);
const KUJA_EXEMPT_SIGN: Record<number, string[]> = {
  2: ["Gemini", "Virgo"], 12: ["Taurus", "Libra"], 4: ["Aries", "Scorpio"],
  7: ["Capricorn", "Cancer"], 8: ["Sagittarius", "Pisces"],
};
export function kujaDoshaFull(args: {
  marsSign: string; lagnaSign?: string | null; moonSign?: string | null; venusSign?: string | null;
  marsConjJupiterOrMoon?: boolean;
}): { present: boolean; from: string[]; cancelledBy: string[] } {
  const cancelledBy: string[] = [];
  if (args.marsSign === "Aquarius" || args.marsSign === "Leo") cancelledBy.push(`Mars in ${args.marsSign} — no dosha whatsoever (R p.99)`);
  if (args.marsConjJupiterOrMoon) cancelledBy.push("Mars conjunct Jupiter/Moon — counteracted (R p.100)");
  const from: string[] = [];
  const check = (ref: string | null | undefined, name: string) => {
    if (!ref) return;
    const h = ((SIGNS.indexOf(args.marsSign) - SIGNS.indexOf(ref) + 12) % 12) + 1;
    if (!KUJA_HOUSES.has(h)) return;
    if ((KUJA_EXEMPT_SIGN[h] ?? []).includes(args.marsSign)) { cancelledBy.push(`${h}th from ${name} but Mars in ${args.marsSign} — exempt (R pp.99-100)`); return; }
    from.push(`${h}th from ${name}`);
  };
  check(args.lagnaSign, "Lagna"); check(args.moonSign, "Moon"); check(args.venusSign, "Venus");
  const present = from.length > 0 && cancelledBy.filter((c) => c.includes("whatsoever") || c.includes("counteracted")).length === 0;
  return { present, from, cancelledBy };
}
/** Legacy simple check (lagna-house input) — kept for callers not yet on the full rule. */
export function kujaDosha(marsHouseFromLagna: number | null | undefined): boolean {
  return marsHouseFromLagna != null && KUJA_HOUSES.has(marsHouseFromLagna);
}

// ── THE ASSEMBLY ──
export type MelanaResult = {
  currents: { aToB: ReturnType<typeof taraCurrent>; bToA: ReturnType<typeof taraCurrent> };
  gates: { gana: any; yoni: any; nadi: any; bhakoot: any; vashya: any; maitri: any };
  score: { points: number; max: number };
  kuja: { a: any; b: any; balanced: boolean };
  varnaNote: string;
};
export function computeMelana(args: {
  nakA: string; nakB: string; moonSignA: string; moonSignB: string;
  // canon context (all optional — richer inputs unlock the canon's exceptions):
  padaA?: number | null; padaB?: number | null;
  lagnaSignA?: string | null; lagnaSignB?: string | null;
  marsSignA?: string | null; marsSignB?: string | null;
  venusSignA?: string | null; venusSignB?: string | null;
  marsConjA?: boolean; marsConjB?: boolean;
  // legacy path:
  marsHouseA?: number | null; marsHouseB?: number | null;
}): MelanaResult {
  const nadi = nadiKuta(args.nakA, args.nakB, { rasiA: args.moonSignA, rasiB: args.moonSignB, padaA: args.padaA, padaB: args.padaB });
  const gates = {
    gana: ganaKuta(args.nakA, args.nakB),
    yoni: yoniKuta(args.nakA, args.nakB),
    nadi,
    bhakoot: bhakootKuta(args.moonSignA, args.moonSignB, { nadiDifferent: (nadi?.points ?? 0) > 0 }),
    vashya: vashyaKuta(args.moonSignA, args.moonSignB),
    maitri: maitriKuta(args.moonSignA, args.moonSignB),
  };
  const scored = Object.values(gates).filter(Boolean) as { points: number; max: number }[];
  const kujaOf = (side: "A" | "B") => {
    const marsSign = side === "A" ? args.marsSignA : args.marsSignB;
    if (marsSign) {
      return kujaDoshaFull({
        marsSign,
        lagnaSign: side === "A" ? args.lagnaSignA : args.lagnaSignB,
        moonSign: side === "A" ? args.moonSignA : args.moonSignB,
        venusSign: side === "A" ? args.venusSignA : args.venusSignB,
        marsConjJupiterOrMoon: side === "A" ? args.marsConjA : args.marsConjB,
      });
    }
    const legacy = kujaDosha(side === "A" ? args.marsHouseA : args.marsHouseB);
    return { present: legacy, from: legacy ? ["lagna (legacy check)"] : [], cancelledBy: [] };
  };
  const kujaA = kujaOf("A"), kujaB = kujaOf("B");
  return {
    currents: { aToB: taraCurrent(args.nakA, args.nakB), bToA: taraCurrent(args.nakB, args.nakA) },
    gates,
    score: { points: scored.reduce((s, g) => s + g.points, 0), max: scored.reduce((s, g) => s + g.max, 0) },
    kuja: { a: kujaA, b: kujaB, balanced: kujaA.present === kujaB.present },
    varnaNote: "Varna kuta is deliberately omitted — it is a caste-compatibility artifact; Velea does not score people by station.",
  };
}
