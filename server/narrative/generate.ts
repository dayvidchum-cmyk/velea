// Calls Claude Sonnet 4.6 to produce the Glance (one sentence) and Deep Read
// (six structured sections). Returns null when ANTHROPIC_API_KEY is absent so
// callers can fall back to existing static content.
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, GLANCE_TAIL, DEEP_READ_TAIL, MODEL } from "./prompts.js";
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
  chapterGoodFor: string[];
  chapterAvoid: string[];
  confidence: { level: "Low" | "Moderate" | "High"; factors: { plain: string; astro: string }[] };
};

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
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
  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: `${BASE_PROMPT}\n\n${GLANCE_TAIL}`,
    tools: [{ name: "glance", description: "Return the colored day-mode narrative and the personalized question.", input_schema: GLANCE_SCHEMA as any }],
    tool_choice: { type: "tool", name: "glance" },
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? (block.input as GlanceContent) : null;
}

const SECTION = { type: "object", additionalProperties: false, required: ["synthesis", "why"], properties: { synthesis: { type: "string" }, why: { type: "string" } } } as const;

const DEEP_READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["coreTheme", "whyNow", "manifestations", "developmentalTask", "chapterGoodFor", "chapterAvoid", "confidence"],
  properties: {
    coreTheme: SECTION,
    whyNow: SECTION,
    manifestations: {
      type: "array", minItems: 2, maxItems: 4,
      items: { type: "object", additionalProperties: false, required: ["area", "synthesis", "why"], properties: { area: { type: "string" }, synthesis: { type: "string" }, why: { type: "string" } } },
    },
    developmentalTask: SECTION,
    chapterGoodFor: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    chapterAvoid: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
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
  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 3200,
    system: `${BASE_PROMPT}\n\n${DEEP_READ_TAIL}`,
    tools: [{ name: "deep_read", description: "Return the deep-read sections.", input_schema: DEEP_READ_SCHEMA as any }],
    tool_choice: { type: "tool", name: "deep_read" },
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  return isCompleteDeepRead(block.input) ? (block.input as DeepRead) : null;
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
    && Array.isArray(r.chapterGoodFor)
    && Array.isArray(r.chapterAvoid)
    && !!r.confidence && typeof r.confidence.level === "string"
    && Array.isArray(r.confidence.factors) && r.confidence.factors.every((f: any) => f && typeof f.plain === "string" && typeof f.astro === "string");
}
export { isCompleteDeepRead };
