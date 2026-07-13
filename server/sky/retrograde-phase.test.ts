import { describe, it, expect } from "vitest";
import { mercuryRxState } from "./retrograde-phase";

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
