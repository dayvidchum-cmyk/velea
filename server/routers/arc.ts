/**
 * Arc tRPC Router — the forward "Road Ahead".
 *
 * Runs the deterministic arc engine (server/sky/arc.ts) for the active profile: the near-term
 * apex + crown count, and the year's slow season-turns (dasha change, profection handoff,
 * slow-planet ingresses). Cheap (~20ms; the ephemeris is cached), so no server cache needed.
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import { computeArc } from "../sky/arc.js";

export const arcRouter = router({
  forward: protectedProcedure.query(async ({ ctx }) => {
    // The Road Ahead is admin-only (David) for now — gated here too, not just in the UI.
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "The Road Ahead isn't available yet." });
    }
    const subject = ctx.subject;
    if (!subject) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Birth date not configured. Add birth details in Settings or a Profile." });
    }
    const moon = subject.natalBodies.find((b) => b.planet === "Moon");
    if (!moon?.nakshatra || !moon?.sign || !moon?.degree || !subject.lagnaSign) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Birth chart not calculated yet." });
    }

    const natalHouseByPlanet = Object.fromEntries(
      subject.natalBodies.map((b) => [b.planet, b.house]),
    ) as Record<string, number>;

    const today = new Date().toISOString().split("T")[0];
    const arc = await computeArc(
      {
        birthDate: subject.birthDate,
        moonNakshatra: moon.nakshatra,
        moonSign: moon.sign,
        moonDegree: moon.degree,
        moonLongitude: moon.longitude ?? null,
        lagnaSign: subject.lagnaSign,
        natalHouseByPlanet,
      },
      today,
    );

    return {
      apex: arc.apex,
      crownCount: arc.crownCount,
      milestones: arc.milestones,
      lagnaSign: subject.lagnaSign,
      userName: subject.name ?? null,
    };
  }),
});
