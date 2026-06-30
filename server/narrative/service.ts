// Cache-aware narrative surfaces. Reads from narrative_cache, generates on miss,
// returns nulls when the LLM is unavailable so callers fall back to static copy.
import { createHash } from "node:crypto";
import { buildNarrativeInput } from "./input-builder.js";
import { generateGlance, generateDeepRead, isCompleteDeepRead, hasAnthropicKey, type DeepRead, type GlanceContent } from "./generate.js";
import { MODEL, PROMPT_VERSION } from "./prompts.js";
import { getNarrativeCache, upsertNarrativeCache } from "../db.js";

// PROMPT_VERSION is part of the key so a prompt change busts the cache — otherwise a
// stale read (generated under an older prompt) keeps being served until the chart data
// itself changes.
function hashInput(input: unknown): string {
  return createHash("sha256").update(PROMPT_VERSION + "|" + JSON.stringify(input)).digest("hex");
}

export type GlanceResult = { available: boolean; content: GlanceContent | null; generatedAt: Date | null; cached: boolean };
export type DeepReadResult = { available: boolean; read: DeepRead | null; generatedAt: Date | null; cached: boolean };

export async function getGlanceCached(profileId: number, date: string, refresh = false): Promise<GlanceResult> {
  if (!hasAnthropicKey()) return { available: false, content: null, generatedAt: null, cached: false };
  const input = await buildNarrativeInput(profileId, date);
  const hash = hashInput(input);

  if (!refresh) {
    const row = await getNarrativeCache(profileId, "glance", date);
    if (row && row.inputHash === hash) {
      try {
        return { available: true, content: JSON.parse(row.content) as GlanceContent, generatedAt: row.generatedAt, cached: true };
      } catch {
        /* old plain-text or corrupt cache — fall through to regenerate */
      }
    }
  }
  const content = await generateGlance(input);
  if (content) await upsertNarrativeCache(profileId, "glance", date, hash, MODEL, JSON.stringify(content));
  return { available: true, content, generatedAt: new Date(), cached: false };
}

export async function getDeepReadCached(profileId: number, date: string, refresh = false): Promise<DeepReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const input = await buildNarrativeInput(profileId, date);
  const hash = hashInput(input);

  if (!refresh) {
    const row = await getNarrativeCache(profileId, "deep", date);
    if (row && row.inputHash === hash) {
      try {
        const read = JSON.parse(row.content);
        // Only trust a cached read that is complete; partial/old rows regenerate.
        if (isCompleteDeepRead(read)) {
          return { available: true, read, generatedAt: row.generatedAt, cached: true };
        }
      } catch {
        /* fall through to regenerate on corrupt cache */
      }
    }
  }
  const read = await generateDeepRead(input);
  if (read) await upsertNarrativeCache(profileId, "deep", date, hash, MODEL, JSON.stringify(read));
  return { available: true, read, generatedAt: new Date(), cached: false };
}
