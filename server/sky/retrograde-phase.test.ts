import { describe, it, expect } from "vitest";
import { mercuryRxState, mercuryRxCycle } from "./retrograde-phase";

// Mercury's mid-2026 retrograde: pre-shadow ~Jun 15, station R ~Jun 29, deep rx through Jul,
// station D ~Jul 24, retroshade fading to ~Aug 6. Pins the phase classification + strength ramp.
describe("mercuryRxState — graded retrograde phase", () => {
  it("names the pre-shadow approach (direct, in the band, before the station)", async () => {
    const s = await mercuryRxState("2026-06-20");
    expect(s.phase).toBe("pre-shadow");
    expect(s.retrograde).toBe(false);
    expect(s.strength).toBeGreaterThan(0.4);
    expect(s.strength).toBeLessThan(1);
  });

  it("names the deep retrograde at full strength", async () => {
    const s = await mercuryRxState("2026-07-13");
    expect(s.phase).toBe("retrograde");
    expect(s.retrograde).toBe(true);
    expect(s.strength).toBeCloseTo(1, 1);
  });

  it("names the stationing hinge (near-zero speed)", async () => {
    const s = await mercuryRxState("2026-06-29");
    expect(s.phase).toBe("stationing");
    expect(Math.abs(s.speed)).toBeLessThan(0.15);
  });

  it("names the retroshade tail (direct again, still in the band)", async () => {
    const s = await mercuryRxState("2026-08-01");
    expect(s.phase).toBe("retroshade");
    expect(s.retrograde).toBe(false);
    expect(s.strength).toBeGreaterThan(0);
  });

  it("is plain direct well outside the shadow", async () => {
    const s = await mercuryRxState("2026-09-15");
    expect(s.phase).toBe("direct");
    expect(s.strength).toBe(0);
  });
});

describe("mercuryRxCycle — the whole-cycle arc for a period reading", () => {
  it("returns the active cycle mid-retrograde (Jul 2026: Cancer→Gemini)", async () => {
    const c = await mercuryRxCycle("2026-07-13");
    expect(c).not.toBeNull();
    expect(c!.phaseNow).toBe("retrograde");
    expect(c!.stationRetro.sign).toBe("Cancer");
    expect(c!.stationDirect.sign).toBe("Gemini");
    expect(c!.crossesSigns).toBe(true);
    expect(c!.preShadowStart < c!.stationRetro.date).toBe(true);
    expect(c!.stationDirect.date < c!.retroshadeEnd).toBe(true);
  });

  it("returns the approaching cycle when within the lookahead window", async () => {
    const c = await mercuryRxCycle("2026-06-10");
    expect(c).not.toBeNull();
    expect(c!.phaseNow).toBe("approaching");
    expect(c!.daysToStationRetro).toBeGreaterThan(0);
  });

  it("returns null when Mercury is clear (between cycles, next build > lookahead)", async () => {
    const c = await mercuryRxCycle("2026-08-10");
    expect(c).toBeNull();
  });
});
