/**
 * THE STAGE — today's sky as a resolved cast, seen through the Moon.
 *
 * David's architecture ruling (2026-07-21):
 *
 *     Swiss Ephemeris -> Astrology Engine -> Narrative Engine (LLM)
 *                        - calculates everything      - determines importance
 *                        - resolves all relationships - removes contradictions
 *                        - produces structured facts
 *
 * and his layer taxonomy (2026-07-21), where EVERY LAYER ANSWERS EXACTLY ONE QUESTION:
 *
 *     The World       Natal Chart        What is fundamentally true about this person's life?
 *     The Book        Mahadasha          What long-term storyline are they living?
 *     The Chapter     Annual Profection  What is this year trying to accomplish?
 *     The Protagonist Time Lord          Which planetary intelligence drives this chapter?
 *     The Stage       Current Sky        What is the environment today?          <- THIS FILE
 *     The Cast        Planets            (the actors on it)                      <- THIS FILE
 *     The Camera      Moon               What part of the stage are we looking at today?  <- THIS FILE
 *     The Scene       Hora               What is happening right now?
 *     The Tempo       Panchapakshi       Act, wait, observe, or rest?
 *
 * "Once each layer has a single job, the LLM's job becomes much easier. It isn't inventing
 * structure — it is simply narrating a structure that already exists." (David)
 *
 * THIS FILE OWNS EXACTLY THREE OF THOSE LAYERS: the Stage, the Cast, and the Camera. It reads
 * the Book / Chapter / Protagonist as INPUT and never recomputes them. It does not touch the
 * Scene or the Tempo at all.
 *
 * NAMING IS LOAD-BEARING. The first draft of this file called the mahadasha lord the "Chapter
 * Lord" — but the mahadasha is the BOOK and the CHAPTER is the annual profection. Collapsing
 * two layers into one label is the exact failure the separation rule prevents, so the offices
 * below are named for the layer they actually belong to.
 *
 * WHY HORA IS ABSENT, and it is not an oversight: the Scene answers "what is happening RIGHT
 * NOW", which is a different question from the one a day read asks. David ruled this session
 * that hora stays in Time Master and only Panchapakshi joins the day read; his own taxonomy is
 * the reason it holds — an hourly answer inside a day-stable read would also break the cache
 * law (dayStableHash), which hashes only what is stable for the cache window.
 *
 * THE MOON IS THE CAMERA, NOT AN ACTOR. David, 2026-07-21: "The actors are already there.
 * Saturn has been standing on stage for months... Nothing changes until the camera pans."
 * The Moon is therefore NOT in `characters` and can never be Primary. It decides what is IN
 * FRAME; the Time Lord is the lead character regardless.
 *
 * This is also the STRUCTURAL form of the Moon double-count fix. DAY_READ_TAIL already says in
 * prose that "the transiting Moon is only today's trigger, never the season" — a rule the model
 * could disobey. Here the transiting Moon cannot be an actor at all, while the NATAL Moon is
 * free to be Mahadasha Lord — the Book — as it is on David's own chart. Two Moons, two layers,
 * no overlap: the camera shows today's frame, the Book says what storyline it belongs to.
 *
 * WHY THE FIRST VERSION OF THIS FILE WAS WRONG, recorded so it is not rebuilt: it ranked the
 * Moon against the other bodies on a seniority ladder. The Moon won as Chapter Lord with an
 * EMPTY condition list — the lead of the day, silent — and would have won every day of a
 * ten-year mahadasha, opening every read identically. That is the "average execution" failure,
 * produced by treating the lens as a character.
 *
 * PURE. No DB, no ephemeris, no network — longitudes in, stage out.
 *
 * NO SIGN NAMES OR HOUSE NUMBERS IN `condition` OR `illuminates`. Those live in `location`,
 * for the engine only. The output guard (MACHINERY in generate.ts) scrubs that vocabulary from
 * the READ, and David's standing law is to name the lived place, never make the reader track a
 * number — so the narrative layer is never handed the words in the first place.
 */
import { GRAHAS, SIGN_RULER, type Graha } from "../vedic/dignity.js";
import { grahaAspectsSign } from "../vedic/aspects.js";
import { NAK27 } from "../panchang/crown.js";
import bhava from "../vedic/canon/bhava-significations.json" with { type: "json" };

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

