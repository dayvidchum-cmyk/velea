import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getGlanceCached, getDeepReadCached } from "./service.js";
import { buildNarrativeInput } from "./input-builder.js";
import { setNarrativeLock, isNarrativeLocked } from "../db.js";

const todayUTC = () => new Date().toISOString().split("T")[0];

const inputSchema = z.object({
  profileId: z.number(),
  date: z.string().optional(),
  refresh: z.boolean().optional(),
});

export const narrativeRouter = router({
  // One-sentence daily signal for the Today page. Falls back to null on any error.
  glance: protectedProcedure.input(inputSchema).query(async ({ input }) => {
    const date = input.date ?? todayUTC();
    try {
      return await getGlanceCached(input.profileId, date, input.refresh ?? false);
    } catch (e) {
      console.error("[narrative.glance]", e);
      return { available: false, content: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Structured six-section + synthesis read for the Profection page.
  deepRead: protectedProcedure.input(inputSchema).query(async ({ input }) => {
    const date = input.date ?? todayUTC();
    try {
      return await getDeepReadCached(input.profileId, date, input.refresh ?? false);
    } catch (e) {
      console.error("[narrative.deepRead]", e);
      return { available: false, read: null, generatedAt: null, cached: false } as const;
    }
  }),

  // Is today's (or a given date's) read pinned/locked?
  lockStatus: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional() })).query(async ({ input }) => {
    const date = input.date ?? todayUTC();
    try { return { locked: await isNarrativeLocked(input.profileId, date) }; }
    catch { return { locked: false }; }
  }),

  // Pin / unpin the read for a date — a locked read is returned as-is regardless of
  // prompt-version or input changes, so it never regenerates until unpinned.
  setLock: protectedProcedure.input(z.object({ profileId: z.number(), date: z.string().optional(), locked: z.boolean() })).mutation(async ({ input }) => {
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
  currentTransits: protectedProcedure.input(inputSchema).query(async ({ input }) => {
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
