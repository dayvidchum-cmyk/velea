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
import siddha from "./canon/siddha-yoga.json";

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
  /** Date (YYYY-MM-DD) used ONLY to rotate a nature's supportsPool line — stable all day. */
  dateSeed?: string;
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
  /** Amrita Siddhi Yoga — this weekday's own nakshatra (Raman, Muhurtha Ch.VI p.40). One of the
   *  strongest classical elections. NOT a guarantee: Raman says it makes the chances greatest. */
  amritaSiddhi: boolean;
  /** Raman's Siddha Yoga, and which of his two claims fired. Null when the day forms none. */
  siddhaYoga: SiddhaHit | null;
  /** true when the personal ladder bottom silences the day (weather-gate law). */
  contained: boolean;
  /** One plain sentence — the day's tilt, for humans. */
  sentence: string;
}

// ── ACT CLASSES (Velea's classification, NOT a canon table) ──────────────────────────────
// The canon gives each nature/family a list of supported ACTS in prose. A veto has to cancel
// the acts the canon says it cancels — but the code used to do that by regex-matching English
// ("beginn|launch|starting|new "), which caught 5 of the 47 strings and let travel, marriage,
// love and union, vows, foundations and planting straight through. Those are precisely the
// three things Bhadra forbids most (yatra, vivaha, any ārambha). A copy-edit to the prose also
// silently changed what a veto blocked.
//
// So each canon supports-string is classified once, here, by what KIND of act it is. This
// mapping is Velea's reading of the canon's own list — it is deliberately NOT written into
// muhurta-tables.json, because that file is the cited source and this is inference on top of it.
// ── PER-STAR SUPPORTS (David's doctrine, 2026-07-20, canon/seven-favorable-stars.md) ──────────
// The canon classifies 27 stars into 7 natures, and the day's `supports` came from the NATURE. For
// some stars that is not merely coarse, it is WRONG: Shatabhisha is classed movable, so the app told
// the reader a Shatabhisha day supports "travel, moves and relocations, vehicles" — the star of the
// Hundred Physicians, read as a good day to buy a car, because it shares a class with Swati.
//
// He gave the specific supports for seven stars traditionally named favourable in Muhurta, and was
// explicit that they are NOT universally lucky days: "the suitability of a day depends on the
// complete Muhurta… and the specific activity being undertaken." That is why the answer to "should
// the nature drive every star's score" was neither yes nor no — a single score is the wrong
// instrument. What the day supports is a LIST, and it belongs to the star.
//
// These OVERRIDE the nature list for these seven only. The other twenty keep the nature-level list,
// which is cited and correct at that grain. SOURCE: his method statement, recorded verbatim in
// canon/seven-favorable-stars.md — not a classical citation, and not to be mistaken for one.
const STAR_SUPPORTS: Record<string, string[]> = {
  "Uttara Phalguni":   ["marriage and partnerships", "contracts and legal agreements", "leadership responsibilities", "long-term commitments"],
  "Uttara Ashadha":    ["beginning long-term enterprises", "leadership responsibilities", "public responsibilities", "important life decisions"],
  "Uttara Bhadrapada": ["spiritual practice", "long-term financial planning", "research", "education", "building enduring foundations"],
  Hasta:               ["learning new skills", "beginning business activities", "artistic work", "writing", "negotiations", "healing and remedies", "crafts and technical work"],
  Punarvasu:           ["travel", "moves and relocations", "restarting projects", "education", "beginning business activities", "recovery and renewal"],
  Shravana:            ["studying", "teaching", "public speaking", "seeking advice", "organizing systems", "administrative work", "travel"],
  Shatabhisha:         ["medical treatment", "research", "scientific work", "meditation", "detoxification", "investigation and problem solving"],
  // ── THE REMAINING TWENTY (his complete table, 2026-07-20) ─────────────────────────────────────
  // He then gave all 27: "The remaining nakshatras are not 'good' or 'bad.' In classical Muhurta,
  // each belongs to a functional category. The question is what kind of work is the star designed
  // to support?" His nature for every star AGREES WITH THE CITED CANON on all 27 — checked, no
  // disagreements — so this adds specificity without contradicting the sourced table underneath.
  Ashwini:             ["healing and remedies", "travel", "new beginnings", "medicine"],
  Bharani:             ["difficult tasks", "discipline", "removing obstacles"],
  Krittika:            ["purification", "cutting away", "decisive action"],
  Rohini:              ["wealth and gain", "farming and planting", "starting construction", "marriage and partnerships", "beginning business activities"],
  Mrigashira:          ["romance", "networking", "artistic work", "education"],
  Ardra:               ["surgery", "research", "dismantling", "deep transformation"],
  Pushya:              ["education", "initiation", "nearly any constructive work"],
  Ashlesha:            ["investigation and problem solving", "psychology", "strategy", "occult work"],
  Magha:               ["leadership responsibilities", "ancestral rites", "authority"],
  "Purva Phalguni":    ["pleasure", "entertainment", "creative work"],
  Chitra:              ["design", "architecture", "beauty", "making things"],
  Swati:               ["trade and sales", "travel", "independence", "networking"],
  Vishakha:            ["growth", "ambition", "competition"],
  Anuradha:            ["friendship", "devotion", "diplomacy"],
  Jyeshtha:            ["protection", "leadership under pressure"],
  Mula:                ["research", "uprooting", "surgery", "spiritual inquiry"],
  "Purva Ashadha":     ["campaigns", "publicity", "competition"],
  // NOTE THE SPELLING. His table writes "Dhanishta"; the canon and the engine emit "Dhanishtha".
  // A key that does not match the emitted name is a silent no-op — the exact bug audit M11 found in
  // the nakshatra modifiers, where 'Dhanishta' never once matched. Canon spelling wins here.
  Dhanishtha:          ["beginning business activities", "music", "finance", "movement"],
  "Purva Bhadrapada":  ["austerity", "deep spiritual work", "intense change"],
  Revati:              ["travel", "completion and fulfilment", "prosperity", "protection"],
};

