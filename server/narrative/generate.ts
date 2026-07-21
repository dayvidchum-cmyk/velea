// Calls Claude Sonnet 4.6 to produce the Glance (one sentence) and Deep Read
// (six structured sections). Returns null when ANTHROPIC_API_KEY is absent so
// callers can fall back to existing static content.
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, DEEP_READ_TAIL, CHAPTER_TAIL, DAY_READ_TAIL, HOUSE_READ_TAIL, DASHA_READ_TAIL, ATLAS_READ_TAIL, LIFE_AREA_TAIL, ECLIPSE_SEASON_TAIL, MERCURY_RX_TAIL, PLANET_RX_TAIL, COMBINED_READ_TAIL, TL_WINDOW_TAIL, MONTH_TAIL, CAST_TAIL, MODEL } from "./prompts.js";
// Every model call is metered so the daily cap counts CALLS, not results — retries
// included, and a burned-but-failed generation included. (The 8-token liveness probe at
// the top of this file is deliberately NOT metered: it is not a reading.)
import { countApiCall } from "./gen-meter.js";
import type { NarrativeInput } from "./input-builder.js";

// Each narrative section is split in two: `synthesis` is the plain human truth that
// OPENS the section (rendered black); `why` is the chart mechanics that follow it as
// the reason (rendered gray). Confidence factors split the same way: `plain` first
// (black), `astro` after (gray).
export type Section = { synthesis: string; why: string };
export type DeepRead = {
  coreTheme: Section;
  whyNow: Section;
  manifestations: { area: string; synthesis: string; why: string }[];
  developmentalTask: Section;
  confidence: { level: "Low" | "Moderate" | "High"; factors: { plain: string; astro: string }[] };
};

// The chapter's good-for/avoid bullets — split OUT of the big deep read into a small,
// cheap, auto-firing call so they show on the Chart page without tapping the deep read.
// They turn only when the chapter turns (the year lord's transit house changes).
export type Chapter = { chapterGoodFor: string[]; chapterAvoid: string[] };

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * THE METER (v885) — every model call reports exactly what it cost, and Velea threw all of it away.
 *
 * Asked to compare models, the only instrument available was watching the prepaid wallet drop, which
 * cannot distinguish a cache HIT from a cache MISS — the single number that decides whether a model
 * is affordable here. The API returns it on every response and it was never read.
 *
 * Wrapped at the client factory rather than at the seven call sites, so a call site added later is
 * metered by construction and cannot be the one that was forgotten.
 *
 * In-memory and bounded, exactly like the black box above: resets on deploy, holds only numbers,
 * never chart data and never prose.
 */
export type GenUsage = {
  at: string;
  model: string;
  /** Input tokens billed at full rate — the part that was NOT served from cache. */
  inputTokens: number;
  outputTokens: number;
  /** Served from cache at ~0.1x. A healthy steady-state read is almost entirely this. */
  cacheReadTokens: number;
  /** Written to cache at ~1.25x. Large here means a COLD read — first call after a model
   *  switch, or the 5-minute TTL expired between taps. */
  cacheWriteTokens: number;
  /** null when the model is not in the price table below — never a guessed number. */
  costUsd: number | null;
};

/**
 * Per-MTok list prices, from Anthropic's published model pricing (table cached 2026-06-24).
 * NOT measured here — if a price changes, this table is wrong until someone updates it, which is
 * why every entry is named explicitly and an unknown model yields a null cost rather than a
 * plausible-looking wrong one.
 */
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
/** Cache reads bill at ~0.1x input; 5-minute cache writes at ~1.25x. */
const CACHE_READ_MULT = 0.1, CACHE_WRITE_MULT = 1.25;

const recentGenUsage: GenUsage[] = [];
export function getGenUsage() { return recentGenUsage; }
/** Totals across everything still in the buffer — what a test run actually cost. */
export function getGenUsageTotals() {
  const n = recentGenUsage.length;
  const sum = (f: (u: GenUsage) => number) => recentGenUsage.reduce((t, u) => t + f(u), 0);
  const costed = recentGenUsage.filter((u) => u.costUsd != null);
  const cacheRead = sum((u) => u.cacheReadTokens), cacheWrite = sum((u) => u.cacheWriteTokens);
  return {
    calls: n,
    inputTokens: sum((u) => u.inputTokens),
    outputTokens: sum((u) => u.outputTokens),
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    /** Share of cacheable input that was actually served from cache. The number that decides
     *  affordability: near 1 is steady state, near 0 means every read is paying a cold write. */
    cacheHitRate: cacheRead + cacheWrite > 0 ? +(cacheRead / (cacheRead + cacheWrite)).toFixed(3) : null,
    costUsd: costed.length ? +costed.reduce((t, u) => t + (u.costUsd ?? 0), 0).toFixed(4) : null,
    costedCalls: costed.length,
    models: Array.from(new Set(recentGenUsage.map((u) => u.model))),
  };
}
export function resetGenUsage() { recentGenUsage.length = 0; }

/** Test seam: the wrapper below is unreachable without a live API key, so the arithmetic is
 *  exercised directly. Not used by any runtime path. */
export const __recordUsageForTest = (msg: any) => recordUsage(msg);

function recordUsage(msg: any) {
  const u = msg?.usage;
  if (!u) return;
  const model: string = msg.model ?? MODEL;
  const inputTokens = u.input_tokens ?? 0;
  const outputTokens = u.output_tokens ?? 0;
  const cacheReadTokens = u.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = u.cache_creation_input_tokens ?? 0;
  const p = PRICE_PER_MTOK[model];
  const costUsd = p
    ? +(((inputTokens + cacheReadTokens * CACHE_READ_MULT + cacheWriteTokens * CACHE_WRITE_MULT) * p.in
        + outputTokens * p.out) / 1_000_000).toFixed(6)
    : null;
  recentGenUsage.unshift({ at: new Date().toISOString(), model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd });
  if (recentGenUsage.length > 60) recentGenUsage.length = 60;
}

