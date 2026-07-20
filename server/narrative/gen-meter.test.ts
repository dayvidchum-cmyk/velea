import { describe, it, expect } from "vitest";
import { withMeter, countApiCall } from "./gen-meter.js";

/**
 * THE DAILY CAP MUST SEE EVERY CALL (v806).
 *
 * It counted one event per non-null generation. callGuarded makes up to three calls — an attempt
 * plus two corrective retries — so a 50/day cap was really up to 150 calls against a capped wallet;
 * and a generation that burned all three and still returned null counted as zero, because the rule
 * was "only count a REAL generation".
 */

describe("the generation meter", () => {
  it("counts each call, so a retried generation is not one event", async () => {
    const { result, calls } = await withMeter(async () => {
      countApiCall(); // first attempt
      countApiCall(); // corrective retry
      countApiCall(); // second corrective retry
      return "day read";
    });
    expect(result).toBe("day read");
    expect(calls).toBe(3);
  });

  it("counts calls that produced NOTHING — money spent is money spent", async () => {
    const { result, calls } = await withMeter(async () => {
      countApiCall();
      countApiCall();
      return null;
    });
    expect(result).toBeNull();
    expect(calls).toBe(2);
  });

  it("counts nothing when no request was made — the dry wallet must not burn the cap", async () => {
    const { calls } = await withMeter(async () => null);
    expect(calls).toBe(0);
  });

  it("keeps concurrent generations separate — the reason this is not a global counter", async () => {
    // A module-level counter read before and after an await would attribute one profile's retries
    // to whichever generation happened to be measuring at the time.
    const slow = withMeter(async () => {
      countApiCall();
      await new Promise((r) => setTimeout(r, 20));
      countApiCall();
      return "slow";
    });
    const fast = withMeter(async () => {
      countApiCall();
      return "fast";
    });
    const [a, b] = await Promise.all([slow, fast]);
    expect(a.calls).toBe(2);
    expect(b.calls).toBe(1);
  });

  it("is a no-op outside a meter, so scripts and probes cannot throw", () => {
    expect(() => countApiCall()).not.toThrow();
  });
});
