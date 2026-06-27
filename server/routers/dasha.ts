/**
 * Dasha tRPC Router
 *
 * Uses resolveAstrologySubject to get birth data from the active profile
 * (if one is set) or the user's own birth data as fallback.
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";

export const dashaRouter = router({
  timeline: protectedProcedure.query(async ({ ctx }) => {
    const subject = ctx.subject;

    if (!subject) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Birth date not configured. Please enter birth details in Settings or create a Profile.",
      });
    }

    const moon = subject.natalBodies.find((b) => b.planet === "Moon");
    if (!moon?.nakshatra || !moon?.sign || !moon?.degree) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Birth chart not calculated. Please calculate the birth chart first.",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const timeline = calculateDashaTimeline(
      subject.birthDate,
      moon.nakshatra,
      moon.sign,
      moon.degree,
      today,
      moon.longitude ?? null
    );

    return {
      ...timeline,
      birthDate: subject.birthDate,
      lagnaSign: subject.lagnaSign ?? null,
      userName: subject.name ?? null,
      profileId: subject.profileId,
      source: subject.source,
    };
  }),
});