function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const a = new Anthropic({ apiKey });
  // Metering must NEVER be able to kill a reading — the same law the 2026-07-17 outage wrote, when a
  // failed cache WRITE took the whole billed read down with it. The response is already in hand here;
  // anything that goes wrong counting it is swallowed and the read is returned untouched.
  const create = a.messages.create.bind(a.messages);
  (a.messages as any).create = async (...args: any[]) => {
    const msg = await (create as any)(...args);
    try { recordUsage(msg); } catch (e) { console.warn("[meter] usage not recorded:", e); }
    return msg;
  };
  return a;
}

// THE BLACK BOX (2026-07-17 outage): every generation failure is recorded here so the
// admin Users page can print the verbatim error one tap away — the truth was previously
// reachable only through Railway's logs. In-memory by design: resets on deploy, holds
// only error text, never chart data.
const recentGenErrors: { at: string; fn: string; message: string }[] = [];
export function getRecentGenErrors() { return recentGenErrors; }
/** Router-level errors (thrown tRPC procedures) land in the same box, prefixed by path.
 *  UNAUTHORIZED noise is skipped — login redirects aren't failures. */
export function recordServerError(path: string, err: unknown) {
  const message = String((err as any)?.message ?? err).slice(0, 600);
  if (message === "Please login (10001)" || (err as any)?.code === "UNAUTHORIZED") return;
  console.error(`[trpc] ${path} failed:`, message);
  recentGenErrors.unshift({ at: new Date().toISOString(), fn: `trpc:${path}`, message });
  if (recentGenErrors.length > 24) recentGenErrors.length = 24;
}
function logGenError(fn: string, err: unknown) {
  const message = String((err as any)?.message ?? err).slice(0, 600);
  console.error(`[narrative] ${fn} failed:`, message);
  recentGenErrors.unshift({ at: new Date().toISOString(), fn, message });
  if (recentGenErrors.length > 24) recentGenErrors.length = 24;
}

/**
 * Admin diagnostic: makes a tiny live Anthropic call and reports the exact outcome, so a blank
 * reading can be diagnosed (missing key vs bad key vs billing/cap vs works) instead of guessed.
 * Returns the raw API error message on failure — e.g. "invalid x-api-key" or "credit balance too low".
 */
export async function probeLLM(): Promise<{ hasKey: boolean; ok: boolean; model: string; error: string | null }> {
  if (!hasAnthropicKey()) return { hasKey: false, ok: false, model: MODEL, error: "ANTHROPIC_API_KEY is not set in this environment (Railway)." };
  const c = client();
  if (!c) return { hasKey: false, ok: false, model: MODEL, error: "Could not create the Anthropic client." };
  try {
    await c.messages.create({ model: MODEL, max_tokens: 8, messages: [{ role: "user", content: "Reply with the single word OK." }] });
    return { hasKey: true, ok: true, model: MODEL, error: null };
  } catch (err: any) {
    return { hasKey: true, ok: false, model: MODEL, error: err?.message ?? String(err) };
  }
}



const SECTION = { type: "object", additionalProperties: false, required: ["synthesis", "why"], properties: { synthesis: { type: "string" }, why: { type: "string" } } } as const;

const DEEP_READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["coreTheme", "whyNow", "manifestations", "developmentalTask", "confidence"],
  properties: {
    coreTheme: SECTION,
    whyNow: SECTION,
    manifestations: {
      type: "array", minItems: 2, maxItems: 4,
      items: { type: "object", additionalProperties: false, required: ["area", "synthesis", "why"], properties: { area: { type: "string" }, synthesis: { type: "string" }, why: { type: "string" } } },
    },
    developmentalTask: SECTION,
    confidence: {
      type: "object",
      additionalProperties: false,
      required: ["level", "factors"],
      properties: {
        level: { type: "string", enum: ["Low", "Moderate", "High"] },
        factors: { type: "array", minItems: 2, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["plain", "astro"], properties: { plain: { type: "string" }, astro: { type: "string" } } } },
      },
    },
  },
} as const;

export async function generateDeepRead(input: NarrativeInput): Promise<DeepRead | null> {
  const c = client();
  if (!c) return null;
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 3200,
      system: [
        { type: "text" as const, text: BASE_PROMPT, cache_control: { type: "ephemeral" as const } },
        { type: "text" as const, text: DEEP_READ_TAIL },
      ],
      tools: [{ name: "deep_read", description: "Return the deep-read sections.", input_schema: DEEP_READ_SCHEMA as any }],
      tool_choice: { type: "tool", name: "deep_read" },
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") { logGenError("generateDeepRead", `reply had no tool block (stop_reason=${msg.stop_reason})`); return null; }
    if (!isCompleteDeepRead(block.input)) { logGenError("generateDeepRead", `incomplete tool input (stop_reason=${msg.stop_reason})`); return null; }
    return scrubDeepRead(block.input as DeepRead);
  } catch (err) {
    logGenError("generateDeepRead", err);
    return null;
  }
}

// A truncated tool call yields a partial object — reject it so callers fall back to a
// loading/empty state instead of the UI crashing on a missing field.
function isCompleteDeepRead(r: any): r is DeepRead {
  const sec = (s: any) => !!s && typeof s.synthesis === "string" && typeof s.why === "string";
  return !!r
    && sec(r.coreTheme)
    && sec(r.whyNow)
    && Array.isArray(r.manifestations) && r.manifestations.every((m: any) => m && typeof m.area === "string" && typeof m.synthesis === "string" && typeof m.why === "string")
    && sec(r.developmentalTask)
    && !!r.confidence && typeof r.confidence.level === "string"
    && Array.isArray(r.confidence.factors) && r.confidence.factors.every((f: any) => f && typeof f.plain === "string" && typeof f.astro === "string");
}
export { isCompleteDeepRead };

const CHAPTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["chapterGoodFor", "chapterAvoid"],
  properties: {
    chapterGoodFor: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    chapterAvoid: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
  },
} as const;

export async function generateChapter(input: NarrativeInput): Promise<Chapter | null> {
  const c = client();
  if (!c) return null;
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 500,
      // BASE_PROMPT stays the cached prefix (shared with the glance/deep reads); only the
      // small CHAPTER_TAIL is uncached, so this cheap call rides the same ephemeral cache.
      system: [
        { type: "text" as const, text: BASE_PROMPT, cache_control: { type: "ephemeral" as const } },
        { type: "text" as const, text: CHAPTER_TAIL },
      ],
      tools: [{ name: "chapter", description: "Return the chapter's good-for / avoid bullets.", input_schema: CHAPTER_SCHEMA as any }],
      tool_choice: { type: "tool", name: "chapter" },
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") { logGenError("generateChapter", `reply had no tool block (stop_reason=${msg.stop_reason})`); return null; }
    if (!isCompleteChapter(block.input)) { logGenError("generateChapter", `incomplete tool input (stop_reason=${msg.stop_reason})`); return null; }
    return scrubChapter(block.input as Chapter);
  } catch (err) {
    logGenError("generateChapter", err);
    return null;
  }
}

// Reject a truncated tool call so callers fall back instead of rendering half a list.
function isCompleteChapter(r: any): r is Chapter {
  return !!r
    && Array.isArray(r.chapterGoodFor) && r.chapterGoodFor.every((s: any) => typeof s === "string")
    && Array.isArray(r.chapterAvoid) && r.chapterAvoid.every((s: any) => typeof s === "string");
}
export { isCompleteChapter };

// THE DAY READ — the metaphor day-read: a single day rendered as a scene in the ongoing
// story. Each field is PURE PROSE (no synthesis/why split, no dry mechanics layer — the
// placements live inside the prose, glossary-linked). scene = today's outer weather (mode,
// transit Moon, live rx/eclipse); story = the inner self + chapter it lands on; tilt = how
// to move (the posture, no single move); closeLine = one carried sentence.
export type DayRead = {
  scene: string;
  story: string;
  tilt: string;
  closeLine: string;
  question: string;
};

const DAY_READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scene", "story", "tilt", "closeLine", "question"],
  properties: {
    scene: { type: "string" },
    story: { type: "string" },
    tilt: { type: "string" },
    closeLine: { type: "string" },
    question: { type: "string" },
  },
} as const;

// ── DETERMINISTIC OUTPUT GUARDS ──────────────────────────────────────────────
// The prompt ASKS for brevity + no chart jargon, but the model doesn't always obey — so these
// make David's two recurring failure modes catchable in CODE, not just in the prompt:
//   (1) too long,  (2) chart-machinery leaks ("your 9th house", "exalted", "retrograde", sign
// names). A read that trips a guard is REGENERATED ONCE with the exact violation named, rather
// than shipped. Cost is bounded to a single extra call, and ONLY when a guard actually trips.

