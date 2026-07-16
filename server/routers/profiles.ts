/**
 * Profiles router — named astrological subjects (David, Mom, Client A, etc.)
 *
 * Architecture:
 * - Each user owns N profiles. Exactly one profile per user is isActive=true.
 * - All astrology procedures (dasha, profection, panchang lagna) read the
 *   active profile's birth data instead of the user's own birth fields.
 * - Profile natal bodies are stored in profile_natal_bodies (separate from natal_bodies).
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { profiles, profileNatalBodies } from "../../drizzle/schema";
import { timezoneForCoords } from "../geo/timezone.js";

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getProfilesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.archivedAt, null as any)))
    .orderBy(profiles.createdAt);
}

async function getActiveProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.isActive, true)))
    .limit(1);
  if (rows[0]) return rows[0];
  // Fallback: a user must ALWAYS resolve some chart. If nothing is flagged active — e.g. an owner
  // profile created inactive during friend-onboarding — return their owner chart so the client keys
  // the day reading off it instead of firing nothing (the blank-reading bug). Mirrors resolveAstrologySubject.
  const owner = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.isOwner, true)))
    .limit(1);
  return owner[0];
}

async function getProfileById(profileId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .limit(1);
  return rows[0];
}

/**
 * Throw FORBIDDEN unless `userId` owns `profileId`. Gate EVERY endpoint that takes a
 * client-supplied profileId with this, so one user can never read (or mutate) another
 * user's chart-derived data by guessing a sequential id.
 */
export async function assertOwnsProfile(userId: number, profileId: number): Promise<void> {
  const owned = await getProfileById(profileId, userId);
  if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "Not your profile." });
}

// ── Birth-data edit cooldown ────────────────────────────────────────────────────
// Anti-hijack: once birth data is saved you can't change it again for 24h, so a user
// can't swap their one profile to a friend's chart and revert. Admins are exempt.
export const BIRTH_DATA_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type BirthFields = {
  birthDate?: any; birthTime?: any; birthTimeApprox?: any; birthLocationCity?: any;
  birthLocationLat?: any; birthLocationLon?: any; birthTimezone?: any;
};

/** True if any birth field PRESENT in `incoming` differs from stored. Undefined incoming
 *  fields are treated as "not being changed" (e.g. a name-only profile update). The approximate
 *  flag counts as birth data — flipping it re-labels the chart, so it must recompute. */
export function birthDataChanged(stored: BirthFields, incoming: BirthFields): boolean {
  const norm = (v: any) => (v ?? "").toString().trim();
  const diff = (k: keyof BirthFields) => incoming[k] !== undefined && norm(stored[k]) !== norm(incoming[k]);
  return diff("birthDate") || diff("birthTime") || diff("birthTimeApprox") || diff("birthLocationCity")
    || diff("birthLocationLat") || diff("birthLocationLon") || diff("birthTimezone");
}

/** Enforce the 24h cooldown. No-op for admins, unchanged data, or a first-ever save
 *  (no prior timestamp). Otherwise throws FORBIDDEN with the hours remaining. */
export function assertBirthDataCooldown(opts: { isAdmin: boolean; changed: boolean; lastChangedAt: Date | null | undefined }): void {
  if (!opts.changed || opts.isAdmin || !opts.lastChangedAt) return;
  const elapsed = Date.now() - new Date(opts.lastChangedAt).getTime();
  if (elapsed < BIRTH_DATA_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((BIRTH_DATA_COOLDOWN_MS - elapsed) / 3_600_000);
    throw new TRPCError({ code: "FORBIDDEN", message: `Birth info is locked — you can change it again in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.` });
  }
}

