import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getGlanceCached, getDeepReadCached } from "./service.js";
import { buildNarrativeInput } from "./input-builder.js";
import { setNarrativeLock, isNarrativeLocked, getUserById, listNarrativeReadings } from "../db.js";
import { assertOwnsProfile } from "../routers/profiles.js";
import { getTimezoneOffset } from "../panchang/tz-offset.js";

// The day-mode's location basis — the viewer's stored location + real tz, matching the hero's
// panchang (panchang.today / byDate). undefined → getDayField uses its built-in default. Keeping
// these in lock-step is what stops the hero and the day card naming different modes on one day.
function dayLocFromUser(u: { locationLat?: string | null; locationLon?: string | null; locationTimezone?: string | null } | null | undefined): { lat: number; lon: number; utcOffset: number } | undefined {
  if (u?.locationLat && u?.locationLon && u?.locationTimezone) {
    return { lat: parseFloat(u.locationLat), lon: parseFloat(u.locationLon), utcOffset: getTimezoneOffset(u.locationTimezone, new Date()) };
  }
  return undefined;
}

const todayUTC = () => new Date().toISOString().split("T")[0];

const inputSchema = z.object({
  profileId: z.number(),
  date: z.string().optional(),
  refresh: z.boolean().optional(),
  // Present only on the "update to the moment" tap → hora-aware, ephemeral read.
  nowMs: z.number().optional(),
  // Admin-only "stage + guests" deepened read (the current-sky upsell preview).
  deepened: z.boolean().optional(),
});

export const narrativeRouter = router({
  // One-sentence daily signal for the Today page. Falls back to null on any error.
  glance: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    try {
      const u = await getUserById(ctx.user.id);
      // Day-mode from the viewer's location basis (same as the hero) — so the read and the hero
      // never name different modes on the same day.
      const dayLoc = dayLocFromUser(u);
      // Moment read: attach the user's CURRENT location so the hora is "this hour where
      // you are" (default Boston, matching Master Mode's hora), not the birth place.
      let moment: { nowMs: number; lat?: number; lon?: number } | undefined;
      if (input.nowMs != null) {
        moment = {
          nowMs: input.nowMs,
          lat: u?.locationLat ? parseFloat(u.locationLat) : 42.3601,
          lon: u?.locationLon ? parseFloat(u.locationLon) : -71.0589,
        };
      }
      return await getGlanceCached(input.profileId, date, input.refresh ?? false, moment, dayLoc);
    } catch (e) {
      console.error("[narrative.glance]", e);
      return { available: false, content: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Structured six-section + synthesis read for the Profection page.
  deepRead: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    // The deepened "stage + guests" read is an admin-only preview of the paid tier — a
    // non-admin can never obtain it, so the fast-tier detail stays behind the upsell.
    const deepened = (input.deepened ?? false) && ctx.user.role === "admin";
    try {
      const dayLoc = dayLocFromUser(await getUserById(ctx.user.id));
      return await getDeepReadCached(input.profileId, date, input.refresh ?? false, deepened, dayLoc);
    } catch (e) {
      console.error("[narrative.deepRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Kept Readings archive — every stored daily reading, newest first, with a snippet + pin state.
  list: protectedProcedure.input(z.object({ profileId: z.number(), limit: z.number().int().min(1).max(180).default(120) })).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const rows = await listNarrativeReadings(input.profileId, input.limit);
    return rows.map((r) => {
      let snippet = "";
      try {
        const c = JSON.parse(r.content);
        const n = typeof c?.narrative === "string" ? c.narrative : String(r.content);
        snippet = n.replace(/\s+/g, " ").trim().slice(0, 180);
      } catch {
        snippet = String(r.content).replace(/\s+/g, " ").trim().slice(0, 180);
      }
      return { date: r.cacheDate, generatedAt: r.generatedAt, locked: r.locked, snippet };
    });
  }),

  // Is today's (or a given date's) read pinned/locked?
  lockStatus: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional() })).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    try { return { locked: await isNarrativeLocked(input.profileId, date) }; }
    catch { return { locked: false }; }
  }),

  // Pin / unpin the read for a date — a locked read is returned as-is regardless of
  // prompt-version or input changes, so it never regenerates until unpinned.
  setLock: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional(), locked: z.boolean() })).mutation(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    // Ensure both surfaces exist before locking, so there's a row to pin.
    if (input.locked) {
      await getGlanceCached(input.profileId, date, false).catch(() => {});
      await getDeepReadCached(input.profileId, date, false).catch(() => {});
    }
    await setNarrativeLock(input.profileId, "glance", date, input.locked);
    await setNarrativeLock(input.profileId, "deep", date, input.locked);
    return { locked: input.locked };
  }),

  // Deterministic (ephemeris) current transits for the CURRENT TRIGGER breakdown.
  // No LLM — pure chart math, so it is free and auditable.
  currentTransits: protectedProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    await assertOwnsProfile(ctx.user.id, input.profileId);
    const date = input.date ?? todayUTC();
    try {
      const ni = await buildNarrativeInput(input.profileId, date);
      return {
        available: true,
        activatedHouse: ni.profection.activatedHouse,
        timeLord: ni.profection.timeLord,
        timeLordTransit: ni.timeLordTransit,
        transits: ni.transits,
      };
    } catch (e) {
      console.error("[narrative.currentTransits]", e);
      return { available: false, activatedHouse: 0, timeLord: "", timeLordTransit: null, transits: [] as any[] };
    }
  }),
});