// The banned vocabulary. Planets (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu) are
// ALLOWED — they're the characters. What's banned: house numbers, dignity/motion terms, and the
// twelve SIGN names (a sign must appear only as its life-territory, never by name).
const MACHINERY = /\b(\d+\s*(?:st|nd|rd|th)\s+house|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+house|exalt\w*|debilitat\w*|retrograde|combust\w*|moolatrikona|nakshatra|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/i;

// FATE, banned on every surface. BASE_PROMPT already bends fate-verbs back into the reader's hands
// ("AGENCY — FATE BECOMES POTENTIAL"), but the words themselves were enforced nowhere: not in a
// tail's bannedPhrases, not in MACHINERY, not in SCRUB. Kept narrow on purpose — "fate" and
// "destiny" as nouns are part of the tradition's own vocabulary when discussing karma; what is
// banned is the DECREE about this person ("you are destined to…", "it is fated that…").
const FATE_DECREE = /\b(?:destined|preordained|foreordained|predestined|it is (?:your )?fate\b|fated to)\b/i;

const wordCount = (s: string): number => (s.trim().match(/\S+/g) ?? []).length;

// DETERMINISTIC LAST-RESORT SCRUB. The retries below catch most machinery, but a dignity/motion
// term stubborn across every retry would otherwise reach the reader (this is exactly what happened:
// "debilitation" survived a life-area read). This GUARANTEES those specific words can never ship —
// they're replaced with felt language in code, no model involved. (Sign names and house numbers
// can't be cleanly swapped for their life-territory here, so those still lean on the retries; this
// covers the recurring dignity/motion leaks, which are the ones that actually slip.)
const SCRUB: Array<[RegExp, string]> = [
  // SELF-WORTH, banned outright (David, 2026-07-21). A prompt is a request; this is the guarantee,
  // same reasoning that put "debilitated" here after it reached a reader.
  // THE REPLACEMENT IS DELIBERATELY NEUTRAL. My first version scrubbed to "self-love", which
  // installed a new stock phrase in place of the old one — David's correction: "I'd be cautious
  // about replacing one default with another." Self-love is ONE facet of the 2nd, valid only when
  // a self-planet genuinely links there; hard-swapping every stray "self-worth" into it would
  // assert that facet on charts that never pointed to it. "what you value" stays inside the
  // house's real field (resources, stewardship, value, sustenance) without picking a facet.
  [/\bsense of self-worth\b/gi, "sense of what you value"],
  [/\bself-worth\b/gi, "what you value"],
  [/\bdebilitations?\b/gi, "weakness"],
  [/\bdebilitated\b/gi, "weakened"],
  [/\bexaltations?\b/gi, "full strength"],
  [/\bexalted\b/gi, "at full strength"],
  [/\bretrograde\b/gi, "turned inward"],
  [/\bcombustions?\b/gi, "lost in the glare"],
  [/\bcombust\b/gi, "lost in the glare"],
  [/\bmoolatrikona\b/gi, "its own strong ground"],
];
/**
 * TASK DECOMPOSITION (neurodivergent-UX roadmap #2, David-greenlit; voice: "plain and not
 * yelling" — his blessing of the recommendation). Break one task into 3–7 tiny concrete
 * steps that kill initiation paralysis. NOT a narrative surface: no cosmology, no ceremony,
 * no exclamation marks — the smallest honest words that make the first move startable.
 * Cheap by design (~300 output tokens); Door-Law gated at the router (explicit tap only).
 */
export async function generateTaskSteps(title: string, notes?: string | null): Promise<string[] | null> {
  const c = client();
  if (!c) return null;
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Break this task into 3-7 tiny concrete steps.\n\nTask: ${title}${notes ? `\nNotes: ${notes}` : ""}\n\nRules:\n- Each step is one small physical or digital action, startable in under 5 minutes.\n- The FIRST step must be the easiest possible way in (open the doc, put the thing on the table, find the phone number).\n- Plain, calm words. No exclamation marks, no motivational language, no headers.\n- Reply with ONLY a JSON array of step strings, nothing else.`,
      }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const jsonStr = text.startsWith("[") ? text : text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return null;
    const steps = arr.filter((s) => typeof s === "string" && s.trim().length > 0).map((s) => s.trim().slice(0, 512));
    return steps.length >= 2 && steps.length <= 8 ? steps : null;
  } catch (err) {
    recordServerError("generateTaskSteps", err);
    return null;
  }
}

/**
 * THE VERDICT voicing — speaks the engine's life-register data the way David's astrologer spoke:
 * plainly, dated, falsifiable ("it's a late bloomer's chart… money, love — late, if at all").
 * Laws: no house NUMBERS (glosses ride in the data), no "destined", no "self-worth" framing
 *        ("self-worth" is banned outright; the 2nd picks its facet from the chart, never a stock phrase),
 * plain and not yelling. The engine located everything; this only gives it a voice.
 */
export async function generateVerdictRead(data: unknown): Promise<{ narrative: string } | null> {
  const c = client();
  if (!c) return null;
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 1100,
      messages: [{
        role: "user",
        content: `You are voicing a Vedic astrologer's chart verdict — the life-register headline of this one chart. The engine has already computed everything; you only speak it.

DATA (deterministic, from the stored research + the 120-year dasha sequence):
${JSON.stringify(data)}

Write the verdict in 250-350 words, plain prose, 3-5 short paragraphs:
1. Open with the headline in one sentence — the bloom profile spoken like a human ("this is a late bloomer's chart, built on time and experience" — adjust to the actual profile).
2. The hinge: name the planet the chart turns on and the AGE it matures — what sharpens from that year.
3. Each area (money & livelihood, partnership, the world's stage): WHEN it pays — use the bloomAge/window ages, the lord's name, AND the area's 'tense' field against currentAge. tense="past": the paying window already RAN (speak it as lived: what it gave or asked, and what remains now — never the future tense). tense="current": the native is INSIDE the window now — say so plainly. tense="future": name the age and year it opens. Where 'thin' is true — say it straight and kindly: this current runs thin; if it pays, it pays late and modestly. Never pretend.
4. The nodal line: what was already mastered (Ketu's ground, via its gloss) vs the hunger this life is here to feed (Rahu's).

Rules: never say a house number — use the plain glosses provided. Never say "destined" or "meant to be" — the path is computed, not fixed. Never write "self-worth" — banned vocabulary. The 2nd asks what you cultivate, protect and draw upon to sustain your life; let the chart pick which facet of that speaks, never a stock phrase. Concrete ages and years, not vague seasons. Calm, direct, no exclamation marks, no mysticism-perfume. It should read like a precise elder speaking across a table.

Reply with ONLY the prose, no headers, no preamble.`,
      }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    if (!text || text.length < 200) return null;
    return { narrative: scrubMachinery(text) };
  } catch (err) {
    recordServerError("generateVerdictRead", err);
    return null;
  }
}

/**
 * THE ECLIPSE BELL LINE (David 2026-07-18: "feed this one to the llm… for shits and giggles.
 * one for lunar. one for solar."). Fires 4-7x/year, ONE line serves every user (global sky
 * event), generated once per eclipse and cached by the caller — essentially free. Fed the
 * PHENOMENOLOGY (the wrong light, the exact fit), never the demon myth (his call).
 */
export async function generateEclipseBellLine(type: "solar" | "lunar"): Promise<string | null> {
  const c = client();
  if (!c) return null;
  const material = type === "solar"
    ? "A solar eclipse: the Moon is 400x smaller than the Sun and 400x closer — an exact fit, nowhere else in the known universe. Nothing touches; it is pure alignment. The light goes wrong before it goes out: colors drain strange, shadows sharpen to knife edges, every gap between leaves casts a thousand tiny crescents, birds roost at noon, the horizon glows sunset in every direction. The outer light — visibility, the public self — is briefly erased, on a schedule known centuries ahead."
    : "A lunar eclipse: the full Moon slides into Earth's shadow and turns rust-red — because it is being lit by every sunrise and every sunset on Earth simultaneously, bent around the planet's edge. The inner light — the mind, the private tide — goes strange for a few hours, on a schedule known centuries ahead. Nothing touches; it is pure alignment."
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Write ONE short morning-notification line (max 2 sentences, under 140 characters total) for the day of a ${type} eclipse.

Material (use the feeling, not all the facts): ${material}

Voice: playful but precise — the same register as "Don't go chasing waterfalls" and "He walked right into retroshade." A wink, not a warning siren. The undertone: today the light itself can't be trusted, so watch rather than launch. NEVER use: "destined", "fate", "cosmic energy", demon/dragon imagery, exclamation-point hype. No emoji.

Reply with ONLY the line.`,
      }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    return text && text.length >= 20 && text.length <= 200 ? text : null;
  } catch (err) {
    recordServerError("generateEclipseBellLine", err);
    return null;
  }
}

