/**
 * RESOLVE DAY SKY — the ONE home of "which sky, sampled where, for this profile on this date."
 *
 * Approved in LOCATION_RESOLVER_SPEC.md (David, 2026-07-18). Before this file, the precedence
 * lived in ~8 independent re-derivations (narrative dayLocFromUser, inline blocks across
 * routers.ts, input-builder's varshaphala block, Master Mode's userLatLon) and Boston was
 * hardcoded in seven places. Every one of them now routes here; the coordinates below are the
 * only copy.
 *
 * Precedence (first hit wins):
 *   1. override — per-profile-per-date row (JOINS WHEN THE SCHEMA LANDS — spec §2, David-run)
 *   2. current  — the account's stored current location (the LocationSheet's single slot)
 *   3. hometown — per-profile hometown (JOINS WHEN THE SCHEMA LANDS)
 *   4. birth    — the profile's birth place (the chart's own sky; today's last resort)
 *   5. default  — Boston, only when a profile has no birth location. Warned, never silent.
 *
 * `utcOffset` is always computed for the READING's date (DST-correct) — never `now` — so a
 * pick-a-date reading across a DST transition samples the right sunrise/tithi (audit L5/M8).
 */
import { getTimezoneOffset } from "./tz-offset.js";

export type DaySkySource = "current" | "birth" | "default"; // "override" | "hometown" arrive with the location-model migration

export interface DaySky {
  lat: number;
  lon: number;
  /** UTC offset IN HOURS (fractional, minute-precise) for the reading's date. */
  utcOffset: number;
  /** IANA timezone when one is stored; null on the birth tier when the profile has none. */
  timezone: string | null;
  source: DaySkySource;
}

/** The app default (Boston). The ONLY place these coordinates may appear on the server. */
export const DEFAULT_SKY = { city: "Boston", lat: 42.3601, lon: -71.0589, timezone: "America/New_York" } as const;

export type UserLocFields = { locationLat?: string | null; locationLon?: string | null; locationTimezone?: string | null } | null | undefined;
export type ProfileLocFields = { birthLocationLat?: string | null; birthLocationLon?: string | null; birthTimezone?: string | null } | null | undefined;

const noonUTC = (dateStr: string) => new Date(dateStr + "T12:00:00Z");

/**
 * The resolver. Pure and synchronous — pass the rows you already have. `user` is the account
 * owner (the current-location tier); `profile` is the chart being read (the birth tier).
 */
export function resolveDaySky(args: { user?: UserLocFields; profile?: ProfileLocFields; dateStr: string }): DaySky {
  const at = noonUTC(args.dateStr);
  const u = args.user;
  if (u?.locationLat && u?.locationLon && u?.locationTimezone) {
    return {
      lat: parseFloat(u.locationLat),
      lon: parseFloat(u.locationLon),
      utcOffset: getTimezoneOffset(u.locationTimezone, at),
      timezone: u.locationTimezone,
      source: "current",
    };
  }
  const p = args.profile;
  if (p?.birthLocationLat && p?.birthLocationLon) {
    const lon = parseFloat(p.birthLocationLon);
    return {
      lat: parseFloat(p.birthLocationLat),
      lon,
      // No stored birth timezone → solar-time estimate from longitude, NOT Boston's offset
      // (a Tokyo birth on Boston's clock would be nine hours of wrong sky).
      utcOffset: p.birthTimezone ? getTimezoneOffset(p.birthTimezone, at) : Math.round(lon / 15),
      timezone: p.birthTimezone ?? null,
      source: "birth",
    };
  }
  // A profile was given but carries no birth location — that's the "somehow" case the spec
  // wants loud. No profile at all (anonymous panchang) defaults quietly by design.
  if (p) console.warn(`[resolveDaySky] profile has no birth location for ${args.dateStr} — using app default (${DEFAULT_SKY.city})`);
  return {
    lat: DEFAULT_SKY.lat,
    lon: DEFAULT_SKY.lon,
    utcOffset: getTimezoneOffset(DEFAULT_SKY.timezone, at),
    timezone: DEFAULT_SKY.timezone,
    source: "default",
  };
}

/** The tz that defines "today" for this viewer/chart — same precedence as the sky. */
export function timezoneFor(user?: UserLocFields, profile?: ProfileLocFields): string {
  return user?.locationTimezone || profile?.birthTimezone || DEFAULT_SKY.timezone;
}

/** The viewer's local calendar date (YYYY-MM-DD) right now, by the same precedence. */
export function localToday(user?: UserLocFields, profile?: ProfileLocFields, now: Date = new Date()): string {
  const off = getTimezoneOffset(timezoneFor(user, profile), now);
  return new Date(now.getTime() + off * 3600_000).toISOString().slice(0, 10);
}

/**
 * Async convenience for call sites that hold only a profileId (narrative router, admin
 * diagnostics, scripts): loads the profile + its owner's user row, then resolves.
 * Falls back to the app default (source "default") if the profile can't be loaded.
 */
export async function resolveDaySkyForProfileId(profileId: number, dateStr: string): Promise<DaySky> {
  try {
    const { getDb, getUserById } = await import("../db.js");
    const { profiles } = await import("../../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return resolveDaySky({ dateStr });
    const rows = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
    const profile = rows[0];
    const user = profile?.userId ? await getUserById(profile.userId) : null;
    return resolveDaySky({ user, profile, dateStr });
  } catch (e) {
    console.warn(`[resolveDaySky] lookup failed for profile ${profileId}:`, e);
    return resolveDaySky({ dateStr });
  }
}