/** The cast. The Moon is deliberately ABSENT — it is the camera (see header). */
export const STAGE_BODIES = [
  "Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
] as const;
export type StageBody = (typeof STAGE_BODIES)[number];
/** Every body with a longitude, cast members plus the camera. */
export type SkyBody = StageBody | "Moon";

const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdxOf = (lon: number) => Math.floor(norm(lon) / 30);
const nakOf = (lon: number) => NAK27[Math.floor(norm(lon) / (360 / 27))];

const EXALT: Record<string, string> = {
  Sun: "Aries", Moon: "Taurus", Mars: "Capricorn", Mercury: "Virgo",
  Jupiter: "Cancer", Venus: "Pisces", Saturn: "Libra",
};
const DEBIL: Record<string, string> = {
  Sun: "Libra", Moon: "Scorpio", Mars: "Cancer", Mercury: "Pisces",
  Jupiter: "Capricorn", Venus: "Virgo", Saturn: "Aries",
};

export type NarrativeWeight = "Primary" | "Supporting" | "Background";

export interface Character {
  character: StageBody;
  currentRole: string | null;
  location: { sign: string; house: number; nakshatra: string };
  host: SkyBody;
  hostCondition: string | null;
  companions: SkyBody[];
  condition: string[];
  /** Is this actor inside the frame the Moon is lighting today? */
  inFocus: boolean;
  narrativeWeight: NarrativeWeight;
}

/** TODAY'S CAMERA — the transiting Moon. Never an actor. */
export interface Camera {
  body: "Moon";
  location: { sign: string; house: number; nakshatra: string };
  /**
   * The lived territory in frame, from canon (K&F Vol I Ch.7). NEVER a house number.
   * `theme` is the headline ground; `specifics` are the concrete indications, because David's
   * standing law is that concise never means vaguer — name the specifics. Canon keywords alone
   * gave only ["values","wealth"] for the second house, which is not enough to narrate from.
   */
  illuminates: { theme: string[]; specifics: string[] };
  /** Who the camera has in frame — occupying, ruling, or aspecting the lit ground. */
  inFocus: StageBody[];
  host: SkyBody;
  hostCondition: string | null;
}

export interface StageTension {
  name: string;
  between: [SkyBody, SkyBody];
  because: string;
}

/**
 * THE CAST SHEET — David, 2026-07-21: "the cast sheet is the pantheon."
 *
 * The narrative layer is HANDED the roles rather than deducing them. This replaced an earlier
 * `leadFallback` string, and the reason is worth keeping: that field described a Moon profection
 * year as an exception the engine had to recover from, and it read that way. The same
 * configuration is not a failure — it is Convergence, and naming it makes a rare chart feel
 * intentional instead of apologised for.
 */
export interface CastSheet {
  camera: "Moon";
  /** Who leads the YEAR — the annual Time Lord. May be the Moon; that is Convergence, not a bug. */
  chapterLead: SkyBody;
  /** Who the Moon is highlighting TODAY — lord of the house the camera activates. */
  sceneLead: SkyBody;
  supportingCast: StageBody[];
  /** "Convergence" when the camera and the chapter lead are one planet. Otherwise "Standard". */
  narrativeState: "Convergence" | "Standard";
  /** Plain-language statement of the state, for the narrative layer to voice directly. */
  stateNote: string | null;
}

export interface Stage {
  camera: Camera;
  /** Ranked, Primary first. EXACTLY ONE Primary — see assertOnePrimary. */
  characters: Character[];
  tension: StageTension | null;
  narrative: CastSheet;
}

export interface StageInput {
  /** Sidereal longitudes of every body, including the Moon. */
  transitLon: Record<string, number>;
  lagnaSignIdx: number;
  retrograde: Record<string, boolean>;
  combust?: Record<string, boolean>;
  dasha: { maha?: string | null; antar?: string | null; pratyantar?: string | null };
  /** The annual profection Time Lord — THE LEAD CHARACTER, per David's taxonomy. */
  annualTimeLord?: string | null;
  dayLord?: string | null;
  stationing?: Record<string, "turning retrograde" | "turning direct">;
}

/**
 * Offices an actor may hold, most senior first — used for `currentRole` only, NEVER for
 * choosing the lead (the Protagonist is given by the Chapter layer, see buildCastSheet).
 *
 * Each name states the LAYER it belongs to, per David's taxonomy: the mahadasha lord governs
 * the Book, the annual Time Lord is the Protagonist of the Chapter. Naming the maha lord
 * "Chapter Lord" (this file's first draft) merged two layers into one word.
 */
