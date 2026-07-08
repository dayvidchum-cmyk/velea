// Calls Claude Sonnet 4.6 to produce the Glance (one sentence) and Deep Read
// (six structured sections). Returns null when ANTHROPIC_API_KEY is absent so
// callers can fall back to existing static content.
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, GLANCE_TAIL, DEEP_READ_TAIL, CHAPTER_TAIL, MODEL } from "./prompts.js";
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

export type GlanceContent = { narrative: string; question: string; goodFor: string[]; avoid: string[] };

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
