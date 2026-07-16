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
  /** The native's tara standing for the day (personal layer; null = collective-only read). */
  tara?: { quality: "good" | "bad" | "mixed"; taraNum: number; cycle: number } | null;
}

export interface DayCharacter {
  nature: DayNature;
  family: TithiFamily;
  /** THE HANDSHAKE — which task KINDS (the seven natures as act-kinds) this day supports
      for this native; empty on contained/hostile-star days. */
  supportedKinds: DayNature[];
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
  // fierce day the two agree (the cut is supported); on any other nature the day EMPTIES —
  // no supports at all (the old "severing only" line contradicted the gentle natures'
  // own avoid-lists: David's July 12, "supports cutting… keep away from cutting").
  if (family === "rikta") {
    supports = nature === "sharp" || nature === "fierce"
      ? [...natDef.supports, ...famDef.supports]
      : [];
    vetoes.push("the day runs on empty — nothing new unless it severs");
  }
  // Vishti: no initiating, whatever else the day offers.
  if (input.vishti) {
    vetoes.push("the day's grain blocks starting — continue, don't begin");
    supports = supports.filter((s) => !/beginn|launch|starting|new /i.test(s));
  }
  // The personal layer outranks the collective (weather-gate law, canon underneath).
  const contained = !!(input.tara && input.tara.quality === "bad" && input.tara.taraNum === 7);
  if (contained) vetoes.push("your loss-star at full force — nothing forward, nothing new, contain");

  const headline = `${NATURE_LABEL[nature]} ${FAMILY_LABEL[family]}`;
  // A nature may carry David's own plain movement line (avoidPlain) — it replaces the
  // book's item-list in the SENTENCE (the items stay in `avoid` for detail views).
  const avoidPlain = (natDef as any).avoidPlain as string | undefined;
  // A nature may also carry David's plain SUPPORTS line (supportsPlain) — the sentence
  // speaks his register; the canonical item-list (incl. the literal surgery election)
  // stays in `supports` for detail views and the reading's reach (2026-07-15, his pick A).
  const supportsPlain = (natDef as any).supportsPlain as string | undefined;
  // THE PERSONAL TURN (David 2026-07-15, the 7/29 golden-restraint conflict — "those
  // tooltip hero sentence suggestions are perfect"): a hostile personal star closes the
  // collective sentence — the world can run with the day; this native doesn't.
  const personalTurn = !contained && input.tara && input.tara.quality === "bad"
    ? " The wider world can run with this day — you don't. Tend what's yours, small and careful."
    : "";
  const sentence = contained
    ? "Your own star turns the day inward — however the sky reads, keep everything small, finish nothing new, and let it pass."
    : supports.length === 0
    // The empty current under a GOOD star = receptive winning (David 2026-07-15: "a
    // possible win… no forceful pushing" — his words, his edit).
    ? (input.tara?.quality === "good"
        ? `${cap(headline)} — but your star is carried today: a win is possible. No forceful pushing. Let it come; don't chase it.`
        : `${cap(headline)} — start nothing, grow nothing, cut nothing you don't have to. Let it pass quietly.${personalTurn}`)
    : `${cap(headline)} — ${supportsPlain ?? `it supports ${listOf(supports.slice(0, 3))}`}.${avoidPlain ? ` ${avoidPlain}` : avoid.length ? ` Keep away from ${listOf(avoid.slice(0, 2))}.` : ""}${personalTurn}`;

  // THE HANDSHAKE (David 2026-07-15: "just do it. We can always roll it back"): the day's
  // supports ARE the seven kinds. The day names which KINDS of act it carries: its own
  // nature's kind; an empty tithi keeps only the cutting kinds (on the cutting natures);
  // a contained or personally hostile day supports NOTHING for this native.
  let supportedKinds: DayNature[] = [nature];
  if (family === "rikta") supportedKinds = nature === "sharp" || nature === "fierce" ? Array.from(new Set(["sharp", nature] as DayNature[])) : [];
  if (contained || (input.tara && input.tara.quality === "bad")) supportedKinds = [];

  return {
    nature, family, headline, supportedKinds,
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

// ── THE SIX MOVEMENTS — David's day-mode words, canon-derived (2026-07-15) ──────────────────
// His vocabulary returns, re-grounded: the state derives from the classical character + the
// native's ladder, never from the retired mode tables. Order matters — the personal trumps
// the collective, the best trumps everything but stop.
export type Movement = "golden" | "action" | "selective" | "build" | "restraint" | "caution";
export const MOVEMENT_WORD: Record<Movement, string> = {
  golden: "Golden Day",   // the best — for anything
  action: "Action",       // outward movement, full go
  selective: "Selective", // tend, but finish something
  build: "Build",         // tend what's already present
  restraint: "Restraint", // tend, with extreme caution
  caution: "Caution",     // stop. stop. stop.
};

export function movementOf(
  c: DayCharacter,
  tara: { quality: "good" | "bad" | "mixed"; taraNum: number; cycle: number; favorable?: boolean } | null,
  isCrown: boolean,
  gates?: {
    /** Mercury in TRUE retrograde (the shadow does not count) — interpreter.ts's own terms. */
    mercuryRetro?: boolean;
    /** Near-stationary — the un-punchable core. */
    mercuryNearStation?: boolean;
    /** Favorable chandra (day Moon's house from the natal Moon). */
    chandraFavorable?: boolean;
  },
): Movement {
  if (tara && tara.quality === "bad" && tara.taraNum === 7 && tara.cycle === 1) return "caution";
  if (isCrown) return "golden";
  if (tara && tara.quality === "bad") return "restraint";
  // The empty tithi rules the movement: nothing new, nothing grown — Restraint; unless the
  // day's nature is a cutting one, where the sanctioned severing makes it Selective (finish/
  // end something). This was the old bridge's rule that never made it into movementOf —
  // David's hand caught it (he painted July 3 rose before the engine agreed).
  if (c.family === "rikta") return (c.nature === "sharp" || c.nature === "fierce") ? "selective" : "restraint";
  // Selective = the day itself asks for finishing: a full current, or the blocked karana.
  // (Mercury does NOT create Selective — the shipped rx law caps Action at Build, below.)
  if (c.family === "purna" || c.vetoes.some((v) => v.includes("blocks starting"))) return "selective";
  if (tara?.quality === "good" && (c.nature === "movable" || c.nature === "swift")) {
    // THE RX-CONTEST LAW, verbatim from interpreter.ts: Mercury retrograde caps Action at
    // Build — unless a strong Moon (favorable tara AND chandra) punches through off the core.
    if (gates?.mercuryRetro) {
      const punch = !!tara?.favorable && !!gates.chandraFavorable && !gates.mercuryNearStation;
      if (!punch) return "build";
    }
    return "action";
  }
  return "build";
}


/** The rx-capped sentence — when Mercury holds a GO day down to Build, the words must hold
 *  it too (David's July 14: "Build" over "quick errands, trade and sales" read as conflict). */
export function cappedSentence(nature: DayNature, headline: string): string {
  const carry = nature === "swift"
    ? "the speed wants out — spend it on revisits, follow-ups, and finishing, not on launches"
    : "the shift wants to happen — prepare it, pack for it, don't launch it";
  return `${headline.charAt(0).toUpperCase()}${headline.slice(1)} — but Mercury holds the launch today; ${carry}.`;
}
