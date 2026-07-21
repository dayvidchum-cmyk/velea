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
 *   1. override — a profile_day_locations row for (profile, date): "on THIS date I was in Tokyo".
 *      Consulted whenever the caller passes `profileId` — every real reading path does, so the
 *      sync-vs-async divergence class can't reopen.
 *   2. current  — the account's stored current location (the LocationSheet's single slot).
 *      Q3: only within ±CURRENT_WINDOW_DAYS of today — a stored "current" is meaningless for a
 *      date last March. Skipped ONLY when a hometown exists to catch the fall-through (a stale
 *      current beats the app default).
 *   3. hometown — the profile's home base (seeded from birth by add-location-model.ts).
 *   4. birth    — the profile's birth place (the chart's own sky; last resort).
 *   5. default  — Boston, only when a profile has no birth location. Warned, never silent.
 *
 * `utcOffset` is always computed for the READING's date (DST-correct) — never `now` — so a
 * pick-a-date reading across a DST transition samples the right sunrise/tithi (audit L5/M8).
 */
import { getTimezoneOffset } from "./tz-offset.js";

export type DaySkySource = "override" | "current" | "hometown" | "birth" | "default";

export interface DaySky {
  lat: number;
  lon: number;
  /** UTC offset IN HOURS (fractional, minute-precise) for the reading's date. */
  utcOffset: number;
  /** IANA timezone when one is stored; null on the birth/hometown tiers when none is. */
  timezone: string | null;
  /**
   * The place NAME for this tier, when one is stored. Carried so a frozen reading can record
   * WHERE its sky was cast (audit 2026-07-20: a paid reading recorded no location at all, while
   * the page printed a live one above it). Null means "not stored" — say nothing rather than guess.
   */
  city: string | null;
  source: DaySkySource;
}

/** The app default (Boston). The ONLY place these coordinates may appear on the server. */
export const DEFAULT_SKY = { city: "Boston", lat: 42.3601, lon: -71.0589, timezone: "America/New_York" } as const;

/** Q3 (David's lean, spec §6): "current" is only true this many days either side of today. */
export const CURRENT_WINDOW_DAYS = 3;

export type UserLocFields = { locationLat?: string | null; locationLon?: string | null; locationTimezone?: string | null; locationCity?: string | null } | null | undefined;
export type ProfileLocFields = {
  birthLocationLat?: string | null; birthLocationLon?: string | null; birthTimezone?: string | null;
  birthLocationCity?: string | null;
  hometownLat?: string | null; hometownLon?: string | null; hometownTimezone?: string | null;
  hometownCity?: string | null;
  /**
   * Is this profile the account holder's OWN chart? Drives the `current` tier — see
   * currentTierApplies. Undefined (a caller passing a partial object) preserves the old
   * behaviour, so no call site changes meaning by omission.
   */
  isOwner?: boolean | number | null;
} | null | undefined;

/**
 * MAY THE ACCOUNT'S CURRENT LOCATION SPEAK FOR THIS PROFILE?
 *
 * `users.location*` is ONE slot per account — the LocationSheet, effectively "where is the phone
 * holding this login." That is a fact about the account holder. It is NOT a fact about anyone
 * else whose chart lives on that account, and the resolver used to let it outrank their own
 * ground, so every non-owner profile was read from wherever the account holder happened to be.
 *
 * Found 2026-07-21: David's six other profiles (Lisa, Lang, Simone, Krista, Linda, Cara) were all
 * being cast from Boston because that is where HIS phone is. Lisa lives in New Jersey. The day
 * was identical that afternoon only because both sit in the same timezone a few degrees apart —
 * geography, not correctness. Read Lisa's chart while travelling in Tokyo and her sunrise, tithi,
 * nakshatra and hora would all have been someone else's.
 *
 * David's ruling that day, after I wrongly filed this as a power-user edge case: "everyone is the
 * average user." Multi-profile IS the paid seam, so this defect lands on paying accounts, and the
 * person it misreads is not a test fixture — she is the reader.
 *
 * The rule: a non-owner profile falls to its OWN ground (hometown, then birth). We only skip the
 * current tier when such a fallback EXISTS — dropping to the Boston app default would trade a
 * near-miss for a worse guess. Ownership unknown → unchanged behaviour.
 */
export function currentTierApplies(profile: ProfileLocFields): boolean {
  if (!profile) return true;                       // no profile (anonymous panchang) — viewer's sky
  if (profile.isOwner === undefined || profile.isOwner === null) return true;   // unknown → as before
  if (profile.isOwner) return true;                                            // the account holder's own chart
  const hasOwnGround = !!((profile.hometownLat && profile.hometownLon) || (profile.birthLocationLat && profile.birthLocationLon));
  return !hasOwnGround;                            // someone else's chart: only if they have no ground of their own
}

const noonUTC = (dateStr: string) => new Date(dateStr + "T12:00:00Z");

function isNearToday(dateStr: string, tz: string, now: Date): boolean {
  const off = getTimezoneOffset(tz, now);
  const localTodayStr = new Date(now.getTime() + off * 3600_000).toISOString().slice(0, 10);
  const days = Math.abs(Date.parse(dateStr + "T00:00:00Z") - Date.parse(localTodayStr + "T00:00:00Z")) / 86400_000;
  return days <= CURRENT_WINDOW_DAYS;
}

// ── Override tier: per-profile day-location rows, cached in-proc ──────────────
// One SELECT per profile per minute at most; a travel log is sparse (dozens of rows).
type OverrideRow = { onDate: string; city: string; lat: string; lon: string; timezone: string };
const OVERRIDE_TTL_MS = 60_000;
const OVERRIDE_CACHE = new Map<number, { at: number; rows: Map<string, OverrideRow> }>();

