/**
 * THE DAY FILTER — the classical muhurta classification that replaces Velea's four modes
 * (David 2026-07-15: "i want to eliminate my 4 modes and replace with how the books would
 * filter each day" · "use the standard classical tables").
 *
 * Two axes classify the collective day:
 *   NATURE — the day-star's kind (seven: fixed/movable/swift/tender/sharp/fierce/mixed),
 *   FAMILY — the tithi's kind (five: nanda/bhadra/jaya/rikta/purna),
 * the VARA colors it, and the vetoes gate it: Vishti karana (no initiating), Rikta
 * (nothing new unless it severs), a true Mercury retrograde (beginnings capped — the
 * contest, never a wall), and above all the native's PERSONAL ladder — a loss-star day
 * at full force stays quiet whatever the limbs say (the weather gate's law, canon under it).
 *
 * The output is a day CHARACTER: what the day supports, what it avoids, and one plain
 * sentence — a tilt to apply across many threads, never a single move (David's law).
 *
 * Tables: canon/muhurta-tables.json (standard classical allocations, cited there).
 * Pure: panchang facts in, character out. No ephemeris, no DB, no interpretation.
 */

import tables from "./canon/muhurta-tables.json";

export type DayNature = "fixed" | "movable" | "swift" | "tender" | "sharp" | "fierce" | "mixed";
export type TithiFamily = "nanda" | "bhadra" | "jaya" | "rikta" | "purna";

const NAK_TO_NATURE: Record<string, DayNature> = {};
for (const [nature, def] of Object.entries((tables as any).nakshatraNature)) {
  if (nature.startsWith("_")) continue;
  for (const n of (def as any).nakshatras) NAK_TO_NATURE[n.toLowerCase()] = nature as DayNature;
}
const FAMILY_OF_PAKSHA_TITHI: Record<number, TithiFamily> = {};
for (const [fam, def] of Object.entries((tables as any).tithiFamily)) {
  if (fam.startsWith("_")) continue;
  for (const t of (def as any).tithisInPaksha) FAMILY_OF_PAKSHA_TITHI[t] = fam as TithiFamily;
}

export const NATURE_LABEL: Record<DayNature, string> = {
  fixed: "a foundation day", movable: "a moving day", swift: "a quick-wins day",
  tender: "a tender day", sharp: "a cutting day", fierce: "a forceful day", mixed: "a steady day",
};
// Plain lived words — David 2026-07-15: "tithi in the hero headline = bad". The Sanskrit
// stays in the canon file; the reader gets the day as it is lived.
export const FAMILY_LABEL: Record<TithiFamily, string> = {
  nanda: "with joy in it", bhadra: "built for work", jaya: "built to win",
  rikta: "running on empty", purna: "made for finishing",
};

export interface DayFilterInput {
  /** The day's ruling nakshatra name (majority star). */
  nakshatra: string;
  /** Tithi number 1..30 (1..15 Shukla, 16..30 Krishna). */
  tithiNumber: number;
  /** Weekday lord ("Sun".."Saturn") — the vara. */
  varaLord: string;
  /** Vishti (Bhadra) karana running → initiating is vetoed. */
  vishti: boolean;
  /** A TRUE Mercury retrograde day (per the rx-contest law — station bands, not the whole course). */
  mercuryContest?: boolean;
  /** The native's tara standing for the day (personal layer; null = collective-only read). */
  tara?: { quality: "good" | "bad" | "mixed"; taraNum: number; cycle: number } | null;
}

export interface DayCharacter {
  nature: DayNature;
  family: TithiFamily;
  /** e.g. "a tender day in a work tithi". */
  headline: string;
  /** What the day supports (nature + family + vara, vetoes already applied). */
  supports: string[];
  /** What the day avoids. */
  avoid: string[];
  /** Active vetoes, named plainly. */
  vetoes: string[];
  /** The vara's coloring, one phrase. */
  varaColors: string;
  /** true when the personal ladder bottom silences the day (weather-gate law). */
  contained: boolean;
  /** One plain sentence — the day's tilt, for humans. */
  sentence: string;
}

export function dayFilter(input: DayFilterInput): DayCharacter {
  const nature = NAK_TO_NATURE[input.nakshatra.toLowerCase()] ?? "mixed";
  const inPaksha = ((input.tithiNumber - 1) % 15) + 1;
  const family = FAMILY_OF_PAKSHA_TITHI[inPaksha] ?? "bhadra";

  const natDef = (tables as any).nakshatraNature[nature];
  const famDef = (tables as any).tithiFamily[family];
  const varaColors = ((tables as any).vara[input.varaLord]?.colors as string) ?? "";

  let supports: string[] = [...natDef.supports, ...famDef.supports];
  const avoid: string[] = [...(natDef.avoid ?? []), ...(famDef.avoid ?? [])];
  const vetoes: string[] = [];

  // Rikta: the empty tithi keeps only severing acts — the family's own law. On a sharp or
  // fierce day the two agree (the cut is supported); on any other nature the day empties.
  if (family === "rikta") {
    supports = nature === "sharp" || nature === "fierce"
      ? [...natDef.supports, ...famDef.supports]
      : [...famDef.supports];
    vetoes.push("the day runs on empty — nothing new unless it severs");
  }
  // Vishti: no initiating, whatever else the day offers.
  if (input.vishti) {
    vetoes.push("the day's grain blocks starting — continue, don't begin");
    supports = supports.filter((s) => !/beginn|launch|starting|new /i.test(s));
  }
  // Mercury's contest: beginnings capped, never a wall.
  if (input.mercuryContest) {
    vetoes.push("beginnings are contested (Mercury) — finish and revise rather than launch");
    supports = supports.filter((s) => !/beginn|launch|starting/i.test(s));
  }

  // The personal layer outranks the collective (weather-gate law, canon underneath).
  const contained = !!(input.tara && input.tara.quality === "bad" && input.tara.taraNum === 7);
  if (contained) vetoes.push("your loss-star at full force — nothing forward, nothing new, contain");

  const headline = `${NATURE_LABEL[nature]} ${FAMILY_LABEL[family]}`;
  const sentence = contained
    ? "Your own star turns the day inward — however the sky reads, keep everything small, finish nothing new, and let it pass."
    : `${cap(headline)} — it supports ${listOf(supports.slice(0, 3))}${avoid.length ? `; keep away from ${listOf(avoid.slice(0, 2))}` : ""}.`;

  return {
    nature, family, headline,
    supports: dedupe(supports), avoid: dedupe(avoid), vetoes,
    varaColors, contained, sentence,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dedupe = (xs: string[]) => Array.from(new Set(xs));
const listOf = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;

// ── THE TASK BRIDGE — v1 compatibility only, NOT canon ─────────────────────────────────────
// Tasks are tagged Action/Build/Selective/Restraint in the schema. Until David migrates the
// task vocabulary (a schema pause-point), the character maps onto those tags so the scorer,
// gold dots and rest gate keep working with the four labels GONE from every surface.
export type BridgeMode = "Action" | "Build" | "Selective" | "Restraint";

export function bridgeMode(c: DayCharacter): BridgeMode {
  if (c.contained) return "Restraint";
  if (c.family === "rikta" && c.nature !== "sharp" && c.nature !== "fierce") return "Restraint";
  if (c.vetoes.length) return "Selective"; // vishti / Mercury contest: continue, don't begin
  if (c.nature === "swift" || c.nature === "movable") return "Action";
  if (c.nature === "fixed") return "Build";
  return "Selective"; // tender, sharp, fierce, mixed — the careful kinds
}
