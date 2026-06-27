import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { calculateTimeLordTransits } from "./transit-calculator";
import {
  createTimeLordTransits,
  getTimeLordTransitsForYear,
  getTimeLordTransitForDate,
  getTimeLordTransitsInRange,
} from "./transit-db";
import { getProfectionYearForDate, getOrCreateProfectionYear } from "./db";
import { calculateProfectionYear } from "./calculator";
import { getUserById } from "../db";

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
    .query(async ({ input }) => {
      return await getTimeLordTransitsForYear(input.profectionYearId);
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

      // ── 3. Try to find an existing transit row ──────────────────────────────
      let transit = await getTimeLordTransitForDate(profectionYear.id, input.date);

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
        timeLord: z.string(),
        yearStart: z.string(),
        yearEnd: z.string(),
        lagnaLongitude: z.number(),
        timezone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