// ── AMRITA SIDDHI YOGA — CITED, at last (canon/muhurta-tables.json amritaSiddhiYoga) ──────────
// I refused to build this twice, saying there was "no cited source in this repo". David pushed back:
// "muhurta yogas and siddhi grids are definitely in the textbooks. i think you are making
// assumptions." He was right. The source was in his own library the whole time — B.V. Raman's
// Muhurtha, Chapter VI, p.40, the same book melana.json already cites — and I had never opened the
// folder. The refusal was defensible; not looking first was not.
//
// The verse gives ONE nakshatra per weekday. Raman is explicit about its weight and its limit:
// "chances of success of the enterprise would be by far the greatest" — chances, not certainty,
// which is exactly David's own calibration.
const VARA_WEEKDAY: Record<string, string> = {
  Sun: "Sunday", Moon: "Monday", Mars: "Tuesday", Mercury: "Wednesday",
  Jupiter: "Thursday", Venus: "Friday", Saturn: "Saturday",
};
const AMRITA_BY_WEEKDAY: Record<string, string> =
  ((tables as any).amritaSiddhiYoga?.byWeekday ?? {}) as Record<string, string>;

/** Is this weekday+star pairing Amrita Siddhi? Raman, Muhurtha Ch.VI p.40. */
export function amritaSiddhi(varaLord: string, nakshatra: string): boolean {
  const weekday = VARA_WEEKDAY[varaLord];
  return !!weekday && AMRITA_BY_WEEKDAY[weekday] === nakshatra;
}

