// Cache-aware narrative surfaces. Reads from narrative_cache, generates on miss,
// returns nulls when the LLM is unavailable so callers fall back to static copy.
import { createHash } from "node:crypto";
import { buildNarrativeInput } from "./input-builder.js";
import { generateGlance, generateDeepRead, generateChapter, generateDayRead, generateLifeAreaRead, generateEclipseSeasonRead, generateMercuryRxRead, generateMonthRead, generateCast, isCompleteDeepRead, isCompleteChapter, isCompleteDayRead, isCompleteCast, hasAnthropicKey, type DeepRead, type Chapter, type DayRead, type Cast, type GlanceContent } from "./generate.js";
import type { LifeAreaKey } from "../vedic/life-areas.js";
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

// The day-mode field for TODAY is computed "as of the current minute" — mode, nakshatra, tithi,
// karana, the qualifier and the step reasons can all TURN intra-day. Folding those into the cache
// identity meant reopening today looked like a new request and regenerated the whole (paid) read.
// For the CACHE IDENTITY we hash only the day-STABLE layers: we strip the live-minute panchang
// fields so a read generates ONCE per (profile, surface, date) and every reopen that day is a free
// cache hit. The model still RECEIVES the full input (the prose is unchanged); only the hash ignores
// the volatile fields. Anything day-anchored (eclipse phase computed at noon, asOf, the natal/dasha/
// transit/arc layers) stays in the hash, so a prompt-version bump or a chart change still busts it.
// Surfaces built from the slow-only (stage) input carry no `panchang`, so this is a no-op for them.
export const VOLATILE_PANCHANG_FIELDS = ["mode", "qualifier", "activatedHouse", "nakshatra", "tithi", "karana", "turnsAtNote", "modeStepReasons", "weatherGated"] as const;
export function dayStableHash(input: any, surface?: string): string {
  const p = input?.panchang;
  if (!p || typeof p !== "object") return hashInput(input, surface);
  const stablePanchang: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (!(VOLATILE_PANCHANG_FIELDS as readonly string[]).includes(k)) stablePanchang[k] = v;
  }
  return hashInput({ ...input, panchang: stablePanchang }, surface);
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
  const hash = dayStableHash(input, "glance");

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
  const hash = dayStableHash(input, surface);

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
  const hash = dayStableHash(input, surface);

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
  const hash = dayStableHash(input, surface);

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

// THE HOROSCOPE — one LIFE AREA, read deep through its varga, pointed at a date. Built on the
// day-read shape + guards, with a life-area lens in the input (LIFE_AREA_TAIL). The horoscope
// router FREEZES the result into the horoscopes table (immutable snapshot per profile+date+area),
// so this does NOT touch narrative_cache — it only builds the input and generates, deduped by
// single-flight so a double-reveal never fires two (paid) calls. Returns unavailable → the reveal
// reports failure and the user can retry, exactly like the day read.
export async function getLifeAreaRead(profileId: number, date: string, lifeArea: LifeAreaKey, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<DayReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const input = await buildNarrativeInput(profileId, date, { dayLoc, lifeArea });
  const read = await singleFlight(`life_area:${profileId}:${date}:${lifeArea}`, async () => generateLifeAreaRead(input));
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  return { available: true, read, generatedAt: new Date(), cached: false };
}

export type EclipseSeasonResult = { available: boolean; read: DayRead | null; season: { firstDate: string; count: number } | null; generatedAt: Date | null; cached: boolean };