/**
 * THE GOSSIP LINE (David 2026-07-18: "the engine should be able to attempt that") — the comedy
 * register the tradition was sitting on: the Moon has 27 wives (the nakshatras), visits one
 * palace per night on a schedule, played favorites with Rohini, got cursed to wane for it, and
 * waxing is the recovery. One tiny generation per DAY serves every user (memoized by caller).
 */
export async function generateMoonGossipLine(nakshatra: string): Promise<string | null> {
  const c = client();
  if (!c) return null;
  try {
    countApiCall();
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Write ONE morning-notification line (max 2 sentences, under 140 characters) in the register of a gossip column about the Moon's nightly rounds.

The setup (true Vedic myth, played for gentle comedy): the Moon (Chandra — pronoun THEY) has 27 wives, the nakshatras, and visits one palace per night on a strict rotation. They played favorites with Rohini and got cursed to wane for it; waxing is the recovery. Tonight the Moon is at ${nakshatra}'s palace.

Voice examples to match (playful, precise, a wink): "Don't go chasing waterfalls." / "He walked right into retroshade." / "Tidy up."

Rules: name ${nakshatra}. Keep it warm and PG — cheeky, never crude. No "star-mansions" fantasy-speak, no "cosmic", no "destined", no emoji, no exclamation-point hype.

Reply with ONLY the line.`,
      }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    return text && text.length >= 20 && text.length <= 200 ? text : null;
  } catch (err) {
    recordServerError("generateMoonGossipLine", err);
    return null;
  }
}

export function scrubMachinery(s: string): string {
  let out = s;
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out;
}
const scrubDayRead = (r: DayRead): DayRead => ({
  scene: scrubMachinery(r.scene), story: scrubMachinery(r.story), tilt: scrubMachinery(r.tilt),
  closeLine: scrubMachinery(r.closeLine), question: scrubMachinery(r.question),
});

// Deep read (your year) + chapter now meet the same machinery-scrub standard as the hero — no
// banned term can ship even if the model slips (deterministic last line of defense).
const scrubSection = (s: any) => (s ? { ...s, synthesis: scrubMachinery(s.synthesis ?? ""), why: scrubMachinery(s.why ?? "") } : s);
const scrubDeepRead = (r: DeepRead): DeepRead => ({
  ...r,
  coreTheme: scrubSection(r.coreTheme),
  whyNow: scrubSection(r.whyNow),
  developmentalTask: scrubSection(r.developmentalTask),
  manifestations: (r.manifestations ?? []).map((m: any) => ({ ...m, synthesis: scrubMachinery(m.synthesis ?? ""), why: scrubMachinery(m.why ?? "") })),
  confidence: r.confidence
    ? { ...r.confidence, factors: (r.confidence.factors ?? []).map((f: any) => ({ ...f, plain: scrubMachinery(f.plain ?? ""), astro: scrubMachinery(f.astro ?? "") })) }
    : r.confidence,
});
const scrubChapter = (c: Chapter): Chapter => ({
  ...c,
  chapterGoodFor: (c.chapterGoodFor ?? []).map(scrubMachinery),
  chapterAvoid: (c.chapterAvoid ?? []).map(scrubMachinery),
});

// Returns the reason a read FAILS a guard (too long / machinery leak), or null if it's clean.
export function guardViolation(fullText: string, maxWords: number, bannedPhrases?: string[], skipMachinery = false): string | null {
  const wc = wordCount(fullText);
  if (wc > maxWords) return `TOO LONG: your last attempt was ${wc} words. HARD LIMIT is ${maxWords} words — cut it, do not exceed.`;
  // David's law 3, ENFORCED (three generations restated it): the day's character line is
  // printed above the prose — a story that repeats it is rejected like one that runs long.
  for (const p of bannedPhrases ?? []) {
    if (p && p.length > 10 && fullText.toLowerCase().includes(p.toLowerCase())) {
      return `RESTATED THE DAY SENTENCE: your prose contains "${p}", which is already printed above your story. Remove it — steer through a character's ask instead, and spend the words on the cast.`;
    }
  }
  // THE FATE BAN HOLDS EVERYWHERE, including the surfaces that name machinery by design (audit
  // 2026-07-20). "the path is COMPUTED, NOT FIXED" is the brand's own metaphysics and the reason
  // "destined" is banned in copy — but the word appeared in no tail's ban list, in MACHINERY, or
  // in SCRUB, so nothing in the pipeline could stop it. It sits ABOVE the skipMachinery return
  // because the atlas and the house explorer are allowed their jargon, never a decree.
  const fate = fullText.match(FATE_DECREE);
  if (fate) return `BANNED — THIS APP DOES NOT DEAL IN FATE: your last attempt printed "${fate[0]}". The path is computed from where the planets actually are, not fixed in advance. Rewrite that sentence so the result sits in this person's hands: what the sky tilts toward, what they can meet it with.`;
  if (skipMachinery) return null;
  const mm = fullText.match(MACHINERY);
  if (mm) return `BANNED CHART JARGON: your last attempt printed "${mm[0]}". Rewrite with ZERO machinery — no house numbers, no sign names, no dignity/motion terms (exalted, debilitated, retrograde, combust). Translate every one into plain felt language.`;
  return null;
}

/** David's roll call, ENFORCED (Venus vanished twice): every loaded planet the input
 *  names must appear in the prose by NAME. Returns the correction, or null. */