// One-time backfill of isRetrograde for profiles saved before the flag was persisted.
// Sentinel: Rahu is ALWAYS retrograde, so an unflagged stored Rahu means the whole row set
// predates the fix — recompute the flags once from birth data and persist them.
async function backfillRetrograde(db: any, profileId: number, bodies: any[]) {
  const prof = (await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1))[0];
  if (!prof?.birthDate || !prof?.birthTime) return;
  const lat = prof.birthLocationLat ? parseFloat(prof.birthLocationLat) : 0;
  const lon = prof.birthLocationLon ? parseFloat(prof.birthLocationLon) : 0;
  const tz = (prof.birthLocationLat && prof.birthLocationLon) ? timezoneForCoords(lat, lon) : (prof.birthTimezone || "UTC");
  const { calculateBirthChart } = await import("../birthchart/calculator.js");
  const chart: any = await calculateBirthChart(prof.birthDate, prof.birthTime, lat, lon, tz);
  const map: Record<string, any> = {
    Sun: chart.sun, Moon: chart.moon, Mercury: chart.mercury, Venus: chart.venus, Mars: chart.mars,
    Jupiter: chart.jupiter, Saturn: chart.saturn, Rahu: chart.rahu, Ketu: chart.ketu,
  };
  for (const b of bodies) {
    const c = map[b.planet];
    if (!c) continue;
    const rx = !!c.isRetrograde;
    if (b.isRetrograde !== rx) {
      b.isRetrograde = rx; // patch in-memory so THIS response is already correct
      await db.update(profileNatalBodies).set({ isRetrograde: rx })
        .where(and(eq(profileNatalBodies.profileId, profileId), eq(profileNatalBodies.planet, b.planet)));
    }
  }
}

async function getProfileNatalBodies(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  const bodies = await db
    .select()
    .from(profileNatalBodies)
    .where(eq(profileNatalBodies.profileId, profileId))
    .orderBy(profileNatalBodies.planet);
  const rahu = bodies.find((b: any) => b.planet === "Rahu");
  if (bodies.length && rahu && !rahu.isRetrograde) {
    try { await backfillRetrograde(db, profileId, bodies); }
    catch (e) { console.warn("[retro backfill] failed:", e); }
  }
  return bodies;
}