// THE ECLIPSE SEASON — one arc reading across the whole double-eclipse ahead (build → resets →
// aftermath), for this chart's houses. Cached by SEASON, not by day: the cache key is the first
// eclipse's date, and the hash covers the season's astronomy + this chart (NOT today/daysAway, which
// drift daily) — so it generates ONCE per season and re-views free, instead of regenerating every
// day. Returns unavailable when there's no eclipse season in range (nothing to read) or the key is off.
export async function getEclipseSeasonCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<EclipseSeasonResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, season: null, generatedAt: null, cached: false };
  const input: any = await buildNarrativeInput(profileId, date, { dayLoc, eclipseArc: true });
  const arc = input.eclipseSeasonArc;
  if (!arc || !arc.eclipses?.length) return { available: false, read: null, season: null, generatedAt: null, cached: false };

  const surface = "eclipse_season";
  const seasonKey: string = arc.eclipses[0].date; // stable per season (the first eclipse's date)
  // Stable hash: the season's fixed astronomy + this chart, excluding the volatile today/daysAway.
  const stable = { profileId, lagna: input.natal?.lagna, e: arc.eclipses.map((e: any) => ({ d: e.date, h: e.house, o: e.oppositeHouse, disp: e.dispositor?.planet, hits: e.hits })) };
  const salt = SURFACE_VERSION[surface] ?? "";
  const hash = createHash("sha256").update(PROMPT_VERSION + "|" + salt + "|" + JSON.stringify(stable)).digest("hex");

  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, seasonKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        if (isCompleteDayRead(read)) return { available: true, read, season: { firstDate: seasonKey, count: arc.count }, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const read = await singleFlight(`${surface}:${profileId}:${seasonKey}:${hash}`, async () => {
    const r = await generateEclipseSeasonRead(input);
    if (r) await upsertNarrativeCache(profileId, surface, seasonKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, season: null, generatedAt: null, cached: false };
  return { available: true, read, season: { firstDate: seasonKey, count: arc.count }, generatedAt: new Date(), cached: false };
}

// PEEK — read-only: is there ALREADY a cached eclipse-season reading for the current season? Never
// generates (no LLM, no cost), so the card/archive can show "already read" + list it without charging.
export async function peekEclipseSeasonCached(profileId: number, date: string, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<EclipseSeasonResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, season: null, generatedAt: null, cached: false };
  const input: any = await buildNarrativeInput(profileId, date, { dayLoc, eclipseArc: true });
  const arc = input.eclipseSeasonArc;
  if (!arc || !arc.eclipses?.length) return { available: false, read: null, season: null, generatedAt: null, cached: false };
  const seasonKey: string = arc.eclipses[0].date;
  const row = await getNarrativeCache(profileId, "eclipse_season", seasonKey);
  if (row) {
    try {
      const read = JSON.parse(row.content);
      if (isCompleteDayRead(read)) return { available: true, read, season: { firstDate: seasonKey, count: arc.count }, generatedAt: row.generatedAt, cached: true };
    } catch { /* corrupt row — treat as not-yet-read */ }
  }
  return { available: false, read: null, season: null, generatedAt: null, cached: false };
}

export type MercuryRxResult = { available: boolean; read: DayRead | null; cycle: { stationRetro: string; phaseNow: string } | null; generatedAt: Date | null; cached: boolean };

// THE MERCURY RETROGRADE — one arc reading across the whole rx cycle (pre-shadow → review →
// retroshade), for this chart's house(s). Cached by CYCLE (key = the station-retrograde date), and the
// hash covers the cycle's fixed astronomy + this chart (NOT today/daysAway, which drift) — so it
// generates ONCE per cycle and re-views free. Unavailable when no cycle is active/approaching.
export async function getMercuryRxCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<MercuryRxResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, cycle: null, generatedAt: null, cached: false };
  const input: any = await buildNarrativeInput(profileId, date, { dayLoc, mercuryRxArc: true });
  const arc = input.mercuryRxArc;
  if (!arc) return { available: false, read: null, cycle: null, generatedAt: null, cached: false };

  const surface = "mercury_rx";
  const cycleKey: string = arc.stationRetroDate; // stable per cycle (the review's turn-on date)
  const stable = { profileId, lagna: input.natal?.lagna, r: arc.stationRetroDate, d: arc.stationDirectDate, h: arc.house, h2: arc.house2 ?? null, disp: arc.dispositor?.planet, hits: arc.hits };
  const salt = SURFACE_VERSION[surface] ?? "";
  const hash = createHash("sha256").update(PROMPT_VERSION + "|" + salt + "|" + JSON.stringify(stable)).digest("hex");

  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, cycleKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        if (isCompleteDayRead(read)) return { available: true, read, cycle: { stationRetro: cycleKey, phaseNow: arc.phaseNow }, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const read = await singleFlight(`${surface}:${profileId}:${cycleKey}:${hash}`, async () => {
    const r = await generateMercuryRxRead(input);
    if (r) await upsertNarrativeCache(profileId, surface, cycleKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, cycle: null, generatedAt: null, cached: false };
  return { available: true, read, cycle: { stationRetro: cycleKey, phaseNow: arc.phaseNow }, generatedAt: new Date(), cached: false };
}

// PEEK — read-only: is there ALREADY a cached Mercury-rx reading for the current cycle? Never generates.
export async function peekMercuryRxCached(profileId: number, date: string, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<MercuryRxResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, cycle: null, generatedAt: null, cached: false };
  const input: any = await buildNarrativeInput(profileId, date, { dayLoc, mercuryRxArc: true });
  const arc = input.mercuryRxArc;
  if (!arc) return { available: false, read: null, cycle: null, generatedAt: null, cached: false };
  const cycleKey: string = arc.stationRetroDate;
  const row = await getNarrativeCache(profileId, "mercury_rx", cycleKey);
  if (row) {
    try {
      const read = JSON.parse(row.content);
      if (isCompleteDayRead(read)) return { available: true, read, cycle: { stationRetro: cycleKey, phaseNow: arc.phaseNow }, generatedAt: row.generatedAt, cached: true };
    } catch { /* corrupt row — treat as not-yet-read */ }
  }
  return { available: false, read: null, cycle: null, generatedAt: null, cached: false };
}

export type MonthResult = { available: boolean; read: DayRead | null; month: string | null; generatedAt: Date | null; cached: boolean };

// THE MONTH — the full layered read expanded to a whole month (scenes/characters/conversations/arcs).
// Cached by MONTH (key = "YYYY-MM"); the hash covers the month's beats + Time Lord + this chart, so it
// generates ONCE per month and re-views free. Always available (every month has beats + a Time Lord).
export async function getMonthCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<MonthResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, month: null, generatedAt: null, cached: false };
  const input: any = await buildNarrativeInput(profileId, date, { dayLoc, monthArc: true });
  const arc = input.monthArc;
  if (!arc) return { available: false, read: null, month: null, generatedAt: null, cached: false };

  const surface = "month";
  const monthKey: string = arc.month; // "YYYY-MM"
  // Stable hash: the month's beats + the Time Lord/dasha backdrop + this chart.
  const stable = {
    profileId, lagna: input.natal?.lagna, m: arc.month,
    ev: (arc.events as any[]).map((e) => ({ k: e.kind, d: e.date, p: e.planet ?? e.type ?? null, h: e.house, n: e.natalPoint ?? null })),
    sp: (arc.subPeriods as any[] ?? []).map((s) => ({ l: s.lord, s: s.startDate, e: s.endDate })),
    tl: input.timeLordTransit?.planet ?? input.dasha?.antarDasha?.lord ?? null, // audit: .current.antardasha never existed — antar chapter turns now bust the month cache
    prof: input.profection?.activatedHouse ?? null,
  };
  const salt = SURFACE_VERSION[surface] ?? "";
  const hash = createHash("sha256").update(PROMPT_VERSION + "|" + salt + "|" + JSON.stringify(stable)).digest("hex");

  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, monthKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        if (isCompleteDayRead(read)) return { available: true, read, month: monthKey, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const read = await singleFlight(`${surface}:${profileId}:${monthKey}:${hash}`, async () => {
    const r = await generateMonthRead(input);
    if (r) await upsertNarrativeCache(profileId, surface, monthKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, month: null, generatedAt: null, cached: false };
  return { available: true, read, month: monthKey, generatedAt: new Date(), cached: false };
}

// PEEK — read-only: is there ALREADY a cached reading for the current month? Never generates.
export async function peekMonthCached(profileId: number, date: string, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<MonthResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, month: null, generatedAt: null, cached: false };
  const monthKey = date.slice(0, 7);
  const row = await getNarrativeCache(profileId, "month", monthKey);
  if (row) {
    try {
      const read = JSON.parse(row.content);
      if (isCompleteDayRead(read)) return { available: true, read, month: monthKey, generatedAt: row.generatedAt, cached: true };
    } catch { /* corrupt row — treat as not-yet-read */ }
  }
  return { available: false, read: null, month: null, generatedAt: null, cached: false };
}

export type CastResult = { available: boolean; cast: Cast | null; generatedAt: Date | null; cached: boolean };

// THE READ — THE CAST. The layer behind the day-story (the characters moving today), for a
// specific date. LAZY: fires only when THE READ is tapped, so only opted-in views pay for it.
// Caches under its own ("cast", date) row, salted by SURFACE_VERSION.cast so a cast prompt
// change busts ONLY the cast. Returns unavailable → static fallback when the key is off.
export async function getCastCached(profileId: number, date: string, refresh = false, dayLoc?: { lat: number; lon: number; utcOffset: number }): Promise<CastResult> {
  if (!hasAnthropicKey()) return { available: false, cast: null, generatedAt: null, cached: false };
  const surface = "cast";
  const input = await buildNarrativeInput(profileId, date, { dayLoc });
  const hash = dayStableHash(input, surface);

  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, date);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const cast = JSON.parse(row.content);
        if (isCompleteCast(cast)) {
          return { available: true, cast, generatedAt: row.generatedAt, cached: true };
        }
      } catch {
        /* fall through to regenerate on corrupt cache */
      }
    }
  }
  const cast = await singleFlight(`${surface}:${profileId}:${date}:${hash}`, async () => {
    const r = await generateCast(input);
    if (r) await upsertNarrativeCache(profileId, surface, date, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!cast) return { available: false, cast: null, generatedAt: null, cached: false };
  return { available: true, cast, generatedAt: new Date(), cached: false };
}


// ── THE HOUSE READER — natal-stable cache: one read per (profile, house, research
// version); regenerates only when the research engine moves or David salts the surface.
export type HouseReadResult = { available: boolean; read: import("./generate.js").HouseRead | null; generatedAt: Date | null; cached: boolean };
export async function getHouseReadCached(profileId: number, house: number, refresh = false): Promise<HouseReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = "house_read";
  const { getStoredResearch } = await import("../vedic/research-store.js");
  const research: any = await getStoredResearch(profileId);
  const data = research?.houses?.[house - 1];
  if (!data) return { available: false, read: null, generatedAt: null, cached: false };
  const input = { house, lagnaSign: research?.lagnaSign ?? research?.meta?.lagnaSign ?? null, engineVersion: research?.engineVersion ?? null, data };
  const hash = dayStableHash(input, surface);
  const dateKey = `natal-h${house}`;
  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, dateKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        const { isCompleteHouseRead } = await import("./generate.js");
        if (isCompleteHouseRead(read)) return { available: true, read, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const { generateHouseRead } = await import("./generate.js");
  const read = await singleFlight(`${surface}:${profileId}:${house}:${hash}`, async () => {
    const r = await generateHouseRead(input as any);
    if (r) await upsertNarrativeCache(profileId, surface, dateKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  return { available: true, read: read as any, generatedAt: new Date(), cached: false };
}


// ── THE CHAPTER READER — one read per (profile, dasha lord); the lord's natal dossier
// assembled from stored research (placement + every house he rules with its condition).
export type DashaReadResult = { available: boolean; read: import("./generate.js").DashaRead | null; generatedAt: Date | null; cached: boolean };
export async function getDashaReadCached(profileId: number, lord: string, span?: string, refresh = false, antar?: string): Promise<DashaReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = "dasha_read";
  const { getStoredResearch } = await import("../vedic/research-store.js");
  const research: any = await getStoredResearch(profileId);
  if (!research?.houses) return { available: false, read: null, generatedAt: null, cached: false };
  const houses: any[] = research.houses;
  // One lord's natal dossier — used for the maha, and again for the antar lord when this
  // is a SUB-CHAPTER read (David 2026-07-16: "specific maha antar readings").
  const dossierOf = (L: string) => {
    const rules = houses.filter((h) => h?.lord?.planet === L).map((h) => ({ house: h.house, sign: h.sign, lordPlacedHouse: h.lord.placedHouse, lordPlacedSign: h.lord.placedSign, bhavaYoga: h.lord.bhavaYoga, occupants: h.occupants, vargaCheck: h.vargaCheck }));
    const livesIn = houses.find((h) => (h.occupants ?? []).some((o: any) => (o.planet ?? o) === L));
    return { lord: L, livesIn: livesIn ? { house: livesIn.house, sign: livesIn.sign, occupants: livesIn.occupants } : null, rules, shadbala: research?.shadbala?.[L] ?? null, states: research?.states?.[L] ?? research?.avashtas?.[L] ?? null };
  };
  const dossier = dossierOf(lord);
  const input = { lord, antar: antar ?? null, span: span ?? null, engineVersion: research?.engineVersion ?? null, dossier, antarDossier: antar ? dossierOf(antar) : null };
  const hash = dayStableHash(input, surface);
  const dateKey = antar ? `dasha-${lord}-${antar}` : `dasha-${lord}`;
  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, dateKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        const { isCompleteDashaRead } = await import("./generate.js");
        if (isCompleteDashaRead(read)) return { available: true, read, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const { generateDashaRead } = await import("./generate.js");
  const read = await singleFlight(`${surface}:${profileId}:${dateKey}:${hash}`, async () => {
    const r = await generateDashaRead(input as any);
    if (r) await upsertNarrativeCache(profileId, surface, dateKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, generatedAt: null, cached: false };
  return { available: true, read: read as any, generatedAt: new Date(), cached: false };
}


// ── THE THEME READER — the Life Atlas voice: one read per (profile, theme), stable
// until the stored research or convergence change under it.
const THEME_HOUSES: Record<string, number[]> = {
  marriage: [7], children: [5], career: [10], identity: [1, 10], fame: [10, 1],
  wealth: [2, 11], siblings: [3, 11], parents: [4, 9], home: [4], health: [6, 1],
};
const THEME_KARAKAS: Record<string, string[]> = {
  marriage: ["Venus"], children: ["Jupiter"], career: ["Saturn", "Sun", "Mercury"],
  identity: ["Sun"], fame: ["Sun"], wealth: ["Jupiter"], siblings: ["Mars"],
  parents: ["Moon", "Sun", "Jupiter"], home: ["Moon", "Mercury"], health: ["Sun", "Mars"],
};
export type AtlasReadResult = { available: boolean; read: import("./generate.js").AtlasRead | null; windows: any[]; generatedAt: Date | null; cached: boolean };
export interface YogaReadResult { available: boolean; read: { read: string } | null; generatedAt: Date | string | null; cached: boolean }
/** One standing yoga, voiced — natal-stable (the chart doesn't move), cached forever
 *  per yoga name; canon definition + this chart's hold strength feed the prompt. */
export async function getYogaReadCached(profileId: number, yogaName: string, refresh = false): Promise<YogaReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = "yoga_read";
  const { getStoredResearch } = await import("../vedic/research-store.js");
  const research: any = await getStoredResearch(profileId);
  const yoga = (research?.yogas ?? []).find((y: any) => y.name === yogaName);
  if (!yoga) return { available: false, read: null, generatedAt: null, cached: false };
  let canonDef: any = null;
  try {
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const here = dirname(fileURLToPath(import.meta.url));
    const canon = JSON.parse(readFileSync(join(here, "../vedic/canon/yogas.json"), "utf8"));
    canonDef = (canon.yogas ?? []).find((y: any) => y.name === yogaName) ?? null;
  } catch { /* canon optional */ }
  const input = {
    yoga: { name: yoga.name, type: yoga.type, heldFrom: yoga.frames, vantages: yoga.frames?.length ?? 1, repeatsInNavamsha: !!yoga.inNavamsha, note: yoga.note ?? null },
    canon: canonDef ? { condition: canonDef.condition, result: canonDef.result, note: canonDef.note ?? null, rooms: canonDef.knot ?? [] } : null,
    anchors: { lagnaSign: research?.anchors?.lagnaSign ?? null, atmakaraka: research?.anchors?.atmakaraka?.planet ?? null },
    engineVersion: research?.engineVersion ?? null,
  };
  const hash = dayStableHash(input, surface);
  const dateKey = `yoga-${yogaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`;
  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, dateKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        const { isCompleteYogaRead } = await import("./generate.js");
        if (isCompleteYogaRead(read)) return { available: true, read, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const { generateYogaRead } = await import("./generate.js");
  const read = await singleFlight(`${surface}:${profileId}:${dateKey}:${hash}`, async () => {
    const r = await generateYogaRead(input as any);
    if (r) await upsertNarrativeCache(profileId, surface, dateKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  return read ? { available: true, read, generatedAt: new Date(), cached: false } : { available: false, read: null, generatedAt: null, cached: false };
}

export interface WindowReadResult { available: boolean; locked?: boolean; read: { read: string } | null; generatedAt: Date | string | null; cached: boolean }
/** One window of one theme, voiced. Cache key = theme+from (a window's identity); the
 *  hash carries the window's substance so a re-stored timeline regenerates honestly. */
export async function getWindowReadCached(profileId: number, theme: string, label: string, from: string, refresh = false): Promise<WindowReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, generatedAt: null, cached: false };
  const surface = "window_read";
  const { getDb } = await import("../db.js");
  const { profileConvergence } = await import("../../drizzle/schema.js");
  const { eq: eqW } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return { available: false, read: null, generatedAt: null, cached: false };
  const rows = await db.select().from(profileConvergence).where(eqW(profileConvergence.profileId, profileId));
  const { mergeThemeWindows } = await import("../vedic/windows.js");
  const win = mergeThemeWindows(rows as any).find((w) => w.theme === theme && w.from === from);
  if (!win) return { available: false, read: null, generatedAt: null, cached: false };
  const { getStoredResearch } = await import("../vedic/research-store.js");
  const research: any = await getStoredResearch(profileId);
  const houses: any[] = research?.houses ?? [];
  const promise = {
    houses: (THEME_HOUSES[theme] ?? []).map((h) => {
      const d = houses[h - 1];
      return d ? { house: h, sign: d.sign, occupants: d.occupants, lord: d.lord, vargaCheck: d.vargaCheck } : null;
    }).filter(Boolean),
    karakas: (THEME_KARAKAS[theme] ?? []).map((k) => ({ planet: k, shadbala: research?.shadbala?.[k] ?? null })),
  };
  const input = { theme, label, window: { from: win.from, to: win.to, peak: win.peak, bigKnot: win.bigKnot, era: win.era }, promise, engineVersion: research?.engineVersion ?? null };
  const hash = dayStableHash(input, surface);
  const dateKey = `atlas-w-${theme}-${from}`;
  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, dateKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        const { isCompleteWindowRead } = await import("./generate.js");
        if (isCompleteWindowRead(read)) return { available: true, read, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const { generateWindowRead } = await import("./generate.js");
  const read = await singleFlight(`${surface}:${profileId}:${theme}:${from}:${hash}`, async () => {
    const r = await generateWindowRead(input as any);
    if (r) await upsertNarrativeCache(profileId, surface, dateKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  return read ? { available: true, read, generatedAt: new Date(), cached: false } : { available: false, read: null, generatedAt: null, cached: false };
}

export async function getAtlasReadCached(profileId: number, theme: string, label: string, refresh = false): Promise<AtlasReadResult> {
  if (!hasAnthropicKey()) return { available: false, read: null, windows: [], generatedAt: null, cached: false };
  const surface = "atlas_read";
  const { getDb } = await import("../db.js");
  const { profileConvergence } = await import("../../drizzle/schema.js");
  const { eq: eqA } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return { available: false, read: null, windows: [], generatedAt: null, cached: false };
  const rows = await db.select().from(profileConvergence).where(eqA(profileConvergence.profileId, profileId));
  const { mergeThemeWindows } = await import("../vedic/windows.js");
  const windows = mergeThemeWindows(rows as any).filter((w) => w.theme === theme);
  const { getStoredResearch } = await import("../vedic/research-store.js");
  const research: any = await getStoredResearch(profileId);
  const houses: any[] = research?.houses ?? [];
  const promise = {
    houses: (THEME_HOUSES[theme] ?? []).map((h) => {
      const d = houses[h - 1];
      return d ? { house: h, sign: d.sign, occupants: d.occupants, lord: d.lord, vargaCheck: d.vargaCheck } : null;
    }).filter(Boolean),
    karakas: (THEME_KARAKAS[theme] ?? []).map((k) => ({ planet: k, shadbala: research?.shadbala?.[k] ?? null })),
    birthDate: null as string | null,
  };
  const input = { theme, label, engineVersion: research?.engineVersion ?? null, promise, windows };
  const hash = dayStableHash(input, surface);
  const dateKey = `atlas-${theme}`;
  if (!refresh) {
    const row = await getNarrativeCache(profileId, surface, dateKey);
    if (row && (row.locked || row.inputHash === hash)) {
      try {
        const read = JSON.parse(row.content);
        const { isCompleteAtlasRead } = await import("./generate.js");
        if (isCompleteAtlasRead(read)) return { available: true, read, windows, generatedAt: row.generatedAt, cached: true };
      } catch { /* regenerate on corrupt cache */ }
    }
  }
  const { generateAtlasRead } = await import("./generate.js");
  const read = await singleFlight(`${surface}:${profileId}:${theme}:${hash}`, async () => {
    const r = await generateAtlasRead(input as any);
    if (r) await upsertNarrativeCache(profileId, surface, dateKey, hash, MODEL, JSON.stringify(r));
    return r;
  });
  if (!read) return { available: false, read: null, windows, generatedAt: null, cached: false };
  return { available: true, read: read as any, windows, generatedAt: new Date(), cached: false };
}