// ── SIDDHA YOGA — the grid, encoded on David's ruling (canon/siddha-yoga.json) ────────────────
// Raman, Muhurtha Ch.VI pp.38-39. The grid needs weekday AND tithi AND nakshatra to coincide.
// Three OCR-mangled star names ("Uttara" bare, "Blwvishta", "Animidha") were left unencoded until
// he ruled on 2026-07-20: "make the names on the siddha yoga source grid match the spellings and
// names we have been using elsewhere" — so Uttara Phalguni, Dhanishtha and Anuradha respectively.
//
// TUESDAY IS GIVEN WITH NO TITHI LIST in the source. That is recorded as null and read as "the
// book states no tithi requirement", so the pairing rests on the star alone — NOT as "any tithi
// qualifies", which would be inventing a rule the page does not make.
export type SiddhaHit = { kind: "grid" | "weekday-tithi"; weekday: string; via: string };

/** Does this day form a Siddha Yoga? Returns HOW, so a reading can say which claim fired. */
export function siddhaYoga(varaLord: string, nakshatra: string, tithiNumber: number): SiddhaHit | null {
  const weekday = VARA_WEEKDAY[varaLord];
  if (!weekday) return null;
  const inPaksha = ((tithiNumber - 1) % 15) + 1;

  const row = (siddha as any).byWeekday?.[weekday];
  if (row && Array.isArray(row.nakshatras) && row.nakshatras.includes(nakshatra)) {
    const tithis: number[] | null = row.tithis ?? null;
    if (tithis === null) return { kind: "grid", weekday, via: `${weekday} with ${nakshatra}` };
    if (tithis.includes(inPaksha)) return { kind: "grid", weekday, via: `${weekday}, tithi ${inPaksha}, ${nakshatra}` };
  }

  // Raman's SECOND list: weekday x tithi family alone, no star required. A separate claim in the
  // book, so it is a separate branch here rather than a loosening of the grid.
  const fam: string | undefined = (siddha as any).weekdayTithiOnly?.[weekday];
  if (fam) {
    const members: number[] = (siddha as any).tithiFamilies?.[fam] ?? [];
    if (members.includes(inPaksha)) return { kind: "weekday-tithi", weekday, via: `${weekday} on ${fam} (tithi ${inPaksha})` };
  }
  return null;
}

