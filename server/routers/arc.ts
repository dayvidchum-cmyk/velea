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
import { localToday } from "../panchang/resolve-day-sky.js";
import { hasFeature } from "../feature-flags.js";

export const arcRouter = router({
  forward: protectedProcedure.query(async ({ ctx }) => {
    // THE THIRST GATE (locked-feature law + "counts shown, prose veiled"): the Road Ahead is a
    // locked premium surface, but a free user should still see how MUCH is ahead (the apex timing,
    // the crown count, how many season-turns) — never the dates, titles, or what each asks. So we
    // compute for everyone with a chart and STRIP the detail server-side for the non-entitled; the
    // client can't leak what it never receives. Entitled = admin OR the specialReadings tester flag.
    const entitled = await hasFeature(ctx.user, "specialReadings");
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
    const natalSignByPlanet = Object.fromEntries(
      subject.natalBodies.filter((b) => b.sign).map((b) => [b.planet, b.sign]),
    ) as Record<string, string>;

    const today = localToday(ctx.user, subject);
    const arc = await computeArc(
      {
        birthDate: subject.birthDate,
        moonNakshatra: moon.nakshatra,
        moonSign: moon.sign,
        moonDegree: moon.degree,
        moonLongitude: moon.longitude ?? null,
        lagnaSign: subject.lagnaSign,
        natalHouseByPlanet,
        natalSignByPlanet,
      },
      today,
    );

    const slowCount = arc.milestones.filter((m) => m.kind !== "apex").length;

    if (!entitled) {
      // Veiled: counts only. NO dates, NO titles, NO details, NO milestone list — just how much is
      // ahead. apex keeps its RELATIVE timing (daysAway) and its crown flavour, never its date.
      return {
        entitled: false as const,
        apex: arc.apex ? { daysAway: arc.apex.daysAway, crown: arc.apex.crown } : null,
        crownCount: arc.crownCount,
        slowCount,
        lagnaSign: subject.lagnaSign,
        userName: subject.name ?? null,
      };
    }

    return {
      entitled: true as const,
      apex: arc.apex,
      crownCount: arc.crownCount,
      slowCount,
      milestones: arc.milestones,
      lagnaSign: subject.lagnaSign,
      userName: subject.name ?? null,
    };
  }),
});
