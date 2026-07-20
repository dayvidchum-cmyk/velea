/**
 * THE DAILY READING SURFACE — one place that answers "which cached rows ARE the user's daily
 * reading, and where is the prose inside one?"
 *
 * Background (the bug this file exists to prevent): the Today hero used to be the `glance`
 * surface. It was replaced by `day_read` (client/src/lib/version.ts:201, "the glance surface is
 * retired from Today — ONE read"), but four consumers kept asking for `glance` by name and so
 * went quietly blind: the Kept Readings archive, the pin, the pin's ensure-generate (which billed
 * a whole unseen generation), and the model's own memory of the last three days. Nothing threw.
 * Every one of them just saw nothing, forever.
 *
 * Zero imports on purpose — pure, so both the DB layer and the input builder can share it and it
 * can be tested without a database.
 */

/** Canonical first, retired-but-still-stored second. Order matters: earlier wins a tie. */
export const DAILY_SURFACES = ["day_read", "glance"] as const;
export type DailySurface = (typeof DAILY_SURFACES)[number];

/** Surfaces a pin writes: the read on screen, the year read beneath it, + the legacy row so
 *  pins taken before the retirement still UNPIN. */
export const PINNED_SURFACES = ["day_read", "deep", "glance"] as const;

/**
 * The prose inside a cached daily row, whichever surface wrote it.
 * glance   = { narrative }
 * day_read = { scene, story, tilt, closeLine, question }
 * Returns "" when there is no prose (caller decides the fallback) — never a JSON blob.
 */
export function readingProse(content: unknown): string {
  if (content == null) return "";
  const c = content as Record<string, unknown>;
  const parts = [c.narrative, c.scene, c.story, c.tilt]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * One row per DATE out of a mixed-surface list: the live `day_read` wins, and a legacy `glance`
 * only fills a date `day_read` never covered. Newest first.
 */
export function pickDailyRows<T extends { surface: string; cacheDate: string }>(rows: readonly T[], limit: number): T[] {
  const byDate = new Map<string, T>();
  for (const r of rows) {
    const prev = byDate.get(r.cacheDate);
    if (!prev || (prev.surface !== "day_read" && r.surface === "day_read")) byDate.set(r.cacheDate, r);
  }
  return Array.from(byDate.values()).sort((a, b) => (a.cacheDate < b.cacheDate ? 1 : -1)).slice(0, limit);
}