export function missingCast(fullText: string, requiredNames?: string[]): string | null {
  const missing = (requiredNames ?? []).filter((n) => n && !new RegExp(`\\b${n}\\b`, "i").test(fullText));
  if (missing.length) {
    return `MISSING ESSENTIAL CHARACTERS: ${missing.join(", ")} — the input marks them as carrying this day (running lords / the year's guide). Every one must appear BY NAME, in character, in the one thread. Rewrite with the full cast.`;
  }
  return null;
}

/** THE TWO-PART DAY, ENFORCED (David's condition, 2026-07-20).
 *
 *  He ruled the day's LABEL should shift with the star — "A if the prose already honestly covers
 *  both." That conditional is the whole point: the label may only follow the sky if the reading
 *  genuinely reads the day in two parts. Otherwise a reader watches the header change at 3:42 and
 *  gets prose that never mentions a turn.
 *
 *  I could not verify the OUTPUT by inspection — a law being in the prompt is not the prose obeying
 *  it, which is the distinction this entire run has been about. So the condition is ENFORCED rather
 *  than assumed: on a turning day the prose must name the hour (his "favourable for creative work
 *  until 3:00 PM" shape) or name the second star. One corrective retry, same as the roll call; if it
 *  still misses, the best draft ships rather than nothing.
 *
 *  The clock is matched loosely — "3:42 PM", "3:42pm" and "3:42" all count, because a model writing
 *  "until about 3:42" is obeying him, and demanding the exact rendering would reject honest prose.
 */
export function missingTurn(fullText: string, starTurn?: { toStar?: string; atLocalTime?: string } | null): string | null {
  if (!starTurn?.atLocalTime) return null;
  const hhmm = starTurn.atLocalTime.replace(/\s*[AP]M$/i, "").trim();
  if (fullText.includes(hhmm)) return null;
  if (starTurn.toStar && new RegExp(`\\b${starTurn.toStar}\\b`, "i").test(fullText)) return null;
  return `THE DAY TURNS AND YOUR PROSE DOES NOT SAY SO: the Moon changes star at ${starTurn.atLocalTime}, so this day is NOT one mood. Write it in two parts and NAME THE HOUR in plain clock language — what holds until ${starTurn.atLocalTime}, and what the day wants after it. Do not flatten it into a single tone.`;
}

// One tool call, validated against the guards, with a single corrective retry if it trips one.
async function callGuarded<T>(o: {
  c: Anthropic; tail: string; toolName: string; schema: any; input: NarrativeInput;
  maxTokens: number; maxWords: number; complete: (x: any) => x is T; textOf: (x: T) => string;
  bannedPhrases?: string[];
  /** Present only on a day the Moon changes star — see missingTurn. */
  starTurn?: { toStar?: string; atLocalTime?: string } | null;
  requiredNames?: string[];
  skipMachinery?: boolean;
}): Promise<T | null> {
  const base = [
    { type: "text" as const, text: BASE_PROMPT, cache_control: { type: "ephemeral" as const } },
    { type: "text" as const, text: o.tail },
  ];
  const run = async (correction?: string): Promise<T | null> => {
    countApiCall();
    const msg = await o.c.messages.create({
      model: MODEL, max_tokens: o.maxTokens,
      system: correction ? [...base, { type: "text" as const, text: correction }] : base,
      tools: [{ name: o.toolName, description: `Return the ${o.toolName}.`, input_schema: o.schema }],
      tool_choice: { type: "tool", name: o.toolName },
      messages: [{ role: "user", content: JSON.stringify(o.input) }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    // These two nulls were SILENT until the 2026-07-17 outage — a truncated or tool-less
    // reply produced a quiet surface with an empty black box. Now they're recorded.
    if (!block || block.type !== "tool_use") { logGenError(o.toolName, `reply had no tool block (stop_reason=${msg.stop_reason})`); return null; }
    if (!o.complete(block.input)) { logGenError(o.toolName, `incomplete tool input (stop_reason=${msg.stop_reason}; keys=${Object.keys((block.input as any) ?? {}).join(",") || "none"})`); return null; }
    return block.input as T;
  };
  let best = await run();
  if (!best) return null;
  let bad = guardViolation(o.textOf(best), o.maxWords, o.bannedPhrases, o.skipMachinery) ?? missingCast(o.textOf(best), o.requiredNames) ?? missingTurn(o.textOf(best), o.starTurn);
  if (!bad) return best;
  // Up to TWO corrective retries (3 attempts total), each naming the exact violation. Return the
  // first CLEAN result; if none comes back clean, serve the last best-effort rather than a blank
  // day. Bounded cost, and only fires when a guard actually trips. (A surviving dignity/motion term
  // is then scrubbed deterministically by the caller — see scrubMachinery — so the WORD never ships.)
  for (let attempt = 1; attempt <= 2 && bad; attempt++) {
    console.warn(`[narrative] ${o.toolName} tripped a guard (attempt ${attempt}), regenerating: ${bad}`);
    const next = await run(`CRITICAL — your previous attempt was REJECTED. ${bad} Return the ${o.toolName} tool again, fully corrected.`);
    if (next) { best = next; bad = guardViolation(o.textOf(next), o.maxWords, o.bannedPhrases, o.skipMachinery) ?? missingCast(o.textOf(next), o.requiredNames) ?? missingTurn(o.textOf(next), o.starTurn); }
  }
  return best;
}

export async function generateDayRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: DAY_READ_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // Hard token ceiling (was 800 → ~600 words). The 130-word guard is the real length enforcer;
      // 400 just lets a slightly-over draft COMPLETE so the guard can catch and correct it.
      maxTokens: 620, maxWords: 190,
      // Law 3 with teeth: the day headline may not reappear inside the prose.
      bannedPhrases: [(input as any).dayFilter?.headline].filter(Boolean) as string[],
      // His condition for letting the label shift: the prose must actually read the day in two parts.
      starTurn: (input as any).panchang?.starTurn ?? null,
      // The roll call with teeth: the year's guide + the running lords must appear by name.
      // Audit 2026-07-16: the ANTAR lord joined — "Venus vanished twice" could still ship
      // when the vanished lord was the antardasha. Pratyantar stays soft (trigger-level
      // texture; hard-requiring it made retries too brittle).
      requiredNames: Array.from(new Set([
        (input as any).profection?.timeLord,
        (input as any).dasha?.mahaDasha?.lord,
        (input as any).dasha?.antarDasha?.lord,
      ].filter(Boolean))) as string[],
      complete: isCompleteDayRead,
      // The question is one short line, excluded from the story's word budget.
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null; // deterministic scrub is the final guarantee no banned term ships
  } catch (err) {
    logGenError("generateDayRead", err);
    return null;
  }
}

// Reject a truncated day read so the caller falls back instead of rendering half a read.
function isCompleteDayRead(r: any): r is DayRead {
  return !!r && typeof r.scene === "string" && typeof r.story === "string" && typeof r.tilt === "string" && typeof r.closeLine === "string" && typeof r.question === "string";
}
export { isCompleteDayRead };

// THE HOROSCOPE — one life area, read deep through its topical varga, pointed at the picked date.
// Same DayRead shape (so it renders like the hero and rides the same guards), a different tail
// (LIFE_AREA_TAIL) and a life-area lens in the input. The tool is still named day_read — the shape
// is identical; only the SCOPE (one area, gone deep) differs.
export async function generateLifeAreaRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: LIFE_AREA_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // PREMIUM room: a paid, kept reading targets ~350 words; 450 is the hard cap the guard enforces.
      // ~900 tokens lets a full ~450-word draft complete so the guard can catch + correct an overrun.
      maxTokens: 900, maxWords: 450,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null; // deterministic scrub is the final guarantee no banned term ships
  } catch (err) {
    logGenError("generateLifeAreaRead", err);
    return null;
  }
}

