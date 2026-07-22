/**
 * Annual Profection Year tRPC Router
 * 
 * Provides procedures for querying and managing profection years.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../\_core/trpc.js";
import { calculateProfectionYear, getProfectionYearsInRange } from "./calculator.js";
import { generateProfectionInterpretation } from "./interpreter.js";
import { getOrCreateProfectionYear, getProfectionYearForDate, getProfectionYearsInDateRange } from "./db.js";
import { getTimeLordTransitsForYear, createTimeLordTransits } from "./transit-db.js";
import { calculateTimeLordTransits, timeLordCurrentSign, timeLordGuestsNow } from "./transit-calculator.js";
import { getUserById, getNatalBodiesByUser } from "../db.js";
import { localToday } from "../panchang/resolve-day-sky.js";
import type { ProfectionYearResponseContract, ProfectionYearWithTransitsResponseContract, TimeLordTransitRecord } from "./types.js";

export const profectionRouter = router({
  /**
   * Get the profection year for a specific date
   * Returns the calculated profection data and full interpretation
   */
  forDate: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    }))
    .query(async ({ ctx, input }) => {
      const subject = ctx.subject;
      if (!subject?.birthDate || !subject?.lagnaSign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Birth date and lagna sign must be configured"
        });
      }
      // Alias for compatibility with the rest of the procedure
      const user = { ...subject, id: ctx.user.id };

      // Calculate profection year
      const profection = calculateProfectionYear(subject.birthDate, input.date, subject.lagnaSign);

      // Get or create database record
      await getOrCreateProfectionYear(
        ctx.user.id,
        profection.age,
        profection.activatedHouse,
        profection.activatedSign,
        profection.timeLord,
        profection.yearStart,
        profection.yearEnd,
        subject.profileId ?? null
      );

      // Fetch complete natal chart data (from subject — profile or user)
      const natalBodies = subject.natalBodies;
      const natalChart = {
        lagnaSign: subject.lagnaSign,
        bodies: natalBodies,
      };

      // Generate interpretation
      const interpretation = generateProfectionInterpretation(profection, natalChart);

      const response: ProfectionYearResponseContract = {
        profection: {
          age: profection.age,
          activatedHouse: profection.activatedHouse,
          activatedSign: profection.activatedSign,
          timeLord: profection.timeLord,
          yearStart: profection.yearStart,
          yearEnd: profection.yearEnd,
          lagnaSign: profection.lagnaSign,
        },
        interpretation,
      };
      return response;
    }),

  /**
   * Get all profection years in a date range
   * Handles date ranges that cross the user's birthday
   */
  forDateRange: protectedProcedure
    .input(z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
    }))
    .query(async ({ ctx, input }) => {
      const subject = ctx.subject;
      if (!subject?.birthDate || !subject?.lagnaSign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Birth date and lagna sign must be configured"
        });
      }
      const user = { ...subject, id: ctx.user.id };

      // Get all profection years in the range
      const profections = getProfectionYearsInRange(
        subject.birthDate,
        input.startDate,
        input.endDate,
        subject.lagnaSign
      );

      // Get or create database records and generate interpretations
      const results = await Promise.all(
        profections.map(async (profection) => {
          await getOrCreateProfectionYear(
            ctx.user.id,
            profection.age,
            profection.activatedHouse,
            profection.activatedSign,
            profection.timeLord,
            profection.yearStart,
            profection.yearEnd,
            subject.profileId ?? null
          );

          // Fetch complete natal chart data (from subject)
          const natalBodies = subject.natalBodies;
          const natalChart = {
            lagnaSign: subject.lagnaSign,
            bodies: natalBodies,
          };

          const interpretation = generateProfectionInterpretation(profection, natalChart);

          return {
            profection,
            interpretation,
          };
        })
      );

      return results;
    }),

  /**
   * Get the current profection year (based on today's date)
   */
  current: protectedProcedure
    .query(async ({ ctx }) => {
      const subject = ctx.subject;
      if (!subject?.birthDate || !subject?.lagnaSign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Birth date and lagna sign must be configured"
        });
      }
      const user = { ...subject, id: ctx.user.id };

      // "today" is the VIEWER's local date, not the server's UTC date — otherwise age /
      // activatedHouse / Time Lord flip on the wrong side of midnight for non-UTC users (worst on
      // the birthday itself). localToday resolves current→hometown→birth tz, same as the reading.
      const today = localToday(ctx.user, subject);

      const profection = calculateProfectionYear(subject.birthDate, today, subject.lagnaSign);

      await getOrCreateProfectionYear(
        ctx.user.id,
        profection.age,
        profection.activatedHouse,
        profection.activatedSign,
        profection.timeLord,
        profection.yearStart,
        profection.yearEnd,
        subject.profileId ?? null
      );

      // Fetch complete natal chart data (from subject)
      const natalBodies = subject.natalBodies;
      const natalChart = {
        lagnaSign: subject.lagnaSign,
        bodies: natalBodies,
      };
      const timeLordBody = natalBodies.find(b => b.planet === profection.timeLord);

      const interpretation = generateProfectionInterpretation(profection, natalChart);

      return {
        profection,
        interpretation,
        _debug: {
          timeLord: profection.timeLord,
          natalTimeLord: timeLordBody || null,
          operationalChain: interpretation.operationalChain,
          interpretationSource: 'generated',
        }
      };
    }),

  /**
   * Get Time Lord transits for the current profection year
   * Saves transits to database on first call, then loads from database on subsequent calls
   */
  timeLordTransits: protectedProcedure
    .query(async ({ ctx }) => {
      const subject = ctx.subject;
      if (!subject?.birthDate || !subject?.lagnaSign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Birth date and lagna sign must be configured"
        });
      }
      const user = { ...subject, id: ctx.user.id };

      // Viewer-local date, not server UTC (see `current` above) — the same value drives the
      // current-segment detection at todayStr/todayStr2 below.
      const today = localToday(ctx.user, subject);
      const profection = calculateProfectionYear(subject.birthDate, today, subject.lagnaSign);

      // Get or create the profection year record
      let profectionYear = await getOrCreateProfectionYear(
        ctx.user.id,
        profection.age,
        profection.activatedHouse,
        profection.activatedSign,
        profection.timeLord,
        profection.yearStart,
        profection.yearEnd,
        subject.profileId ?? null
      );

      // Staleness guard: if the cached year no longer matches the chart (e.g. the
      // lagna was corrected, changing the activated sign / Time Lord), the stored
      // transits are for the wrong planet and houses. Wipe and rebuild.
      if (profectionYear.timeLord !== profection.timeLord || profectionYear.activatedSign !== profection.activatedSign) {
        const { deleteTimeLordTransitsForProfile } = await import("./transit-db.js");
        const { deleteProfectionYearsForProfile } = await import("./db.js");
        await deleteTimeLordTransitsForProfile(subject.profileId ?? null);
        await deleteProfectionYearsForProfile(subject.profileId ?? null);
        profectionYear = await getOrCreateProfectionYear(
          ctx.user.id,
          profection.age,
          profection.activatedHouse,
          profection.activatedSign,
          profection.timeLord,
          profection.yearStart,
          profection.yearEnd,
          subject.profileId ?? null
        );
      }

      // Get existing transits (scoped to the owner — audit HIGH-1)
      let transits = await getTimeLordTransitsForYear(profectionYear.id, ctx.user.id);

      // Heal stale rows: rebuild if the segment covering today disagrees with the Time
      // Lord's actual sidereal sign (old ayanamsa bug), OR if it predates the co-present
      // ("guests") computation (coPresentPlanets column null). Either way, wipe → rebuild.
      if (transits.length > 0 && subject.profileId != null) {
        const todayStr = today;
        const cur = transits.find((t) => t.startDate <= todayStr && todayStr <= t.endDate);
        const actualSign = await timeLordCurrentSign(profection.timeLord);
        const signStale = !!(cur && actualSign && cur.sign !== actualSign);
        const missingGuests = !!(cur && (cur as any).coPresentPlanets == null);
        // The SEFLG_SPEED bug shipped rows where NO segment was ever flagged retrograde, even
        // when the planet visibly retrograded — a sign is LEFT and RE-ENTERED (Venus this fall:
        // Libra → Virgo → Libra). If a sign is revisited but nothing is marked retrograde, the
        // rows came from the broken calculator → rebuild. Self-heals: fixed rows carry the flag,
        // so the revisit no longer coincides with an all-direct year.
        let revisit = false; const seenSign = new Set<string>(); let prevSign = "";
        for (const t of transits) { if (t.sign !== prevSign) { if (seenSign.has(t.sign)) { revisit = true; break; } seenSign.add(t.sign); } prevSign = t.sign; }
        const retroDataBroken = revisit && !transits.some((t) => t.isRetrograde);
        if (signStale || missingGuests || retroDataBroken) {
          const { deleteTimeLordTransitsForProfile } = await import("./transit-db.js");
          await deleteTimeLordTransitsForProfile(subject.profileId);
          transits = [];
        }
      }

      // If no transits exist, calculate and store them
      if (transits.length === 0) {
        try {
          const timeline = await calculateTimeLordTransits(
            profection.timeLord,
            profection.yearStart,
            profection.yearEnd,
            typeof subject.ascendantDegree === 'string' ? parseFloat(subject.ascendantDegree) : 0,
            "UTC",
            subject.lagnaSign
          );

          if (timeline.transits && timeline.transits.length > 0) {
            transits = await createTimeLordTransits(
              profectionYear.id,
              ctx.user.id,
              timeline.transits,
              subject.profileId ?? null
            );
          }
        } catch (error) {
          console.error("Error calculating Time Lord transits:", error);
          // Return empty array if calculation fails, don't throw
        }
      }

      // Map database records to transit contract. The CURRENT segment's guests/combustion/
      // solitary are computed LIVE (right now) instead of its stored midpoint snapshot.
      const todayStr2 = today;
      const guestsNow = await timeLordGuestsNow(profection.timeLord);
      const transitRecords: TimeLordTransitRecord[] = transits.map(t => {
        const isCurrent = t.startDate <= todayStr2 && todayStr2 <= t.endDate;
        const live = isCurrent && guestsNow ? guestsNow : null;
        return {
          startDate: t.startDate,
          endDate: t.endDate,
          timeLord: t.timeLord,
          sign: t.sign,
          house: t.house,
          retrogradeStatus: t.isRetrograde,
          secondaryConditions: {
            coPresentPlanets: live ? live.coPresentPlanets : (t.coPresentPlanets ? JSON.parse(t.coPresentPlanets) : undefined),
            rahuKetuPresence: t.rahuKetuPresence as "Rahu" | "Ketu" | "Both" | null | undefined,
            combustionStatus: live ? live.combustionStatus : (t.combustionStatus || undefined),
            closeConjunctions: t.closeConjunctions ? JSON.parse(t.closeConjunctions) : undefined,
            solitaryStatus: live ? live.solitaryStatus : (t.solitaryStatus || undefined),
          },
        };
      });

      const response: ProfectionYearWithTransitsResponseContract = {
        transits: transitRecords,
      };
      return response;
    }),
});