type ActClass = "initiate" | "journey" | "union" | "celebrate" | "sever" | "complete" | "continue";
const ACT_CLASS: Record<string, ActClass> = {
  // a yoga speaking on an emptied rikta day — completion, never initiation
  "finishing what already stands": "complete", "closing out what was begun": "complete",
  "cutting away what is already finished": "sever",
  // per-star acts (STAR_SUPPORTS above)
  "new beginnings": "initiate", "medicine": "complete", "difficult tasks": "continue",
  "discipline": "continue", "removing obstacles": "sever", "purification": "sever",
  "cutting away": "sever", "decisive action": "sever", "wealth and gain": "initiate",
  "farming and planting": "initiate", "romance": "union", "surgery": "sever",
  "dismantling": "sever", "deep transformation": "sever", "initiation": "initiate",
  "nearly any constructive work": "initiate", "psychology": "continue", "strategy": "continue",
  "occult work": "continue", "ancestral rites": "celebrate", "authority": "continue",
  "pleasure": "celebrate", "entertainment": "celebrate", "creative work": "continue",
  "design": "continue", "architecture": "continue", "beauty": "celebrate",
  "making things": "continue", "independence": "initiate", "growth": "continue",
  "ambition": "continue", "competition": "continue", "friendship": "union",
  "devotion": "continue", "diplomacy": "continue", "protection": "continue",
  "leadership under pressure": "continue", "uprooting": "sever", "spiritual inquiry": "continue",
  "campaigns": "initiate", "publicity": "celebrate", "music": "celebrate", "finance": "continue",
  "movement": "journey", "austerity": "continue", "deep spiritual work": "continue",
  "intense change": "sever", "prosperity": "celebrate",
  "marriage and partnerships": "union", "contracts and legal agreements": "initiate",
  "leadership responsibilities": "continue", "long-term commitments": "initiate",
  "beginning long-term enterprises": "initiate", "public responsibilities": "continue",
  "important life decisions": "initiate", "spiritual practice": "continue",
  "long-term financial planning": "initiate", "research": "continue", "education": "continue",
  "building enduring foundations": "initiate", "learning new skills": "continue",
  "beginning business activities": "initiate", "artistic work": "continue", "writing": "continue",
  "negotiations": "continue", "crafts and technical work": "continue",
  // "networking" was UNCLASSIFIED until a self-audit caught it: it fell through to the
  // `?? "initiate"` default at the Vishti filter, so its veto behaviour was an accident rather
  // than a decision. Classed with the other acts that make a connection between people —
  // "marriage and partnerships", "romance", "friendship" are all union here.
  "networking": "union",
  // The Siddha grid's three (v878, Raman Ch. VI). Classed to MATCH what they already did — all
  // three were falling through the `?? "initiate"` default — so this changes no day's output; it
  // turns an accident into a decision. Raman's own sentence is electional ("applied with advantage
  // to important elections… chances of success of the ENTERPRISE"), and "begun with intent" says
  // beginning outright. The catch-all third goes with them: under Bhadra, over-blocking is the
  // safe direction, which is the rule the filter below already states.
  "important elections": "initiate",
  "good work begun with intent": "initiate",
  "anything you want the day to carry rather than merely allow": "initiate",
  "restarting projects": "initiate", "recovery and renewal": "complete", "studying": "continue",
  "teaching": "continue", "public speaking": "continue", "seeking advice": "continue",
  "organizing systems": "continue", "administrative work": "continue",
  "medical treatment": "complete", "scientific work": "continue", "meditation": "continue",
  "detoxification": "sever", "investigation and problem solving": "continue",
  // beginnings — anything that starts a thing that must endure
  "foundations": "initiate", "commitments meant to last": "initiate", "starting construction": "initiate",
  "gentle beginnings": "initiate", "beginnings of enjoyable things": "initiate", "planting": "initiate",
  "launches against resistance": "initiate", "new clothes and adornment": "initiate", "vows": "initiate",
  // journeys — yatra, the departure Bhadra forbids above all
  "travel": "journey", "moves and relocations": "journey", "vehicles": "journey",
  "change of direction": "journey", "anything meant to shift": "journey",
  // unions
  "marriage": "union", "love and union": "union", "friendship and reconciliation": "union",
  // celebration / auspicious gathering
  "festivity": "celebrate", "pleasure and celebration": "celebrate", "the arts": "celebrate",
  "art and music": "celebrate", "ceremonies": "celebrate",
  // krura karma — the cruel/severing deeds Bhadra actually PERMITS
  "cutting and severing acts only": "sever", "decisive cuts": "sever", "demolition": "sever",
  "surgery and incisive procedures": "sever", "clean, deliberate endings and separations": "sever",
  "acts requiring ruthlessness": "sever", "hard confrontation": "sever", "confrontation done cleanly": "sever",
  "force": "sever", "fire-related acts": "sever", "disputes pressed to a finish": "sever",
  "contests": "sever", "negotiations you must win": "sever",
  // finishing what already exists
  "closings": "complete", "completion and fulfilment": "complete", "short tasks finished same-day": "complete",
  // continuing the ordinary — never blocked by a veto on beginning
  "day-to-day duties": "continue", "routine and mundane work": "continue", "work": "continue",
  "health matters": "continue", "healing and remedies": "continue", "learning": "continue",
  "the useful and constructive": "continue", "quick errands": "continue", "trade and sales": "continue",
};

// Vishti (Bhadra) blocks INITIATING in every form; it leaves the cruel and the continuing alone.
const VISHTI_BLOCKS = new Set<ActClass>(["initiate", "journey", "union", "celebrate"]);