const ROLE_LADDER: { role: string; of: (i: StageInput) => string | null | undefined }[] = [
  { role: "Annual Time Lord", of: (i) => i.annualTimeLord },      // the Protagonist
  { role: "Mahadasha Lord", of: (i) => i.dasha.maha },            // the Book
  { role: "Antardasha Lord", of: (i) => i.dasha.antar },
  { role: "Lord of the Day", of: (i) => i.dayLord },
  { role: "Pratyantardasha Lord", of: (i) => i.dasha.pratyantar },
];

const rolesOf = (body: string, i: StageInput) =>
  ROLE_LADDER.filter((r) => r.of(i) === body).map((r) => r.role);

/** The plain-language live state of any body — its own line, and its guests' hostCondition. */
function stateOf(body: string, input: StageInput): string | null {
  const lon = input.transitLon[body];
  if (lon === undefined) return null;
  const sign = ZODIAC[signIdxOf(lon)];
  if (input.stationing?.[body]) return input.stationing[body] === "turning direct" ? "Turning direct" : "Turning retrograde";
  if (input.combust?.[body]) return "Unseen";
  if (input.retrograde[body] && body !== "Rahu" && body !== "Ketu") return "Retrograde";
  if (EXALT[body] === sign) return "Empowered";
  if (DEBIL[body] === sign) return "Uncomfortable";
  if (SIGN_RULER[sign] === body) return "At home";
  return null;
}

/** Vedic graha drishti between two bodies. Nodes cast none here. */
function aspects(from: string, to: string, input: StageInput): boolean {
  if (!(GRAHAS as readonly string[]).includes(from)) return false;
  if (input.transitLon[from] === undefined || input.transitLon[to] === undefined) return false;
  return grahaAspectsSign(from as Graha, signIdxOf(input.transitLon[from]), signIdxOf(input.transitLon[to]));
}

/** Does this body aspect a SIGN (used for the camera's frame)? */
function aspectsSign(from: string, signIdx: number, input: StageInput): boolean {
  if (!(GRAHAS as readonly string[]).includes(from)) return false;
  if (input.transitLon[from] === undefined) return false;
  return grahaAspectsSign(from as Graha, signIdxOf(input.transitLon[from]), signIdx);
}

const HARD: Record<string, string[]> = {
  Saturn: ["Sun", "Moon", "Mars"],
  Mars: ["Saturn", "Moon", "Mercury"],
  Sun: ["Saturn"],
  Rahu: ["Sun", "Moon"],
  Ketu: ["Sun", "Moon"],
};
const isHard = (a: string, b: string) => (HARD[a] ?? []).includes(b) || (HARD[b] ?? []).includes(a);

/** THE CAMERA. Where the Moon is, what it lights, and who it has in frame. */
function buildCamera(input: StageInput): Camera {
  const lon = input.transitLon["Moon"];
  const si = signIdxOf(lon);
  const sign = ZODIAC[si];
  const house = ((si - input.lagnaSignIdx + 12) % 12) + 1;
  const host = SIGN_RULER[sign];

  // In frame: standing in the lit ground, ruling it, or aspecting it.
  const inFocus = STAGE_BODIES.filter((b) => {
    if (input.transitLon[b] === undefined) return false;
    if (signIdxOf(input.transitLon[b]) === si) return true;    // standing in it
    if (host === b) return true;                                // owns it
    return aspectsSign(b, si, input);                           // looking at it
  });

  const houses = (bhava as any).houses ?? {};
  const h = houses[String(house)] ?? {};
  const illuminates = {
    theme: (h.keywords ?? []) as string[],
    specifics: (h.indications ?? []) as string[],
  };

  return {
    body: "Moon",
    location: { sign, house, nakshatra: nakOf(lon) },
    illuminates,
    inFocus,
    host,
    hostCondition: stateOf(host, input),
  };
}