async function upsertProfileNatalBody(
  profileId: number,
  planet: string,
  data: {
    sign: string;
    degree: string;
    house: number;
    nakshatra?: string | null;
    pada?: number | null;
    longitude?: string | null;
    isRetrograde?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(profileNatalBodies)
    .where(and(eq(profileNatalBodies.profileId, profileId), eq(profileNatalBodies.planet, planet)))
    .limit(1);
  if (existing[0]) {
    await db
      .update(profileNatalBodies)
      .set(data)
      .where(and(eq(profileNatalBodies.profileId, profileId), eq(profileNatalBodies.planet, planet)));
  } else {
    await db.insert(profileNatalBodies).values({ profileId, planet, ...data });
  }
}

async function clearProfileNatalBodies(profileId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(profileNatalBodies).where(eq(profileNatalBodies.profileId, profileId));
}

// ── Birth chart input schema (shared between create and calculateChart) ───────

const BirthInputSchema = z.object({
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  // The entered time is a rough guess of the hour (still a real ascendant, just flagged approximate).
  birthTimeApprox: z.boolean().optional(),
  birthLocationCity: z.string().optional(),
  birthLocationLat: z.string().optional(),
  birthLocationLon: z.string().optional(),
  birthTimezone: z.string().optional(),
  notes: z.string().optional(),
});

// ── Owner profile helper ─────────────────────────────────────────────────────

/**
 * Ensures the user has a "My Chart" owner profile.
 * If the user has birth data on their users row, migrates it to the profile.
 * Called on first load from the frontend.
 */
async function ensureOwnerProfileHelper(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Check if owner profile already exists
  const existing = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.isOwner, true)))
    .limit(1);
  if (existing[0]) return existing[0];

  // Migrate birth data from users table if available
  const { getUserById } = await import('../db.js');
  const user = await getUserById(userId);

  const result = await db.insert(profiles).values({
    userId,
    name: user?.name ?? 'My Chart',
    birthDate: user?.birthDate ?? null,
    birthTime: user?.birthTime ?? null,
    birthLocationCity: user?.birthLocationCity ?? null,
    birthLocationLat: user?.birthLocationLat ?? null,
    birthLocationLon: user?.birthLocationLon ?? null,
    birthTimezone: user?.birthTimezone ?? null,
    lagnaSign: user?.lagnaSign ?? null,
    sunHouse: user?.sunHouse ?? null,
    moonHouse: user?.moonHouse ?? null,
    marsHouse: user?.marsHouse ?? null,
    mercuryHouse: user?.mercuryHouse ?? null,
    jupiterHouse: user?.jupiterHouse ?? null,
    venusHouse: user?.venusHouse ?? null,
    saturnHouse: user?.saturnHouse ?? null,
    rahuHouse: user?.rahuHouse ?? null,
    ketuHouse: user?.ketuHouse ?? null,
    ascendantDegree: user?.ascendantDegree ?? null,
    isOwner: true,
    isActive: false,
  });

  const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;

  // Migrate natal bodies from natal_bodies table to profile_natal_bodies
  if (insertId && user?.birthDate) {
    const { getNatalBodiesByUser } = await import('../db.js');
    const bodies = await getNatalBodiesByUser(userId);
    for (const b of bodies) {
      await db.insert(profileNatalBodies).values({
        profileId: insertId,
        planet: b.planet,
        sign: b.sign,
        degree: b.degree,
        house: b.house,
        nakshatra: b.nakshatra ?? null,
        pada: b.pada ?? null,
        longitude: b.longitude ?? null,
        isRetrograde: (b as any).isRetrograde ?? false,
      }).onDuplicateKeyUpdate({ set: { sign: b.sign } });
    }
  }

  const rows = await db.select().from(profiles).where(eq(profiles.id, insertId)).limit(1);
  return rows[0] ?? null;
}

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * Recompute and persist a profile's natal chart from its birth data, then clear every derived
 * cache (profection/transits + narrative) so nothing typo-derived survives. Shared by
 * calculateChart (first calc) and update (birth-data edit) — a corrected birthday must never
 * leave the old chart, or its readings, behind. Requires complete birth data (date, time, coords).
 */
