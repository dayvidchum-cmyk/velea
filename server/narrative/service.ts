// Cache-aware narrative surfaces. Reads from narrative_cache, generates on miss,
// returns nulls when the LLM is unavailable so callers fall back to static copy.
import { createHash } from "node:crypto";
import { buildNarrativeInput } from "./input-builder.js";
import { generateGlance, generateDeepRead, isCompleteDeepRead, hasAnthropicKey, type DeepRead, type GlanceContent } from "./generate.js";
import { MODEL, PROMPT_VERSION } from "./prompts.js";
import { getNarrativeCache, getLatestNarrativeCache, upsertNarrativeCache } from "../db.js";

// PROMPT_VERSION is part of the key so a prompt change busts the cache — otherwise a
// stale read (generated under an older prompt) keeps being served until the chart data
// itself changes.
function hashInput(input: unknown): string {
  return createHash("sha256").update(PROMPT_VERSION + "|" + JSON.stringify(input)).digest("hex");
}

export type GlanceResult = { available: boolean; content: GlanceContent | null; generatedAt: Date | null; cached: boolean };
export type DeepReadResult = { available: boolean; read: DeepRead | null; generatedAt: Date | null; cached: boolean };

export async function getGlanceCached(profileId: number, date: string, refresh = false, moment?: { nowMs: number; lat?: number; lon?: number }): Promise<GlanceResult> {
  if (!hasAnthropicKey()) return { available: false, content: null, generatedAt: null, cached: false };
  // A moment read (moment.nowMs) is hora-flavored and EPHEMERAL: never read from nor
  // written to the daily cache, so the stable per-day read stays clean and returns on reload.
  const isMoment = moment != null;
  const input = await buildNarrativeInput(profileId, date, isMoment ? moment : undefined);
  const hash = hashInput(input);

  if (!refresh && !isMoment) {
    const row = await getNarrativeCache(profileId, "glance", date);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        return { available: true, content: JSON.parse(row.content) as GlanceContent, generatedAt: row.generatedAt, cached: true };
      } catch {
        /* old plain-text or corrupt cache — fall through to regenerate */
      }
    }
  }
  const content = await generateGlance(input);
  // No content (dry wallet / API error / parse fail) → signal unavailable so the client shows
  // static copy, exactly like the no-API-key path above. Never a blank day.
  if (!content) return { available: false, content: null, generatedAt: null, cached: false };
  if (!isMoment) await upsertNarrativeCache(profileId, "glance", date, hash, MODEL, JSON.stringify(content));
  return { available: true, content, generatedAt: new Date(), cached: false };
}

// deepened=false → the STAGE read: slow-only input (yearly chapter), stable across days.
// deepened=true → the "stage + guests" read: full input incl. the fast/current-sky tier.
// Cached under separate surfaces ("deep" vs "deep_full") so they never overwrite each other.
export async function getDeepReadCached(profileId: number, date: string, refresh = false, deepened = false): Promise<DeepReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = deepened ? "deep_full" : "deep";
  const input = await buildNarrativeInput(profileId, date, deepened ? undefined : { slowOnly: true });
  const hash = hashInput(input);

  if (!refresh) {
    let row = await getNarrativeCache(profileId, surface, date);
    // STAGE read is date-independent: if today has no matching row, reuse the most recent
    // row whose input hash still matches (the chapter hasn't turned) instead of
    // regenerating identical prose — this is what keeps the year read from drifting daily.
    if (!deepened && (!row || (!row.locked && row.inputHash !== hash))) {
      const latest = await getLatestNarrativeCache(profileId, surface);
      if (latest && (latest.locked || latest.inputHash === hash)) row = latest;
    }
    if (row && (row.locked || row.inputHash === hash)) {
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
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  await upsertNarrativeCache(profileId, surface, date, hash, MODEL, JSON.stringify(read));
  return { available: true, read, generatedAt: new Date(), cached: false };
}
