/**
 * Pressure-layer system — combined entry point.
 *
 * getCurrentLayers(subject) composes Layer 2 (Time Lord theme) and Layer 3
 * (Transit pressure) into the CurrentLayers shape. Composition is read-only:
 * each layer is computed independently; nothing here mutates a layer's output.
 *
 * Result is cached in-memory per profileId for 5 minutes — these layers only
 * change on dasha/transit boundaries, and rankedForToday calls this often.
 *
 * Layer 1 (Panchapakshi) is intentionally absent until an authoritative table
 * is supplied.
 */

import type { AstrologySubject } from "../astrology-subject";
import type { CurrentLayers } from "./types";
import { getTimeLordPeriod } from "./time-lord-theme";
import { getTransitPressure } from "./transit-pressure";

export * from "./types";
export { getTimeLordPeriod, themeMatchesTask } from "./time-lord-theme";
export { computeTransitPressure, getTransitPressure } from "./transit-pressure";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: CurrentLayers;
}

const cache = new Map<number, CacheEntry>();

export async function getCurrentLayers(
  subject: AstrologySubject,
  now: number = Date.now()
): Promise<CurrentLayers> {
  const key = subject.profileId;
  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  // Layer 2 is sync/pure; Layer 3 is async (ephemeris). They never read each other.
  const timeLordPeriod = getTimeLordPeriod(subject);
  const transits = await getTransitPressure(subject, new Date(now));

  const data: CurrentLayers = {
    timeLordPeriod,
    transits,
    computedAt: new Date(now).toISOString(),
  };

  cache.set(key, { at: now, data });
  return data;
}

/** Test/maintenance hook — clear the layer cache (e.g. on profile recalc). */
export function clearLayerCache(profileId?: number): void {
  if (profileId == null) cache.clear();
  else cache.delete(profileId);
}