async function recomputeProfileChart(
  userId: number,
  profileId: number,
  birth: { birthDate: string; birthTime?: string | null; birthTimeApprox?: boolean | null; birthLocationCity: string; birthLocationLat?: string | null; birthLocationLon?: string | null; birthTimezone?: string | null },
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const { calculateBirthChart: computeChart } = await import('../birthchart/calculator.js');

  const lat = birth.birthLocationLat ? parseFloat(birth.birthLocationLat) : 0;
  const lon = birth.birthLocationLon ? parseFloat(birth.birthLocationLon) : 0;
  // Birthplace coords are the source of truth for the timezone; a stale/manual tz throws the
  // ascendant off by hours. Derive from lat/lon, fall back to the provided tz, then UTC.
  const derivedTz = (birth.birthLocationLat && birth.birthLocationLon) ? timezoneForCoords(lat, lon) : null;
  const timezone = derivedTz || birth.birthTimezone || 'UTC';

  // Decide the representative time + how house 1 is framed:
  //  - a time was entered (exact OR approximate) → a real rising ascendant; approximate only changes
  //    the honest label, not the math. computeBasis stays "ascendant".
  //  - no time at all → noon, framed as Chandra lagna (Moon = house 1). This is the only Chandra path.
  const enteredTime = birth.birthTime && birth.birthTime.trim() ? birth.birthTime.trim() : null;
  const isApprox = !!birth.birthTimeApprox;
  const representativeTime = enteredTime ?? "12:00";
  const profileLagnaBasis: "ascendant" | "ascendant_approx" | "chandra" =
    enteredTime ? (isApprox ? "ascendant_approx" : "ascendant") : "chandra";
  const computeBasis: "ascendant" | "chandra" = enteredTime ? "ascendant" : "chandra";

  const chart = await computeChart(birth.birthDate, representativeTime, lat, lon, timezone, { lagnaBasis: computeBasis });

  await db
    .update(profiles)
    .set({
      birthDate: birth.birthDate,
      birthTime: enteredTime,
      // Deprecated column — always null now; the framing lives entirely in lagnaBasis.
      birthTimeOfDay: null,
      lagnaBasis: profileLagnaBasis,
      birthLocationCity: birth.birthLocationCity,
      birthLocationLat: birth.birthLocationLat ?? null,
      birthLocationLon: birth.birthLocationLon ?? null,
      birthTimezone: timezone,
      lagnaSign: chart.lagna.sign,
      sunHouse: chart.sun.house,
      moonHouse: chart.moon.house,
      marsHouse: chart.mars.house,
      mercuryHouse: chart.mercury.house,
      jupiterHouse: chart.jupiter.house,
      venusHouse: chart.venus.house,
      saturnHouse: chart.saturn.house,
      rahuHouse: chart.rahu.house,
      ketuHouse: chart.ketu.house,
      ascendantDegree: chart.lagna.degree.toFixed(2),
      // Meridian axis (MC/IC layer). Only a real entered time yields a true meridian — a Chandra
      // chart's MC would be the noon representative time's, so it's stored as null. Always set
      // (never omitted) so a timed→no-time edit can't leave a stale MC behind.
      mcLongitude: enteredTime && chart.mc?.longitude != null ? chart.mc.longitude.toFixed(4) : null,
    })
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));

  // Clear stale profection year + transit cache so they regenerate with the new lagna.
  try {
    const { deleteProfectionYearsForProfile } = await import('../profection/db.js');
    const { deleteTimeLordTransitsForProfile } = await import('../profection/transit-db.js');
    await deleteTimeLordTransitsForProfile(profileId);
    await deleteProfectionYearsForProfile(profileId);
  } catch (cascadeErr) {
    console.warn('[Profile Chart] Cascade clear failed:', cascadeErr);
  }

  // Store natal bodies for this profile.
  const planetData = [
    { name: 'Sun', data: chart.sun }, { name: 'Moon', data: chart.moon }, { name: 'Mercury', data: chart.mercury },
    { name: 'Venus', data: chart.venus }, { name: 'Mars', data: chart.mars }, { name: 'Jupiter', data: chart.jupiter },
    { name: 'Saturn', data: chart.saturn }, { name: 'Rahu', data: chart.rahu }, { name: 'Ketu', data: chart.ketu },
  ];
  for (const planet of planetData) {
    await upsertProfileNatalBody(profileId, planet.name, {
      sign: planet.data.sign,
      degree: planet.data.degree.toFixed(6),
      house: planet.data.house,
      nakshatra: planet.data.nakshatra || null,
      pada: planet.data.pada || null,
      longitude: planet.data.longitude != null ? planet.data.longitude.toFixed(6) : null,
      isRetrograde: !!planet.data.isRetrograde,
    });
  }

  // David's directives (2026-07-14): profile creation stores the FULL canon research layer —
  // #1 the 12-house Appendix IV research, #2 the entire Vimshottari system birth→120y.
  // Best-effort like the precomputes below: a failure warns, never blocks the chart save;
  // missing tables warn once until the manual migration runs.
  try {
    const { storeNatalResearch, storeDashaTree, storeConvergence } = await import('../vedic/research-store.js');
    const bodies: Record<string, { longitude: number; longitudeSpeed?: number; declination?: number }> = {};
    for (const [name, data] of [
      ['Sun', chart.sun], ['Moon', chart.moon], ['Mars', chart.mars], ['Mercury', chart.mercury],
      ['Jupiter', chart.jupiter], ['Venus', chart.venus], ['Saturn', chart.saturn],
      ['Rahu', chart.rahu], ['Ketu', chart.ketu],
    ] as const) {
      bodies[name] = {
        longitude: data.longitude,
        longitudeSpeed: (data as any).longitudeSpeed,
        declination: (data as any).declination,
      };
    }
    const storeInput = {
      profileId,
      bodies,
      lagnaLon: chart.lagna.longitude,
      mcLon: enteredTime && chart.mc?.longitude != null ? chart.mc.longitude : null,
      utcBirthIso: (chart as any).utcBirthIso,
      latitude: lat,
      longitude: lon,
      basis: profileLagnaBasis,
    };
    const researchStatus = await storeNatalResearch(storeInput);
    await storeDashaTree(storeInput, researchStatus);
    await storeConvergence(storeInput, researchStatus);
  } catch (researchErr) {
    console.warn('[Profile Chart] Research/dasha store failed (chart itself saved):', researchErr);
  }

  // Precompute the profection year + Time Lord transits (behind the caller's spinner).
  try {
    const { calculateProfectionYear } = await import('../profection/calculator.js');
    const { getOrCreateProfectionYear } = await import('../profection/db.js');
    const { calculateTimeLordTransits } = await import('../profection/transit-calculator.js');
    const { createTimeLordTransits } = await import('../profection/transit-db.js');
    const today = new Date().toISOString().split('T')[0];
    const prof = calculateProfectionYear(birth.birthDate, today, chart.lagna.sign);
    const py = await getOrCreateProfectionYear(userId, prof.age, prof.activatedHouse, prof.activatedSign, prof.timeLord, prof.yearStart, prof.yearEnd, profileId);
    const timeline = await calculateTimeLordTransits(prof.timeLord, prof.yearStart, prof.yearEnd, chart.lagna.degree, timezone, chart.lagna.sign);
    if (timeline.transits && timeline.transits.length > 0) {
      await createTimeLordTransits(py.id, userId, timeline.transits, profileId);
    }
  } catch (preErr) {
    console.warn('[Profile Chart] Transit precompute failed (will lazy-generate on view):', preErr);
  }

  // Bust + warm the narrative caches so no typo-derived read survives the birthday fix.
  try {
    const today = new Date().toISOString().split('T')[0];
    const { getDeepReadCached, getGlanceCached } = await import('../narrative/service.js');
    const { invalidateNarrativeInput } = await import('../narrative/input-builder.js');
    invalidateNarrativeInput(profileId);
    void getDeepReadCached(profileId, today).catch(() => {});
    void getGlanceCached(profileId, today).catch(() => {});
  } catch { /* ignore */ }

  return chart;
}