// ── A YOGA ON AN EMPTIED RIKTA DAY (David's ruling, 2026-07-20: option 2) ────────────────────
// Raman names Saturday-on-Riktha as a Siddha Yoga, so going wholly silent on such a day
// overrules the book. But the day's own verdict is "nothing new unless it severs", and its
// supports were emptied precisely so it would stop contradicting itself. David's call: let the
// yoga speak, but only IN THE DAY'S OWN GRAMMAR — finishing, not beginning.
//
// MEASURED before writing it (2026, 365 days): 12 days a year are emptied AND form a yoga, and
// FIVE of those twelve are TENDER — the nature whose canon avoid-list is
// ["confrontation", "cutting anything off"]. Offering "severing" there would rebuild the exact
// contradiction he ruled against in July. So the severing half is withheld on any nature whose
// OWN avoid-list refuses cutting, read from the canon rather than by naming the nature here.
const YOGA_ON_EMPTY_COMPLETE = ["finishing what already stands", "closing out what was begun"];
const YOGA_ON_EMPTY_SEVER = ["cutting away what is already finished"];
/** Does this nature's own canon avoid-list refuse cutting? (tender does; sharp/fierce do not.) */
function natureRefusesCutting(natDef: any): boolean {
  return ((natDef?.avoid ?? []) as string[]).some((a) => /cut|sever|confront/i.test(a));
}

