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
  return rows[0];
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

      // Non-admin users may only ever have ONE profile — their own ("My Chart").
      // Multi-profile management (Mom, Client A, etc.) is an admin-only feature.
      if (ctx.user.role !== "admin") {
        const owned = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, ctx.user.id));
        const activeCount = owned.length; // includes owner + any archived rows are rare; conservative
        if (activeCount >= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only have one profile — your own.",
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
        birthLocationCity: input.birthLocationCity ?? null,
        birthLocationLat: input.birthLocationLat ?? null,
        birthLocationLon: input.birthLocationLon ?? null,
        birthTimezone: input.birthTimezone ?? null,
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
      const updateData: Record<string, any> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.birthDate !== undefined) updateData.birthDate = fields.birthDate;
      if (fields.birthTime !== undefined) updateData.birthTime = fields.birthTime;
      if (fields.birthLocationCity !== undefined) updateData.birthLocationCity = fields.birthLocationCity;
      if (fields.birthLocationLat !== undefined) updateData.birthLocationLat = fields.birthLocationLat;
      if (fields.birthLocationLon !== undefined) updateData.birthLocationLon = fields.birthLocationLon;
      if (fields.birthTimezone !== undefined) updateData.birthTimezone = fields.birthTimezone;
      if (fields.notes !== undefined) updateData.notes = fields.notes;

      await db
        .update(profiles)
        .set(updateData)
        .where(and(eq(profiles.id, id), eq(profiles.userId, ctx.user.id)));

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
        birthTime: z.string(),
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
        const { calculateBirthChart: computeChart } = await import('../birthchart/calculator.js');

        const lat = input.birthLocationLat ? parseFloat(input.birthLocationLat) : 0;
        const lon = input.birthLocationLon ? parseFloat(input.birthLocationLon) : 0;
        // The birthplace coordinates are the source of truth for the timezone — a
        // manually-picked or stale tz (e.g. Pacific for a Boston chart) throws the
        // ascendant off by hours. Derive it from lat/lon and prefer it; fall back to
        // the provided tz, then UTC. The derived value is what we store.
        const derivedTz = (input.birthLocationLat && input.birthLocationLon)
          ? timezoneForCoords(lat, lon)
          : null;
        const timezone = derivedTz || input.birthTimezone || 'UTC';

        const chart = await computeChart(input.birthDate, input.birthTime, lat, lon, timezone);

        // Update profile with birth data + calculated chart
        await db
          .update(profiles)
          .set({
            birthDate: input.birthDate,
            birthTime: input.birthTime,
            birthLocationCity: input.birthLocationCity,
            birthLocationLat: input.birthLocationLat ?? null,
            birthLocationLon: input.birthLocationLon ?? null,
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
          })
          .where(and(eq(profiles.id, input.id), eq(profiles.userId, ctx.user.id)));

        // Clear stale profection year and transit cache so they regenerate with
        // the corrected lagnaSign on next request.
        try {
          const { deleteProfectionYearsForProfile } = await import('../profection/db.js');
          const { deleteTimeLordTransitsForProfile } = await import('../profection/transit-db.js');
          await deleteTimeLordTransitsForProfile(input.id);
          await deleteProfectionYearsForProfile(input.id);
        } catch (cascadeErr) {
          console.warn('[Profile Chart] Cascade clear failed:', cascadeErr);
        }

        // Store natal bodies for this profile
        const planetData = [
          { name: 'Sun', data: chart.sun },
          { name: 'Moon', data: chart.moon },
          { name: 'Mercury', data: chart.mercury },
          { name: 'Venus', data: chart.venus },
          { name: 'Mars', data: chart.mars },
          { name: 'Jupiter', data: chart.jupiter },
          { name: 'Saturn', data: chart.saturn },
          { name: 'Rahu', data: chart.rahu },
          { name: 'Ketu', data: chart.ketu },
        ];

        for (const planet of planetData) {
          await upsertProfileNatalBody(input.id, planet.name, {
            sign: planet.data.sign,
            degree: planet.data.degree.toFixed(6),
            house: planet.data.house,
            nakshatra: planet.data.nakshatra || null,
            pada: planet.data.pada || null,
            longitude: planet.data.longitude != null ? planet.data.longitude.toFixed(6) : null,
            isRetrograde: !!planet.data.isRetrograde,
          });
        }

        // Precompute the profection year + Time Lord transits now (during save,
        // behind its spinner) so the chart page loads from cache instead of running
        // the year-long ephemeris scan on first view. Best-effort: if it fails the
        // view path still regenerates lazily.
        try {
          const { calculateProfectionYear } = await import('../profection/calculator.js');
          const { getOrCreateProfectionYear } = await import('../profection/db.js');
          const { calculateTimeLordTransits } = await import('../profection/transit-calculator.js');
          const { createTimeLordTransits } = await import('../profection/transit-db.js');
          const today = new Date().toISOString().split('T')[0];
          const prof = calculateProfectionYear(input.birthDate, today, chart.lagna.sign);
          const py = await getOrCreateProfectionYear(
            ctx.user.id, prof.age, prof.activatedHouse, prof.activatedSign,
            prof.timeLord, prof.yearStart, prof.yearEnd, input.id,
          );
          const timeline = await calculateTimeLordTransits(
            prof.timeLord, prof.yearStart, prof.yearEnd, chart.lagna.degree, timezone, chart.lagna.sign,
          );
          if (timeline.transits && timeline.transits.length > 0) {
            await createTimeLordTransits(py.id, ctx.user.id, timeline.transits, input.id);
          }
        } catch (preErr) {
          console.warn('[Profile Chart] Transit precompute failed (will lazy-generate on view):', preErr);
        }

        // Warm the narrative caches in the background so the Core Theme / daily read
        // is ready by the time the user opens the chart. Fire-and-forget — never
        // blocks the save, and no-ops when there's no Anthropic key.
        try {
          const today = new Date().toISOString().split('T')[0];
          const { getDeepReadCached, getGlanceCached } = await import('../narrative/service.js');
          const { invalidateNarrativeInput } = await import('../narrative/input-builder.js');
          invalidateNarrativeInput(input.id); // chart changed — drop any stale memo
          void getDeepReadCached(input.id, today).catch(() => {});
          void getGlanceCached(input.id, today).catch(() => {});
        } catch { /* ignore */ }

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
export { getActiveProfile, getProfileNatalBodies, upsertProfileNatalBody };