// THE ECLIPSE SEASON — one arc across a whole double-eclipse (build → resets → aftermath), read for
// this chart's houses. DayRead shape + the same guards, with a longer premium cap (a season legitimately
// covers more than a day) and the eclipse-season lens in the input (input.eclipseSeasonArc).
export async function generateEclipseSeasonRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: ECLIPSE_SEASON_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // A whole season across two eclipses → ~420-word target, 550 hard cap. ~1100 tokens lets a full
      // draft complete so the guard can catch + correct an overrun.
      maxTokens: 1100, maxWords: 550,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null; // deterministic scrub — no banned term ships
  } catch (err) {
    logGenError("generateEclipseSeasonRead", err);
    return null;
  }
}

// THE MERCURY RETROGRADE — one arc across a whole Mercury rx cycle (pre-shadow build → review →
// retroshade clearing), read for this chart's house(s). DayRead shape + the same guards; a single-theme
// cycle gets a tighter cap than the two-eclipse season. Data: input.mercuryRxArc.
export async function generateTlWindowRead(input: any): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: TL_WINDOW_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // PAID MUST OUTWEIGH FREE (David's ruling, 2026-07-20): "paid surfaces must always be more
      // words than the free day read. people are paying for deeper insight." The free day read is
      // 190 words. This surface was BELOW it — a paying reader got less prose than a free one.
      // 280 is the floor for the three FOCUSED paid reads (this, the time-lord window, the yoga
      // read); the broad ones already sit at 360-650. The number is a proposal, the ORDERING is his
      // rule and is enforced by paid-word-floor.test.ts.
      maxTokens: 1150, maxWords: 280,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null;
  } catch (err) {
    logGenError("generateTlWindowRead", err);
    return null;
  }
}

export async function generateCombinedRead(input: any): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: COMBINED_READ_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      maxTokens: 1000, maxWords: 420,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null;
  } catch (err) {
    logGenError("generateCombinedRead", err);
    return null;
  }
}

export async function generatePlanetRxRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: PLANET_RX_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      maxTokens: 950, maxWords: 460,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null;
  } catch (err) {
    logGenError("generatePlanetRxRead", err);
    return null;
  }
}

export async function generateMercuryRxRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: MERCURY_RX_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // A whole rx cycle → ~340-word target, 460 hard cap. ~950 tokens lets a full draft complete
      // so the guard can catch + correct an overrun.
      maxTokens: 950, maxWords: 460,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null; // deterministic scrub — no banned term ships
  } catch (err) {
    logGenError("generateMercuryRxRead", err);
    return null;
  }
}

// THE MONTH — the full layered read (Time Lord / dasha / profection / natal + the sky) expanded to a
// whole month's scenes/characters/conversations/arcs. DayRead shape + the same guards, with the widest
// premium cap (a month legitimately holds the most). Data: input.monthArc + the standing layers.
export async function generateMonthRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<DayRead>({
      c, tail: MONTH_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // A whole month → ~470-word target, 650 hard cap. ~1300 tokens lets a full draft complete so the
      // guard can catch + correct an overrun.
      maxTokens: 1300, maxWords: 650,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
    return r ? scrubDayRead(r) : null; // deterministic scrub — no banned term ships
  } catch (err) {
    logGenError("generateMonthRead", err);
    return null;
  }
}

// THE READ — THE CAST. The layer behind the day-story: today's loud players as CHARACTERS, in
// ONE PG-playful paragraph (NOT sectioned cards — the schema is a single string, so it CANNOT come
// back broken into per-planet blocks). Personified, no chart machinery, ≤120 words. Lazy: fires
// only when THE READ is tapped.
export type Cast = { read: string };

const CAST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["read"],
  properties: {
    read: { type: "string" },
  },
} as const;