async function overridesFor(profileId: number): Promise<Map<string, OverrideRow>> {
  const hit = OVERRIDE_CACHE.get(profileId);
  if (hit && Date.now() - hit.at < OVERRIDE_TTL_MS) return hit.rows;
  const rows = new Map<string, OverrideRow>();
  try {
    const { getDb } = await import("../db.js");
    const { profileDayLocations } = await import("../../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      for (const r of await db.select().from(profileDayLocations).where(eq(profileDayLocations.profileId, profileId))) {
        rows.set(r.onDate, r);
      }
    }
  } catch (e) {
    console.warn(`[resolveDaySky] override lookup failed for profile ${profileId}:`, e);
  }
  OVERRIDE_CACHE.set(profileId, { at: Date.now(), rows });
  return rows;
}

/** Call after writing/clearing a profile_day_locations row so the next resolve sees it. */
export function invalidateDayOverrides(profileId: number): void {
  OVERRIDE_CACHE.delete(profileId);
}

/**
 * The resolver. Pass the rows you already have; pass `profileId` whenever the reading is for a
 * profile so the per-date override tier is consulted (every real reading path should).
 * `now` exists for tests only.
 */
export async function resolveDaySky(args: { user?: UserLocFields; profile?: ProfileLocFields; profileId?: number; dateStr: string; now?: Date }): Promise<DaySky> {
  const at = noonUTC(args.dateStr);
  const now = args.now ?? new Date();

  if (args.profileId != null) {
    const o = (await overridesFor(args.profileId)).get(args.dateStr);
    if (o) {
      return {
        lat: parseFloat(o.lat),
        lon: parseFloat(o.lon),
        utcOffset: getTimezoneOffset(o.timezone, at),
        timezone: o.timezone,
        city: o.city ?? null,
        source: "override",
      };
    }
  }

  const u = args.user;
  const p = args.profile;
  const hasHometown = !!(p?.hometownLat && p?.hometownLon);
  // The account's current location speaks only for the account holder's own chart (v-loc fix,
  // 2026-07-21). For anyone else on the account it is someone else's phone, and their own
  // hometown/birth ground outranks it.
  if (currentTierApplies(p) && u?.locationLat && u?.locationLon && u?.locationTimezone && (isNearToday(args.dateStr, u.locationTimezone, now) || !hasHometown)) {
    return {
      lat: parseFloat(u.locationLat),
      lon: parseFloat(u.locationLon),
      utcOffset: getTimezoneOffset(u.locationTimezone, at),
      timezone: u.locationTimezone,
      city: u.locationCity ?? null,
      source: "current",
    };
  }
  if (hasHometown) {
    const lon = parseFloat(p!.hometownLon!);
    return {
      lat: parseFloat(p!.hometownLat!),
      lon,
      utcOffset: p!.hometownTimezone ? getTimezoneOffset(p!.hometownTimezone, at) : Math.round(lon / 15),
      timezone: p!.hometownTimezone ?? null,
      city: p!.hometownCity ?? null,
      source: "hometown",
    };
  }
  if (p?.birthLocationLat && p?.birthLocationLon) {
    const lon = parseFloat(p.birthLocationLon);
    return {
      lat: parseFloat(p.birthLocationLat),
      lon,
      // No stored birth timezone → solar-time estimate from longitude, NOT Boston's offset
      // (a Tokyo birth on Boston's clock would be nine hours of wrong sky).
      utcOffset: p.birthTimezone ? getTimezoneOffset(p.birthTimezone, at) : Math.round(lon / 15),
      timezone: p.birthTimezone ?? null,
      // birthLocationCity, NOT birthLocation. `profiles` has no such column — the only
      // `birthLocation` in the schema belongs to referralRedemptions — so this tier froze
      // city: null into every reading cast on it, and the page then printed "Read for your
      // saved location" forever. The optional field on ProfileLocFields is what kept tsc quiet.
      city: p.birthLocationCity ?? null,
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
    city: DEFAULT_SKY.city,
    source: "default",
  };
}

/**
 * The tz that defines "today" for this viewer/chart.
 *
 * DELIBERATELY NOT gated by ownership, unlike the sky above. These answer different questions:
 * the SKY belongs to the person being read (Lisa's sunrise is in New Jersey), while "what day is
 * it" belongs to the person LOOKING (if David opens her chart at 11pm his time, he means his
 * today). Gating this too would have made a viewer in Tokyo see yesterday's card for a profile
 * whose hometown is in New York. Stated because it looks like an oversight and is not.
 */
export function timezoneFor(user?: UserLocFields, profile?: ProfileLocFields): string {
  return user?.locationTimezone || profile?.hometownTimezone || profile?.birthTimezone || DEFAULT_SKY.timezone;
}

/** The viewer's local calendar date (YYYY-MM-DD) right now, by the same precedence. */
export function localToday(user?: UserLocFields, profile?: ProfileLocFields, now: Date = new Date()): string {
  const off = getTimezoneOffset(timezoneFor(user, profile), now);
  return new Date(now.getTime() + off * 3600_000).toISOString().slice(0, 10);
}

/**
 * Async convenience for call sites that hold only a profileId (narrative router, admin
 * diagnostics, scripts): loads the profile + its owner's user row, then resolves (override
 * tier included). Falls back to the app default if the profile can't be loaded.
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
    return resolveDaySky({ user, profile, profileId, dateStr });
  } catch (e) {
    console.warn(`[resolveDaySky] lookup failed for profile ${profileId}:`, e);
    return resolveDaySky({ dateStr });
  }
}