export const profilesRouter = router({
  /** List all non-archived profiles for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    // Include archived filter manually since null comparison needs care
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, ctx.user.id))
      .orderBy(profiles.createdAt);
    // Filter out archived in JS to avoid null comparison issues
    return rows.filter((p) => !p.archivedAt);
  }),

  /** Get the currently active profile (or null if none) */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getActiveProfile(ctx.user.id);
    if (!profile) return null;
    const bodies = await getProfileNatalBodies(profile.id);
    return { ...profile, natalBodies: bodies };
  }),

  /** Create a new profile. Optionally make it active immediately. */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        makeActive: z.boolean().default(false),
      }).merge(BirthInputSchema)
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Non-admin users get ONE profile — their own — unless the SECOND SEAT flag is
      // flipped for them (David 2026-07-16: "one other profile for testers. Only one.
      // And only when I flip the switch."). Cap = 2 with the flag, 1 without.
      if (ctx.user.role !== "admin") {
        const { hasFeature } = await import("../feature-flags.js");
        const cap = (await hasFeature(ctx.user, "secondProfile")) ? 2 : 1;
        const owned = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, ctx.user.id));
        const activeCount = owned.length; // includes owner + any archived rows are rare; conservative
        if (activeCount >= cap) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: cap === 2 ? "Both seats are taken — your chart and one more." : "You can only have one profile — your own.",
          });
        }
      }

      // If making active, deactivate all others first
      if (input.makeActive) {
        await db
          .update(profiles)
          .set({ isActive: false })
          .where(eq(profiles.userId, ctx.user.id));
      }

      const result = await db.insert(profiles).values({
        userId: ctx.user.id,
        name: input.name,
        birthDate: input.birthDate ?? null,
        birthTime: input.birthTime ?? null,
        birthTimeOfDay: null, // deprecated — framing lives in lagnaBasis (set on chart compute)
        birthLocationCity: input.birthLocationCity ?? null,
        birthLocationLat: input.birthLocationLat ?? null,
        birthLocationLon: input.birthLocationLon ?? null,
        birthTimezone: input.birthTimezone ?? null,
        birthDataUpdatedAt: input.birthDate ? new Date() : null, // start the 24h lock on first save
        notes: input.notes ?? null,
        isActive: input.makeActive,
      });

      const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { id: insertId, success: true };
    }),

  /** Update profile metadata (name, birth data, notes) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(128).optional(),
        notes: z.string().nullable().optional(),
      }).merge(BirthInputSchema)
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await getProfileById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });

      const { id, ...fields } = input;
      // Enforce the 24h birth-data cooldown before writing anything.
      const changed = birthDataChanged(existing, fields);
      assertBirthDataCooldown({ isAdmin: ctx.user.role === "admin", changed, lastChangedAt: (existing as any).birthDataUpdatedAt });

      const updateData: Record<string, any> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.birthDate !== undefined) updateData.birthDate = fields.birthDate;
      if (fields.birthTime !== undefined) updateData.birthTime = fields.birthTime;
      // birthTimeApprox is not persisted directly — it feeds lagnaBasis on recompute. Keep the
      // deprecated birthTimeOfDay column null on any birth-data touch.
      if (fields.birthTimeApprox !== undefined) updateData.birthTimeOfDay = null;
      if (fields.birthLocationCity !== undefined) updateData.birthLocationCity = fields.birthLocationCity;
      if (fields.birthLocationLat !== undefined) updateData.birthLocationLat = fields.birthLocationLat;
      if (fields.birthLocationLon !== undefined) updateData.birthLocationLon = fields.birthLocationLon;
      if (fields.birthTimezone !== undefined) updateData.birthTimezone = fields.birthTimezone;
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      if (changed) updateData.birthDataUpdatedAt = new Date(); // start/refresh the lock

      await db
        .update(profiles)
        .set(updateData)
        .where(and(eq(profiles.id, id), eq(profiles.userId, ctx.user.id)));

      // Birth data changed → recompute the chart so a corrected birthday can never leave the old
      // typo-derived chart (and its readings) behind. Needs complete birth data to compute; if it's
      // incomplete (no time/place yet) we just persist the fields and the full Calculate Birth Chart
      // flow builds the chart later.
      if (changed) {
        const merged = {
          birthDate: fields.birthDate ?? (existing as any).birthDate,
          birthTime: fields.birthTime ?? (existing as any).birthTime,
          // Not sent → fall back to the stored framing (lagnaBasis is the source of truth).
          birthTimeApprox: fields.birthTimeApprox ?? ((existing as any).lagnaBasis === "ascendant_approx"),
          birthLocationCity: fields.birthLocationCity ?? (existing as any).birthLocationCity,
          birthLocationLat: fields.birthLocationLat ?? (existing as any).birthLocationLat,
          birthLocationLon: fields.birthLocationLon ?? (existing as any).birthLocationLon,
          birthTimezone: fields.birthTimezone ?? (existing as any).birthTimezone,
        };
        // Recompute once we have date + place. The time is optional now: no exact time (with or
        // without a bucket) yields a Chandra-framed chart rather than blocking the compute.
        if (merged.birthDate && merged.birthLocationCity && merged.birthLocationLat && merged.birthLocationLon) {
          try {
            await recomputeProfileChart(ctx.user.id, id, merged);
          } catch (recErr) {
            console.error('[Profile Update] Chart recompute failed after birth-data edit:', recErr);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Saved the edit, but recomputing the chart failed — open Calculate Birth Chart to rebuild it." });
          }
        }
      }

      return { success: true };
    }),

  /** Set a profile as the active one (deactivates all others) */
  setActive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await getProfileById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });

      // Deactivate all profiles for this user
      await db
        .update(profiles)
        .set({ isActive: false })
        .where(eq(profiles.userId, ctx.user.id));

      // Activate the selected one
      await db
        .update(profiles)
        .set({ isActive: true })
        .where(and(eq(profiles.id, input.id), eq(profiles.userId, ctx.user.id)));

      return { success: true };
    }),

  /** Archive a profile (soft delete — keeps data, removes from list) */
  archive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await getProfileById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      if (existing.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot archive your own chart" });

      await db
        .update(profiles)
        .set({ archivedAt: new Date(), isActive: false })
        .where(and(eq(profiles.id, input.id), eq(profiles.userId, ctx.user.id)));

      return { success: true };
    }),

  /** Hard delete a profile and its natal bodies */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await getProfileById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      if (existing.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete your own chart" });

      await clearProfileNatalBodies(input.id);
      await db
        .delete(profiles)
        .where(and(eq(profiles.id, input.id), eq(profiles.userId, ctx.user.id)));

      return { success: true };
    }),

  /** Calculate and save the birth chart for a profile */
  calculateChart: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        birthDate: z.string(),
        // Birth time is optional — a no-time profile is computed as a Chandra chart. A time (exact or
        // approximate) yields a real ascendant chart; birthTimeApprox only flags it for an honest label.
        birthTime: z.string().optional(),
        birthTimeApprox: z.boolean().optional(),
        birthLocationCity: z.string(),
        birthLocationLat: z.string().optional(),
        birthLocationLon: z.string().optional(),
        birthTimezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await getProfileById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });

      try {
        const chart = await recomputeProfileChart(ctx.user.id, input.id, {
          birthDate: input.birthDate,
          birthTime: input.birthTime,
          birthTimeApprox: input.birthTimeApprox,
          birthLocationCity: input.birthLocationCity,
          birthLocationLat: input.birthLocationLat,
          birthLocationLon: input.birthLocationLon,
          birthTimezone: input.birthTimezone,
        });
        return { success: true, chart };
      } catch (error) {
        console.error('[Profile Chart] Calculation failed:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to calculate birth chart: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /** Deactivate all profiles — reverts to the user's own birth chart */
  clearActive: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(profiles)
        .set({ isActive: false })
        .where(eq(profiles.userId, ctx.user.id));

      return { success: true };
    }),

  /** Get a single profile with its natal bodies */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const profile = await getProfileById(input.id, ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      const bodies = await getProfileNatalBodies(input.id);
      return { ...profile, natalBodies: bodies };
    }),

  /**
   * Ensure the user has a "My Chart" owner profile.
   * Creates one (migrating user birth data) if it doesn't exist yet.
   * Safe to call on every app load — idempotent.
   */
  ensureOwnerProfile: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await ensureOwnerProfileHelper(ctx.user.id);
    return { id: profile?.id ?? null };
  }),

  /** Return the fully resolved AstrologySubject for the current profile context */
  getSubject: protectedProcedure.query(({ ctx }) => ctx.subject ?? null),

  /** Get the owner's own "My Chart" profile with natal bodies */
  getOwner: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, ctx.user.id), eq(profiles.isOwner, true)))
      .limit(1);
    if (!rows[0]) return null;
    const bodies = await getProfileNatalBodies(rows[0].id);
    return { ...rows[0], natalBodies: bodies };
  }),
});

// Export helpers for use by other routers
export { getActiveProfile, getProfileNatalBodies, upsertProfileNatalBody, recomputeProfileChart };