/** Resolve one actor completely. Every fact derived; an uncomputable fact is simply absent. */
function buildCharacter(body: StageBody, input: StageInput, camera: Camera): Character {
  const lon = input.transitLon[body];
  const si = signIdxOf(lon);
  const sign = ZODIAC[si];
  const house = ((si - input.lagnaSignIdx + 12) % 12) + 1;
  const host = SIGN_RULER[sign];

  const companions: SkyBody[] = ([...STAGE_BODIES, "Moon"] as SkyBody[]).filter(
    (o) => o !== body && input.transitLon[o] !== undefined && signIdxOf(input.transitLon[o]) === si
  );

  const roles = rolesOf(body, input);
  const condition: string[] = [];

  const own = stateOf(body, input);
  if (own) condition.push(own === "Retrograde" ? "Revisiting old ground" : own);
  for (const extra of roles.slice(1)) condition.push(`Also ${extra}`);

  // The host's state resolved onto the guest — the join the model used to be asked to make.
  const hostState = host === body ? null : stateOf(host, input);
  if (hostState === "Retrograde") condition.push("Operating through revision");
  else if (hostState === "Unseen") condition.push("Working without clear sight");
  else if (hostState === "Uncomfortable") condition.push("Supported by a strained host");
  else if (hostState === "Empowered" || hostState === "At home") condition.push("Well hosted");

  for (const c of companions) {
    if (c === "Moon") { condition.push("In today's frame"); continue; }   // the camera, not a peer
    condition.push(isHard(body, c) ? `Expression slowed by ${c}` : `Working alongside ${c}`);
  }
  for (const o of STAGE_BODIES) {
    if (o === body || companions.includes(o) || input.transitLon[o] === undefined) continue;
    if (!aspects(o, body, input)) continue;
    condition.push(isHard(body, o) ? `Under pressure from ${o}` : `Supported by ${o}`);
  }

  if (input.stationing?.[body] === "turning direct") condition.push("Beginning to move forward again");
  if (input.stationing?.[body] === "turning retrograde") condition.push("Ending a forward chapter");

  return {
    character: body,
    currentRole: roles[0] ?? null,
    location: { sign, house, nakshatra: nakOf(lon) },
    host,
    hostCondition: hostState,
    companions,
    condition,
    inFocus: camera.inFocus.includes(body),
    narrativeWeight: "Background",
  };
}

/**
 * THE CAST SHEET — determine importance by handing over roles, not by ranking.
 *
 * David's hierarchy (2026-07-21), explicit and deterministic:
 *   1. Chapter Lead (annual Time Lord) — the protagonist.
 *   2. If the Chapter Lead IS the Moon: narrativeState = "Convergence" (not a fallback).
 *   3. Scene Lead: lord of the house the Moon is activating today.
 *   4. Supporting Cast: the other actors with a live interaction.
 *
 * There is no ladder and nothing to tie-break, which is why this cannot produce the
 * two-Primary contradiction the engine exists to remove. The camera never chooses the Chapter
 * Lead — it chooses the FRAME. The Chapter Lead is stable all year while the frame moves daily.
 *
 * ONE CELL REMAINS DEFINED-BY-CHOICE rather than by David's spec, and it is flagged rather than
 * hidden: when the Moon is BOTH the annual Time Lord AND the lord of the house it activates
 * (a Convergence year with the Moon in its own sign), neither lead is a cast member and no
 * actor can carry Primary. The first actor in frame takes it, deterministically. Rare, but it
 * must not throw.
 */
function buildCastSheet(chars: Character[], input: StageInput, camera: Camera): CastSheet {
  const chapterLead = (input.annualTimeLord ?? camera.host) as SkyBody;
  const sceneLead = camera.host;
  const convergence = chapterLead === "Moon";

  return {
    camera: "Moon",
    chapterLead,
    sceneLead,
    supportingCast: chars
      .filter((c) => c.character !== chapterLead && c.character !== sceneLead)
      .filter((c) => c.inFocus || c.currentRole || c.condition.length > 0)
      .map((c) => c.character),
    narrativeState: convergence ? "Convergence" : "Standard",
    stateNote: convergence
      ? "The camera and the chapter lead are the same planet. Today's lens and this year's guiding intelligence are unified — what draws attention today is directly tied to the larger annual story."
      : null,
  };
}

/**
 * Exactly one actor carries Primary. The Chapter Lead takes it when it is on stage; in a
 * Convergence year the Chapter Lead IS the camera and cannot be cast, so the Scene Lead — the
 * lord of the ground the Moon is lighting — leads the scene instead.
 */