// Correctness by construction: if the canon ever gains a supports string this map does not
// classify, fail LOUD at module load rather than silently letting a veto stop cancelling it.
{
  const unclassified: string[] = [];
  for (const def of Object.values((tables as any).nakshatraNature ?? {})) {
    for (const s of ((def as any)?.supports ?? [])) if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  for (const def of Object.values((tables as any).tithiFamily ?? {})) {
    for (const s of ((def as any)?.supports ?? [])) if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  // AND THE PER-STAR LISTS. The guard above only ever checked the CANON file, so when v862 added
  // 27 per-star supports it covered none of them — "networking" went unclassified and silently
  // took the `?? "initiate"` default at the Vishti filter. A guard that checks one of two sources
  // is not correctness by construction; it just looks like it.
  for (const list of Object.values(STAR_SUPPORTS)) {
    for (const s of list) if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  for (const s of ((tables as any).amritaSiddhiYoga?.supports ?? [])) {
    if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  // AND THE SIDDHA GRID (v878). The guard was extended for the per-star lists and for Amrita
  // Siddhi's supports and STILL missed the next source added to the same code path — its three
  // strings were taking the `?? "initiate"` default at the Vishti filter, exactly as "networking"
  // did. Third time for this class: the guard now reads every source the yoga block reads.
  for (const s of ((siddha as any).supports ?? [])) {
    if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  // And the grammar the yoga speaks in on an emptied day — the same filter runs over it.
  for (const s of [...YOGA_ON_EMPTY_COMPLETE, ...YOGA_ON_EMPTY_SEVER]) {
    if (!(s in ACT_CLASS)) unclassified.push(s);
  }
  if (unclassified.length) {
    throw new Error(`day-filter: unclassified canon supports string(s) — add to ACT_CLASS: ${Array.from(new Set(unclassified)).join(" | ")}`);
  }
}

export function dayFilter(input: DayFilterInput): DayCharacter {
  const nature = NAK_TO_NATURE[input.nakshatra.toLowerCase()] ?? "mixed";
  const inPaksha = ((input.tithiNumber - 1) % 15) + 1;
  const family = FAMILY_OF_PAKSHA_TITHI[inPaksha] ?? "bhadra";

  const natDef = (tables as any).nakshatraNature[nature];
  const famDef = (tables as any).tithiFamily[family];
  const varaColors = ((tables as any).vara[input.varaLord]?.colors as string) ?? "";

  // The STAR's own supports outrank the nature's where he specified them (see STAR_SUPPORTS).
  const starSupports = input.nakshatra ? STAR_SUPPORTS[input.nakshatra] : undefined;
  const baseSupports = starSupports ?? natDef.supports;
  let supports: string[] = [...baseSupports, ...famDef.supports];
  const avoid: string[] = [...(natDef.avoid ?? []), ...(famDef.avoid ?? [])];
  const vetoes: string[] = [];

  // Rikta: the empty tithi keeps only severing acts — the family's own law. On a sharp or
  // fierce day the two agree (the cut is supported); on any other nature the day EMPTIES —
  // no supports at all.
  //
  // ATTRIBUTION, CORRECTED 2026-07-20 (David: "i deliberately emptied? me???"). What he ruled on
  // July 12 is that the day must not CONTRADICT ITSELF — it was saying "supports cutting" while
  // its own avoid-list said "keep away from cutting". Emptying the supports outright was the
  // remedy an assistant chose to satisfy that, and it had since been written up, and repeated back
  // to him, as though HE had ruled it. He did not. His commit message for v454 is the whole
  // record: "rikta sentence on gentle natures no longer self-contradicts (David's July 12)".
  // The emptying stands because it does serve the real ruling, not because he asked for it.
  // WHAT A YOGA MAY DO HERE, superseded 2026-07-20 by David's own ruling (option 2): the yoga
  // SPEAKS on an emptied day, but only in the day's own grammar — finishing, never beginning (see
  // the yoga block below). What it still may not do is offer a BEGINNING: a day whose verdict reads
  // "nothing new unless it severs" cannot also offer "beginning long-term enterprises". That is the
  // identical contradiction he objected to on July 12, one layer up.
  // Both special yogas add their own supports later, and BOTH used to repopulate such a day:
  // Saturday + Rohini on a rikta tithi came back carrying "beginning long-term enterprises" on a
  // day whose own verdict is "nothing new unless it severs". That contradiction shipped in Amrita
  // Siddhi and no test caught it; encoding Raman's Siddha grid (where Saturday-on-Riktha is
  // explicitly a yoga) only made it visible. Raman's own limit settles it: a special yoga makes
  // the chances greatest, it does not remove an obstacle — so it cannot overturn the day's law.
  let emptied = false;
  if (family === "rikta") {
    supports = nature === "sharp" || nature === "fierce"
      ? [...baseSupports, ...famDef.supports]
      : [];
    emptied = supports.length === 0;
    vetoes.push("the day runs on empty — nothing new unless it severs");
  }
  // Vishti: no initiating, whatever else the day offers.
  if (input.vishti) {
    vetoes.push("the day's grain blocks starting — continue, don't begin");
    // Filter by ACT CLASS, not by English wording (see ACT_CLASS above). An unmapped string
    // cannot occur — the module-load guard rejects it — but if one ever did, treat it as
    // initiating and cancel it: over-blocking under Bhadra is the safe direction.
    supports = supports.filter((s) => !VISHTI_BLOCKS.has(ACT_CLASS[s] ?? "initiate"));
  }
  // The personal layer outranks the collective (weather-gate law, canon underneath).
  const contained = !!(input.tara && input.tara.quality === "bad" && input.tara.taraNum === 7);
  if (contained) vetoes.push("your loss-star at full force — nothing forward, nothing new, contain");

  // THE HEADLINE MATRIX (David-blessed 2026-07-16): 35 finished lines replace the
  // two-phrase concatenation — "efficient and elegant… not cryptic", 6-8 words each.
  const HEADLINE_MATRIX: Record<DayNature, Record<TithiFamily, string>> = {
    fixed: {
      nanda: "Joyful hands on things meant to last",
      bhadra: "Steady work on what's meant to last",
      jaya: "Commit boldly — the foundation wants your weight",
      rikta: "Touch nothing new; guard what already stands",
      purna: "Set the last stone and call it done",
    },
    movable: {
      nanda: "Movement feels like joy today — follow it",
      bhadra: "Useful motion: go where the work is",
      jaya: "Bold moves land well today — go",
      rikta: "The road is empty; don't begin the journey",
      purna: "Arrive, complete the crossing, unpack fully",
    },
    swift: {
      nanda: "Quick joys, light errands, easy wins",
      bhadra: "Fast hands, useful work, short loops",
      jaya: "Speed wins today — strike while it's light",
      rikta: "Quickness without traction; coast, don't push",
      purna: "Finish the small things, swiftly and completely",
    },
    tender: {
      nanda: "Gentleness is the day's whole strength",
      bhadra: "Tend people and craft with soft hands",
      jaya: "Warmth wins what force never could",
      rikta: "A soft day with nothing to give — rest",
      purna: "Complete the mending; close it with care",
    },
    sharp: {
      nanda: "Clean cuts, made lighter by joy",
      bhadra: "Precise work, deliberate endings, steady blade",
      jaya: "Cut decisively — the day rewards the surgeon",
      rikta: "Only severing succeeds; touch nothing else",
      purna: "End it fully, cleanly, and for good",
    },
    fierce: {
      nanda: "Force carried lightly — strength with a smile",
      bhadra: "Heavy lifting hours; push what must move",
      jaya: "Direct clarity, aimed true, wins the day",
      rikta: "Power with no target — stand down",
      purna: "One final push finishes the whole thing",
    },
    mixed: {
      nanda: "Ordinary duties, quietly pleasant, life running",
      bhadra: "The daily grind, done well, is enough",
      jaya: "Routine mastered is its own quiet victory",
      rikta: "Low tide — maintain, don't move",
      purna: "Clear the backlog; leave the desk clean",
    },
  };
  const headline = HEADLINE_MATRIX[nature]?.[family] ?? `${NATURE_LABEL[nature]} ${FAMILY_LABEL[family]}`;
  // A nature may carry David's own plain movement line (avoidPlain) — it replaces the
  // book's item-list in the SENTENCE (the items stay in `avoid` for detail views).
  const avoidPlain = (natDef as any).avoidPlain as string | undefined;
  // A nature may also carry David's plain SUPPORTS line (supportsPlain) — the sentence
  // speaks his register; the canonical item-list (incl. the literal surgery election)
  // stays in `supports` for detail views and the reading's reach (2026-07-15, his pick A).
  let supportsPlain = (natDef as any).supportsPlain as string | undefined;
  // A nature may carry a POOL of David's lines (supportsPool) — date-seeded rotation, the
  // same law as the Morning Bell pools: stable all day, a different face across days,
  // always his words verbatim ("I handed you 3 variations", 2026-07-18).
  const pool = (natDef as any).supportsPool as string[] | undefined;
  if (pool?.length) {
    let h = 0;
    const seed = input.dateSeed ?? "";
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    supportsPlain = pool[h % pool.length];
  }
  // THE PERSONAL TURN (David 2026-07-15, the 7/29 golden-restraint conflict — "those
  // tooltip hero sentence suggestions are perfect"): a hostile personal star closes the
  // collective sentence — the world can run with the day; this native doesn't.
  const personalTurn = !contained && input.tara && input.tara.quality === "bad"
    ? " The wider world can run with this day — you don't. Tend what's yours, small and careful."
    : "";
  // THE HANDSHAKE (David 2026-07-15: "just do it. We can always roll it back"): the day's
  // supports ARE the seven kinds. The day names which KINDS of act it carries: its own
  // nature's kind; an empty tithi keeps only the cutting kinds (on the cutting natures);
  // a contained or personally hostile day supports NOTHING for this native.
  let supportedKinds: DayNature[] = [nature];
  if (family === "rikta") supportedKinds = nature === "sharp" || nature === "fierce" ? Array.from(new Set(["sharp", nature] as DayNature[])) : [];
  if (contained || (input.tara && input.tara.quality === "bad")) supportedKinds = [];

  const amrita = amritaSiddhi(input.varaLord, input.nakshatra);
  const siddhaHit = siddhaYoga(input.varaLord, input.nakshatra, input.tithiNumber);
  // ── WHAT A SPECIAL YOGA DOES, decided in ONE place ──────────────────────────────────────────
  // Raman's limit governs both yogas: "chances of success... by far the greatest" — a probability,
  // not a promise — so neither ever clears a veto. David's calibration says the same.
  //
  // Split by whether the day's own family law EMPTIED it, because the answer genuinely differs,
  // and because keeping it in one branch is what stops a guard going quietly redundant: an earlier
  // version left `!emptied` on the non-empty branches while this branch ASSIGNED over them, so the
  // guard could be deleted with every test still green. The probe caught that; the structure now
  // makes it impossible rather than relying on someone noticing.
  const anyYoga = amrita || !!siddhaHit;
  if (anyYoga && !contained) {
    if (emptied) {
      // David's ruling, 2026-07-20 (option 2): the yoga SPEAKS, but only in the day's own
      // grammar — finishing, never beginning. The severing half is withheld where the nature's
      // own canon avoid-list refuses cutting (five tender days a year).
      const grammar = [
        ...YOGA_ON_EMPTY_COMPLETE,
        ...(natureRefusesCutting(natDef) ? [] : YOGA_ON_EMPTY_SEVER),
      ];
      supports = grammar.filter((x) => !VISHTI_BLOCKS.has(ACT_CLASS[x] ?? "initiate") || !input.vishti);
    } else {
      const extra = [
        ...(amrita ? ((tables as any).amritaSiddhiYoga?.supports ?? []) as string[] : []),
        ...(siddhaHit ? ((siddha as any).supports ?? []) as string[] : []),
      ];
      supports = [...supports, ...extra.filter((x) => !VISHTI_BLOCKS.has(ACT_CLASS[x] ?? "initiate") || !input.vishti)];
    }
  }
  /** The yoga refilled an emptied day — its supports are the finishing grammar, not nothing. */
  const yogaOnEmpty = emptied && supports.length > 0;

  // THE SENTENCE IS COMPUTED LAST, AFTER the yoga has had its say (audit 2026-07-20).
  // It used to be built above the yoga block off a `supports` array the yoga then refilled, so on
  // every emptied-day-with-a-yoga the engine handed the model "Start nothing, grow nothing" in the
  // same payload as `supports: ["finishing what already stands", ...]` — the self-contradiction
  // David ruled against on July 12, reopened one field over by the fix that closed it in `supports`.
  // Measured: 12 days in 2026, all 12 contradicting. The yoga-on-empty branch deliberately does NOT
  // use the nature's own `supportsPlain` line (which speaks for an ordinary day of that nature) —
  // it reads the finishing grammar the day actually carries, through the engine's own template.
  //
  // Every sentence stands ALONE now — the hero prints the finished matrix headline
  // right above it, so no branch repeats or prefixes it (David's 7/16 matrix ship).
  const sentence = contained
    ? "Your own star turns the day inward — however the sky reads, keep everything small, finish nothing new, and let it pass."
    : supports.length === 0
    ? (input.tara?.quality === "good"
        ? "Your star is carried today: a win is possible. No forceful pushing. Let it come; don't chase it."
        : `Start nothing, grow nothing, cut nothing you don't have to. Let it pass quietly.${personalTurn}`)
    : yogaOnEmpty
    ? `It supports ${listOf(supports.slice(0, 3))}.${personalTurn}`
    : supportsPlain
    ? `${cap(supportsPlain)}${avoidPlain ? ` ${avoidPlain}` : ""}${personalTurn}`
    : `It supports ${listOf(supports.slice(0, 3))}.${avoidPlain ? ` ${avoidPlain}` : avoid.length ? ` Keep away from ${listOf(avoid.slice(0, 2))}.` : ""}${personalTurn}`;

  return {
    nature, family, headline, supportedKinds,
    supports: dedupe(supports), avoid: dedupe(avoid), vetoes,
    varaColors, contained, sentence, amritaSiddhi: amrita, siddhaYoga: siddhaHit,
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
export function cappedSentence(nature: DayNature, _headline: string): string {
  const carry = nature === "swift"
    ? "the speed wants out — spend it on revisits, follow-ups, and finishing, not on launches"
    : "the shift wants to happen — prepare it, pack for it, don't launch it";
  return `Mercury holds the launch today — ${carry}.`;
}
