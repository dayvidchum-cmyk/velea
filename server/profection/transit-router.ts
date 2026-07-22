import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { calculateTimeLordTransits, timeLordCurrentSign } from "./transit-calculator";
import {
  createTimeLordTransits,
  getTimeLordTransitsForYear,
  getTimeLordTransitForDate,
  getTimeLordTransitsInRange,
} from "./transit-db";
import { getProfectionYearForDate, getOrCreateProfectionYear, isProfectionYearOwnedBy } from "./db";
import { calculateProfectionYear } from "./calculator";
import { getUserById } from "../db";
import { localToday } from "../panchang/resolve-day-sky";
import { TRPCError } from "@trpc/server";

export const timeLordTransitRouter = router({
  /**
   * Get Time Lord transits for a specific profection year
   */
  forYear: protectedProcedure
    .input(
      z.object({
        profectionYearId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // audit HIGH-1 (IDOR): the query is scoped to ctx.user.id so a guessed year id
      // can only ever return the caller's own transits.
      return await getTimeLordTransitsForYear(input.profectionYearId, ctx.user.id);
    }),

  /**
   * Get Time Lord transit active on a specific date.
   *
   * If no profection year row exists for this user + date, but the user has
   * birth data configured, we generate the profection year and its transits
   * on-demand so new users see correct data immediately after entering their
   * birth details.
   */
  forDate: protectedProcedure
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;

      // ── 1. Try to find an existing profection year row ──────────────────────
      let profectionYear = await getProfectionYearForDate(ctx.user.id, input.date, profileId);

      // ── 2. If missing, attempt on-demand generation ─────────────────────────
      if (!profectionYear) {
        if (!subject?.birthDate || !subject?.lagnaSign) {
          return null;
        }

        try {
          const profection = calculateProfectionYear(
            subject.birthDate,
            input.date,
            subject.lagnaSign
          );

          profectionYear = await getOrCreateProfectionYear(
            ctx.user.id,
            profection.age,
            profection.activatedHouse,
            profection.activatedSign,
            profection.timeLord,
            profection.yearStart,
            profection.yearEnd,
            profileId
          );
        } catch {
          return null;
        }
      }

      // ── 2b. Staleness guard — if the cached year no longer matches the chart
      // (lagna corrected → different activated sign / Time Lord), wipe & rebuild.
      if (profileId != null && subject?.birthDate && subject?.lagnaSign) {
        const fresh = calculateProfectionYear(subject.birthDate, input.date, subject.lagnaSign);
        if (profectionYear.timeLord !== fresh.timeLord || profectionYear.activatedSign !== fresh.activatedSign) {
          const { deleteTimeLordTransitsForProfile } = await import("./transit-db.js");
          const { deleteProfectionYearsForProfile } = await import("./db.js");
          await deleteTimeLordTransitsForProfile(profileId);
          await deleteProfectionYearsForProfile(profileId);
          profectionYear = await getOrCreateProfectionYear(
            ctx.user.id, fresh.age, fresh.activatedHouse, fresh.activatedSign,
            fresh.timeLord, fresh.yearStart, fresh.yearEnd, profileId,
          );
        }
      }

      // ── 3. Try to find an existing transit row ──────────────────────────────
      let transit = await getTimeLordTransitForDate(profectionYear.id, input.date);

      // ── 3b. Heal stale rows: if the row covering today disagrees with the Time
      // Lord's actual sidereal sign (the old ayanamsa double-count), wipe & rebuild.
      if (transit && profileId != null) {
        const todayStr = localToday(ctx.user, subject);
        const todayRow = input.date === todayStr ? transit : await getTimeLordTransitForDate(profectionYear.id, todayStr);
        const actualSign = await timeLordCurrentSign(profectionYear.timeLord);
        if (todayRow && actualSign && todayRow.sign !== actualSign) {
          const { deleteTimeLordTransitsForProfile } = await import("./transit-db.js");
          await deleteTimeLordTransitsForProfile(profileId);
          transit = null;
        }
      }

      // ── 4. If no transits exist, generate them on-demand ──────────────────────
      if (!transit && subject?.lagnaSign) {
        try {
          const timeline = await calculateTimeLordTransits(
            profectionYear.timeLord,
            profectionYear.yearStart,
            profectionYear.yearEnd,
            typeof subject.ascendantDegree === "string" ? parseFloat(subject.ascendantDegree) : 0,
            "UTC",
            subject.lagnaSign
          );

          if (timeline.transits && timeline.transits.length > 0) {
            await createTimeLordTransits(
              profectionYear.id,
              ctx.user.id,
              timeline.transits,
              profileId
            );
            transit = await getTimeLordTransitForDate(profectionYear.id, input.date);
          }
        } catch {
          return null;
        }
      }

      return transit ?? null;
    }),

  /**
   * Get Time Lord transits within a date range
   */
  forDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      const subject = ctx.subject;
      const profileId = subject?.profileId ?? null;
      // Get profection years that overlap with the date range
      const startYear = await getProfectionYearForDate(ctx.user.id, input.startDate, profileId);
      const endYear = await getProfectionYearForDate(ctx.user.id, input.endDate, profileId);

      if (!startYear || !endYear) {
        return [];
      }

      // If same profection year, fetch once
      if (startYear.id === endYear.id) {
        return await getTimeLordTransitsInRange(startYear.id, input.startDate, input.endDate);
      }

      // If different years, fetch from both
      const startYearTransits = await getTimeLordTransitsInRange(
        startYear.id,
        input.startDate,
        startYear.yearEnd
      );
      const endYearTransits = await getTimeLordTransitsInRange(
        endYear.id,
        endYear.yearStart,
        input.endDate
      );

      return [...startYearTransits, ...endYearTransits];
    }),

  /**
   * Calculate and store Time Lord transits for a profection year
   * (Called internally when a profection year is created)
   */
  calculate: protectedProcedure
    .input(
      z.object({
        profectionYearId: z.number(),
        timeLord: z.string().min(2).max(12),
        yearStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        yearEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        lagnaLongitude: z.number().min(0).max(360),
        timezone: z.string().max(64),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // AUDIT H3 (2026-07-18): yearStart/yearEnd were unbounded strings driving a per-day
      // ephemeris loop — "0001-01-01".."9999-12-31" = ~3.65M synchronous Swiss Ephemeris calls
      // stalling the single-process server, then bulk junk inserts. A profection year is ~366
      // days; cap the span hard and reject inverted ranges.
      {
        const startMs = Date.parse(input.yearStart + "T00:00:00Z");
        const endMs = Date.parse(input.yearEnd + "T00:00:00Z");
        if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs || (endMs - startMs) / 86400000 > 400) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Span must be a valid range of at most 400 days." });
        }
      }
      // audit MEDIUM-4: verify the target year is the caller's before computing/writing —
      // no polluting another user's year id or spending ephemeris compute on it.
      if (!(await isProfectionYearOwnedBy(input.profectionYearId, ctx.user.id))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your profection year." });
      }
      // Calculate transits
      const timeline = await calculateTimeLordTransits(
        input.timeLord,
        input.yearStart,
        input.yearEnd,
        input.lagnaLongitude,
        input.timezone
      );

      // Store in database — pass profileId so rows are scoped to the active profile
      const profileId = ctx.subject?.profileId ?? null;
      const records = await createTimeLordTransits(
        input.profectionYearId,
        ctx.user.id,
        timeline.transits,
        profileId
      );

      return records.map((r: any) => ({
        timeLord: r.timeLord,
        startDate: r.startDate,
        endDate: r.endDate,
        sign: r.sign,
        house: r.house,
        nakshatra: r.nakshatra || undefined,
        isRetrograde: r.isRetrograde,
        condition: r.condition,
        operationalMeaning: r.operationalMeaning,
        recommendedUse: r.recommendedUse,
      })) as any;
    }),
});