function choosePrimary(chars: Character[], sheet: CastSheet): Character | undefined {
  const byName = (n: SkyBody) => chars.find((c) => c.character === n);
  return byName(sheet.chapterLead) ?? byName(sheet.sceneLead) ?? chars.find((c) => c.inFocus) ?? chars[0];
}

/** The day's ONE tension. The frame first, then the wider stage — a day's drama need not run
 *  through its lead, and searching the lead alone once returned null while Mars stood plainly
 *  under Saturn. */
function findTension(chars: Character[], input: StageInput): StageTension | null {
  const ordered = [...chars].sort(
    (a, b) => (b.inFocus ? 1 : 0) - (a.inFocus ? 1 : 0) ||
      (b.narrativeWeight === "Primary" ? 1 : 0) - (a.narrativeWeight === "Primary" ? 1 : 0)
  );
  for (const c of ordered) {
    const p = c.character;
    for (const o of [...STAGE_BODIES, "Moon"] as SkyBody[]) {
      if (o === p || input.transitLon[o] === undefined || !isHard(p, o)) continue;
      const together = c.companions.includes(o);
      // Name the TRUE aggressor (v930). A body presses on another only when it is the malefic-hard
      // one (HARD[X] lists the other) AND it actually reaches it — by conjunction, or by casting a
      // graha-aspect. The old code fired on an aspect in EITHER direction but always framed
      // "o presses on p", so when only p reached o (p the aggressor) the reader was told the reverse
      // (measured 20/103 wrong), and it also named tensions where the aspect ran against the hardness.
      const oHitsP = (HARD[o] ?? []).includes(p) && (together || aspects(o, p, input)); // o afflicts p
      const pHitsO = (HARD[p] ?? []).includes(o) && (together || aspects(p, o, input)); // p afflicts o
      if (!oHitsP && !pHitsO) continue;
      if (together) {
        const aggressor = oHitsP ? o : p, victim = oHitsP ? p : o;
        return { name: `${victim} under ${aggressor}`, between: [victim, aggressor], because: `${aggressor} stands in the same ground as ${victim}` };
      }
      if (oHitsP) return { name: `${p} under ${o}`, between: [p, o], because: `${o} presses on ${p}` };
      return { name: `${o} under ${p}`, between: [o, p], because: `${p} presses on ${o}` };
    }
  }
  return null;
}

/** The invariant the architecture rests on: two Primaries IS the contradiction we remove. */
export function assertOnePrimary(stage: Stage): void {
  const n = stage.characters.filter((c) => c.narrativeWeight === "Primary").length;
  if (n !== 1) {
    throw new Error(
      `stage: expected exactly ONE Primary character, got ${n}. Two Primaries would reach the ` +
      `narrative layer as two competing subjects — the contradiction the engine exists to remove.`
    );
  }
}

/** The Moon must never be cast as an actor. Guards the camera law structurally. */
export function assertMoonIsCamera(stage: Stage): void {
  if ((stage.characters as { character: string }[]).some((c) => c.character === "Moon")) {
    throw new Error("stage: the Moon appears in `characters`. The Moon is the camera, never an actor.");
  }
}

export function computeStage(input: StageInput): Stage {
  if (input.transitLon["Moon"] === undefined) throw new Error("stage: no Moon longitude — there is no camera.");

  const camera = buildCamera(input);
  const present = STAGE_BODIES.filter((b) => input.transitLon[b] !== undefined);
  const characters = present.map((b) => buildCharacter(b, input, camera));

  const narrative = buildCastSheet(characters, input, camera);
  const primary = choosePrimary(characters, narrative);
  for (const c of characters) {
    c.narrativeWeight =
      c === primary ? "Primary"
      : c.inFocus || c.currentRole ? "Supporting"
      : "Background";
  }

  const rank: Record<NarrativeWeight, number> = { Primary: 0, Supporting: 1, Background: 2 };
  characters.sort(
    (a, b) => rank[a.narrativeWeight] - rank[b.narrativeWeight] ||
      (b.inFocus ? 1 : 0) - (a.inFocus ? 1 : 0) ||
      present.indexOf(a.character) - present.indexOf(b.character)
  );

  const stage: Stage = { camera, characters, tension: null, narrative };
  stage.tension = findTension(characters, input);
  assertOnePrimary(stage);
  assertMoonIsCamera(stage);
  return stage;
}