export async function generateCast(input: NarrativeInput): Promise<Cast | null> {
  const c = client();
  if (!c) return null;
  try {
    const r = await callGuarded<Cast>({
      c, tail: CAST_TAIL, toolName: "cast", schema: CAST_SCHEMA as any, input,
      // One ~120-word paragraph ≈ ~165 tokens; 320 lets a slightly-long draft complete so the
      // 130-word guard can catch + correct it. (Was 900 → ~700-word five-card wall.)
      maxTokens: 320, maxWords: 130,
      complete: isCompleteCast,
      textOf: (r) => r.read,
    });
    return r ? { read: scrubMachinery(r.read) } : null; // deterministic scrub — no banned term ships
  } catch (err) {
    logGenError("generateCast", err);
    return null;
  }
}

// Reject an empty/truncated cast so the caller falls back instead of rendering a blank sheet.
function isCompleteCast(r: any): r is Cast {
  return !!r && typeof r.read === "string" && r.read.trim().length > 0;
}
export { isCompleteCast };

// ── THE HOUSE READER (David 2026-07-16) — one stored-research house, voiced. ──────────
const HOUSE_READ_SCHEMA = {
  type: "object",
  properties: {
    read: { type: "string", description: "The house voiced as a room, ≤320 words." },
    question: { type: "string", description: "One specific, checkable question." },
  },
  required: ["read", "question"],
} as const;

export type HouseRead = { read: string; question: string };
export function isCompleteHouseRead(r: any): r is HouseRead {
  return !!r && typeof r.read === "string" && r.read.length > 80 && typeof r.question === "string";
}

export async function generateHouseRead(input: any): Promise<HouseRead | null> {
  const c = client();
  if (!c) return null;
  try {
    return await callGuarded<HouseRead>({
      c, tail: HOUSE_READ_TAIL, toolName: "house_read", schema: HOUSE_READ_SCHEMA as any, input,
      maxTokens: 1500, maxWords: 360,
      skipMachinery: true, // the house explorer names planets/signs by design
      complete: isCompleteHouseRead,
      textOf: (r) => r.read,
    });
  } catch (err) {
    logGenError("generateHouseRead", err);
    return null;
  }
}

// ── THE CHAPTER READER (David 2026-07-16) — one mahadasha, voiced from the dossier. ──
export type DashaRead = { read: string; question: string };
export function isCompleteDashaRead(r: any): r is DashaRead {
  return !!r && typeof r.read === "string" && r.read.length > 80 && typeof r.question === "string";
}
export async function generateDashaRead(input: any): Promise<DashaRead | null> {
  const c = client();
  if (!c) return null;
  try {
    return await callGuarded<DashaRead>({
      c, tail: DASHA_READ_TAIL, toolName: "dasha_read",
      schema: { type: "object", properties: { read: { type: "string" }, question: { type: "string" } }, required: ["read", "question"] } as any,
      input, maxTokens: 1500, maxWords: 360, skipMachinery: true,
      complete: isCompleteDashaRead, textOf: (r) => r.read,
    });
  } catch (err) {
    logGenError("generateDashaRead", err);
    return null;
  }
}

// ── THE THEME READER (the Life Atlas voice — David 2026-07-16) ────────────────────────
export type AtlasRead = { read: string; question: string };
export interface YogaRead { read: string }
export function isCompleteYogaRead(r: any): r is YogaRead {
  return !!r && typeof r.read === "string" && r.read.length > 60;
}
export async function generateYogaRead(input: any): Promise<YogaRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const { YOGA_READ_TAIL } = await import("./prompts.js");
    return await callGuarded<YogaRead>({
      c, tail: YOGA_READ_TAIL, toolName: "yoga_read",
      schema: { type: "object", properties: { read: { type: "string" } }, required: ["read"] } as any,
      // PAID MUST OUTWEIGH FREE (David 2026-07-20): the free day read is 190 words; a paying
      // reader must never get less prose. 280 is the floor for the focused paid reads; the broad
      // ones already sit at 360-650. Ordering enforced by paid-word-floor.test.ts.
      input, maxTokens: 1150, maxWords: 280, skipMachinery: true,
      complete: isCompleteYogaRead, textOf: (r) => r.read,
    });
  } catch (err) {
    logGenError("generateYogaRead", err);
    return null;
  }
}

export interface WindowRead { read: string }
export function isCompleteWindowRead(r: any): r is WindowRead {
  return !!r && typeof r.read === "string" && r.read.length > 40;
}
export async function generateWindowRead(input: any): Promise<WindowRead | null> {
  const c = client();
  if (!c) return null;
  try {
    const { WINDOW_READ_TAIL } = await import("./prompts.js");
    return await callGuarded<WindowRead>({
      c, tail: WINDOW_READ_TAIL, toolName: "window_read",
      schema: { type: "object", properties: { read: { type: "string" } }, required: ["read"] } as any,
      // PAID MUST OUTWEIGH FREE (David 2026-07-20): the free day read is 190 words; a paying
      // reader must never get less prose. 280 is the floor for the focused paid reads; the broad
      // ones already sit at 360-650. Ordering enforced by paid-word-floor.test.ts.
      input, maxTokens: 1150, maxWords: 280, skipMachinery: true,
      complete: isCompleteWindowRead, textOf: (r) => r.read,
    });
  } catch (err) {
    logGenError("generateWindowRead", err);
    return null;
  }
}

export function isCompleteAtlasRead(r: any): r is AtlasRead {
  return !!r && typeof r.read === "string" && r.read.length > 80 && typeof r.question === "string";
}
export async function generateAtlasRead(input: any): Promise<AtlasRead | null> {
  const c = client();
  if (!c) return null;
  try {
    return await callGuarded<AtlasRead>({
      c, tail: ATLAS_READ_TAIL, toolName: "atlas_read",
      schema: { type: "object", properties: { read: { type: "string" }, question: { type: "string" } }, required: ["read", "question"] } as any,
      input, maxTokens: 1600, maxWords: 380, skipMachinery: true,
      complete: isCompleteAtlasRead, textOf: (r) => r.read,
    });
  } catch (err) {
    logGenError("generateAtlasRead", err);
    return null;
  }
}
