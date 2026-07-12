// Cache-aware narrative surfaces. Reads from narrative_cache, generates on miss,
// returns nulls when the LLM is unavailable so callers fall back to static copy.
import { createHash } from "node:crypto";
import { buildNarrativeInput } from "./input-builder.js";
import { generateGlance, generateDeepRead, generateChapter, generateDayRead, isCompleteDeepRead, isCompleteChapter, isCompleteDayRead, hasAnthropicKey, type DeepRead, type Chapter, type DayRead, type GlanceContent } from "./generate.js";
import { MODEL, PROMPT_VERSION, SURFACE_VERSION } from "./prompts.js";
import { getNarrativeCache, getLatestNarrativeCache, upsertNarrativeCache } from "../db.js";

// PROMPT_VERSION is part of the key so a prompt change busts the cache — otherwise a
// stale read (generated under an older prompt) keeps being served until the chart data
// itself changes. An optional per-surface salt (SURFACE_VERSION[surface]) lets a single
// surface's prompt change bust ONLY that surface, leaving the others' caches (and cost) alone.
// Surfaces with no salt append nothing, so their hash is byte-identical to the pre-salt formula.
function hashInput(input: unknown, surface?: string): string {
  const salt = surface ? SURFACE_VERSION[surface] : undefined;
  const prefix = PROMPT_VERSION + "|" + (salt ? salt + "|" : "");
  return createHash("sha256").update(prefix + JSON.stringify(input)).digest("hex");
}

export type GlanceResult = { available: boolean; content: GlanceContent | null; generatedAt: Date | null; cached: boolean };
export type DeepReadResult = { available: boolean; read: DeepRead | null; generatedAt: Date | null; cached: boolean };
export type ChapterResult = { available: boolean; chapter: Chapter | null; generatedAt: Date | null; cached: boolean };

// Single-flight: an LLM generation takes ~1–2 min. Without this, a second request for the SAME
// (profile, surface, date, input) while the first is still generating would fire a DUPLICATE
// (expensive) LLM call — e.g. the user navigates away and back, or React Query refetches. Instead,
// overlapping callers share the one in-flight promise and all resolve when it completes.
const inFlight = new Map<string, Promise<unknown>>();
function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

export async function getGlanceCached(profileId: number, date: string, refresh = false, moment?: { nowMs: number; lat?: number; lon?: number }, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<GlanceResult> {
  if (!hasAnthropicKey()) return { available: false, content: null, generatedAt: null, cached: false };
  // A moment read (moment.nowMs) is hora-flavored and EPHEMERAL: never read from nor
  // written to the daily cache, so the stable per-day read stays clean and returns on reload.
  const isMoment = moment != null;
  // dayLoc = the viewer's location basis for the day-mode, so the read matches the hero.
  const input = await buildNarrativeInput(profileId, date, isMoment ? { ...moment, dayLoc } : { dayLoc });
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
  const content = await singleFlight(`glance:${profileId}:${date}:${hash}`, async () => {
    const c = await generateGlance(input);
    // Persist inside the single-flight so the one generation writes the cache once; coalesced
    // callers then share it (and every later request hits the cache, fast).
    if (c && !isMoment) await upsertNarrativeCache(profileId, "glance", date, hash, MODEL, JSON.stringify(c));
    return c;
  });
  // No content (dry wallet / API error / parse fail) → signal unavailable so the client shows
  // static copy, exactly like the no-API-key path above. Never a blank day.
  if (!content) return { available: false, content: null, generatedAt: null, cached: false };
  return { available: true, content, generatedAt: new Date(), cached: false };
}

// deepened=false → the STAGE read: slow-only input (yearly chapter), stable across days.
// deepened=true → the "stage + guests" read: full input incl. the fast/current-sky tier.
// Cached under separate surfaces ("deep" vs "deep_full") so they never overwrite each other.
export async function getDeepReadCached(profileId: number, date: string, refresh = false, deepened = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<DeepReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = deepened ? "deep_full" : "deep";
  const input = await buildNarrativeInput(profileId, date, deepened ? { dayLoc } : { slowOnly: true, dayLoc });
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
  const read = await singleFlight(`${surface}:${profileId}:${date}:${hash}`, async () => {
    const r = await generateDeepRead(input);
    if (r) await upsertNarrativeCache(profileId, surface, date, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  return { available: true, read, generatedAt: new Date(), cached: false };
}

// The chapter good-for/avoid bullets — a small, cheap, AUTO-FIRING read (split out of the
// big deep read). slowOnly input means it only regenerates when the chapter turns (the year
// lord's transit house changes), not daily; cached under its own "chapter" surface.
export async function getChapterCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<ChapterResult> {
  if (!hasAnthropicKey()) return { available: false, chapter: null, generatedAt: null, cached: false };
  const surface = "chapter";
  const input = await buildNarrativeInput(profileId, date, { slowOnly: true, dayLoc });
  const hash = hashInput(input);

  if (!refresh) {
    let row = await getNarrativeCache(profileId, surface, date);
    // Chapter is date-independent: if today has no matching row, reuse the most recent row
    // whose input hash still matches (the chapter hasn't turned) instead of regenerating.
    if (!row || (!row.locked && row.inputHash !== hash)) {
      const latest = await getLatestNarrativeCache(profileId, surface);
      if (latest && (latest.locked || latest.inputHash === hash)) row = latest;
    }
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const chapter = JSON.parse(row.content);
        if (isCompleteChapter(chapter)) {
          return { available: true, chapter, generatedAt: row.generatedAt, cached: true };
        }
      } catch {
        /* fall through to regenerate on corrupt cache */
      }
    }
  }
  const chapter = await singleFlight(`${surface}:${profileId}:${date}:${hash}`, async () => {
    const r = await generateChapter(input);
    if (r) await upsertNarrativeCache(profileId, surface, date, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!chapter) return { available: false, chapter: null, generatedAt: null, cached: false };
  return { available: true, chapter, generatedAt: new Date(), cached: false };
}

export type DayReadResult = { available: boolean; read: DayRead | null; generatedAt: Date | null; cached: boolean };

// THE DAY READ — the metaphor day-read for ONE specific date. DATE-SPECIFIC (unlike the
// year deep read / chapter, which reuse the latest matching row): every date has its own
// sky, so each caches under its own ("day_read", date) row. Uses the FULL day input (the
// fast tier: transit Moon, today's mode, live rx/eclipse). Powers BOTH the Today page
// (date = today) and the Horoscope reveal (date = the picked day). Returns unavailable →
// static fallback when the key is off / the wallet is dry, exactly like the glance.
export async function getDayReadCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<DayReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = "day_read";
  const input = await buildNarrativeInput(profileId, date, { dayLoc });
  // Salt the hash with the day_read surface version so a day-read prompt change busts ONLY
  // this surface — glance/deep/chapter caches (unchanged prompts) stay valid, no re-charge.
  const hash = hashInput(input, surface);

  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, date);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        if (isCompleteDayRead(read)) {
          return { available: true, read, generatedAt: row.generatedAt, cached: true };
        }
      } catch {
        /* fall through to regenerate on corrupt cache */
      }
    }
  }
  const read = await singleFlight(`${surface}:${profileId}:${date}:${hash}`, async () => {
    const r = await generateDayRead(input);
    if (r) await upsertNarrativeCache(profileId, surface, date, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  return { available: true, read, generatedAt: new Date(), cached: false };
}
