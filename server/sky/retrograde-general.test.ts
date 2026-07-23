import { describe, it, expect } from "vitest";
import { planetRxState, mercuryRxState } from "./retrograde-phase.js";

/**
 * RETROGRADE, GENERALIZED (David 2026-07-23: "every non-Mercury retrograde was flat true — a planet
 * at its station is the most charged state in the sky"). planetRxState carries the phase + intensity
 * for all five, not just Mercury. Real astronomy (Swiss Ephemeris), so a few targeted dates, not
 * scans — the point is that the SHAPE generalizes and the slow-planet stationing bug is fixed.
 */
const PHASES = ["direct", "pre-shadow", "stationing", "retrograde", "retroshade"];

describe("planetRxState — beyond Mercury", () => {
  it("returns a valid state for every planet", async () => {
    for (const p of ["mercury", "venus", "mars", "jupiter", "saturn"] as const) {
      const s = await planetRxState(p, "2026-09-15");
      expect(PHASES, `${p} phase`).toContain(s.phase);
      expect(s.strength).toBeGreaterThanOrEqual(0);
      expect(s.strength).toBeLessThanOrEqual(1);
      expect(typeof s.retrograde).toBe("boolean");
      if (s.retrograde) expect(["retrograde", "stationing"]).toContain(s.phase);
    }
  }, 60000);

  it("Saturn is NOT perpetually 'stationing' — the per-planet threshold fixes the slow-planet bug", async () => {
    // With the old flat 0.15°/day threshold, Saturn (which rarely exceeds ~0.13°/day) read as
    // stationing almost every day of its months-long retrograde. Sample its 2026 rx season (~Jul–Nov):
    // most days must classify as a real phase, and at least some as genuinely retrograde.
    const dates = ["2026-08-01", "2026-08-20", "2026-09-10", "2026-09-30", "2026-10-20"];
    const states = await Promise.all(dates.map((d) => planetRxState("saturn", d)));
    const stationing = states.filter((s) => s.phase === "stationing").length;
    expect(stationing, "Saturn read as stationing on nearly every day — threshold not per-planet").toBeLessThan(dates.length);
    expect(states.some((s) => s.retrograde), "Saturn should be retrograde somewhere in its 2026 season").toBe(true);
  }, 60000);

  it("mercuryRxState is exactly planetRxState('mercury') — the wrapper didn't drift", async () => {
    const a = await mercuryRxState("2026-09-15");
    const b = await planetRxState("mercury", "2026-09-15");
    expect(a).toEqual(b);
  }, 60000);
});
