// Calls Claude Sonnet 4.6 to produce the Glance (one sentence) and Deep Read
// (six structured sections). Returns null when ANTHROPIC_API_KEY is absent so
// callers can fall back to existing static content.
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, GLANCE_TAIL, DEEP_READ_TAIL, CHAPTER_TAIL, DAY_READ_TAIL, LIFE_AREA_TAIL, CAST_TAIL, MODEL } from "./prompts.js";
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

function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
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

export type GlanceContent = { narrative: string; question: string; goodFor: string[]; avoid: string[]; ledger?: string[] };

const GLANCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["narrative", "question", "goodFor", "avoid"],
  properties: {
    narrative: { type: "string" },
    question: { type: "string" },
    goodFor: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    avoid: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
  },
} as const;

export async function generateGlance(input: NarrativeInput): Promise<GlanceContent | null> {
  const c = client();
  if (!c) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 700,
      // Prompt caching: BASE_PROMPT (the big stable system) + tools are cached as the prefix;
      // the small per-call tail stays uncached. A 5-min ephemeral cache — same-type calls inside
      // the window read at ~0.1x input cost instead of paying full price each time.
      system: [
        { type: "text" as const, text: BASE_PROMPT, cache_control: { type: "ephemeral" as const } },
        { type: "text" as const, text: GLANCE_TAIL },
      ],
      tools: [{ name: "glance", description: "Return the colored day-mode narrative and the personalized question.", input_schema: GLANCE_SCHEMA as any }],
      tool_choice: { type: "tool", name: "glance" },
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    return block && block.type === "tool_use" ? (block.input as GlanceContent) : null;
  } catch (err) {
    // Dry wallet (400 "credit balance too low"), rate limit, timeout, network — ANY API failure
    // returns null so callers fall back to static copy instead of a blank day.
    console.error("[narrative] generateGlance failed, using static fallback:", (err as any)?.message ?? err);
    return null;
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
    if (!block || block.type !== "tool_use") return null;
    return isCompleteDeepRead(block.input) ? (block.input as DeepRead) : null;
  } catch (err) {
    console.error("[narrative] generateDeepRead failed, using static fallback:", (err as any)?.message ?? err);
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
    if (!block || block.type !== "tool_use") return null;
    return isCompleteChapter(block.input) ? (block.input as Chapter) : null;
  } catch (err) {
    console.error("[narrative] generateChapter failed, using static fallback:", (err as any)?.message ?? err);
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

const wordCount = (s: string): number => (s.trim().match(/\S+/g) ?? []).length;

// Returns the reason a read FAILS a guard (too long / machinery leak), or null if it's clean.
export function guardViolation(fullText: string, maxWords: number): string | null {
  const wc = wordCount(fullText);
  if (wc > maxWords) return `TOO LONG: your last attempt was ${wc} words. HARD LIMIT is ${maxWords} words — cut it, do not exceed.`;
  const m = fullText.match(MACHINERY);
  if (m) return `BANNED CHART JARGON: your last attempt printed "${m[0]}". Rewrite with ZERO machinery — no house numbers, no sign names, no dignity/motion terms (exalted, debilitated, retrograde, combust). Translate every one into plain felt language.`;
  return null;
}

// One tool call, validated against the guards, with a single corrective retry if it trips one.
async function callGuarded<T>(o: {
  c: Anthropic; tail: string; toolName: string; schema: any; input: NarrativeInput;
  maxTokens: number; maxWords: number; complete: (x: any) => x is T; textOf: (x: T) => string;
}): Promise<T | null> {
  const base = [
    { type: "text" as const, text: BASE_PROMPT, cache_control: { type: "ephemeral" as const } },
    { type: "text" as const, text: o.tail },
  ];
  const run = async (correction?: string): Promise<T | null> => {
    const msg = await o.c.messages.create({
      model: MODEL, max_tokens: o.maxTokens,
      system: correction ? [...base, { type: "text" as const, text: correction }] : base,
      tools: [{ name: o.toolName, description: `Return the ${o.toolName}.`, input_schema: o.schema }],
      tool_choice: { type: "tool", name: o.toolName },
      messages: [{ role: "user", content: JSON.stringify(o.input) }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    return o.complete(block.input) ? (block.input as T) : null;
  };
  const first = await run();
  if (!first) return null;
  const bad = guardViolation(o.textOf(first), o.maxWords);
  if (!bad) return first;
  // ONE corrective retry, naming the exact violation. Bounded cost; only fires on a real miss.
  console.warn(`[narrative] ${o.toolName} tripped a guard, regenerating once: ${bad}`);
  const retry = await run(`CRITICAL — your previous attempt was REJECTED. ${bad} Return the ${o.toolName} tool again, corrected. This is your last attempt.`);
  return retry ?? first; // serve the better-of-two rather than a blank day
}

export async function generateDayRead(input: NarrativeInput): Promise<DayRead | null> {
  const c = client();
  if (!c) return null;
  try {
    return await callGuarded<DayRead>({
      c, tail: DAY_READ_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // Hard token ceiling (was 800 → ~600 words). The 130-word guard is the real length enforcer;
      // 400 just lets a slightly-over draft COMPLETE so the guard can catch and correct it.
      maxTokens: 400, maxWords: 130,
      complete: isCompleteDayRead,
      // The question is one short line, excluded from the story's word budget.
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
  } catch (err) {
    console.error("[narrative] generateDayRead failed, using static fallback:", (err as any)?.message ?? err);
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
    return await callGuarded<DayRead>({
      c, tail: LIFE_AREA_TAIL, toolName: "day_read", schema: DAY_READ_SCHEMA as any, input,
      // PREMIUM room: a paid, kept reading targets ~350 words; 450 is the hard cap the guard enforces.
      // ~900 tokens lets a full ~450-word draft complete so the guard can catch + correct an overrun.
      maxTokens: 900, maxWords: 450,
      complete: isCompleteDayRead,
      textOf: (r) => [r.scene, r.story, r.tilt, r.closeLine].join(" "),
    });
  } catch (err) {
    console.error("[narrative] generateLifeAreaRead failed, using static fallback:", (err as any)?.message ?? err);
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
    return await callGuarded<Cast>({
      c, tail: CAST_TAIL, toolName: "cast", schema: CAST_SCHEMA as any, input,
      // One ~120-word paragraph ≈ ~165 tokens; 320 lets a slightly-long draft complete so the
      // 130-word guard can catch + correct it. (Was 900 → ~700-word five-card wall.)
      maxTokens: 320, maxWords: 130,
      complete: isCompleteCast,
      textOf: (r) => r.read,
    });
  } catch (err) {
    console.error("[narrative] generateCast failed, using static fallback:", (err as any)?.message ?? err);
    return null;
  }
}

// Reject an empty/truncated cast so the caller falls back instead of rendering a blank sheet.
function isCompleteCast(r: any): r is Cast {
  return !!r && typeof r.read === "string" && r.read.trim().length > 0;
}
export { isCompleteCast };
