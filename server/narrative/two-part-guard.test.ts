import { describe, it, expect } from "vitest";
import { missingTurn } from "./generate.js";

/**
 * THE TWO-PART DAY, ENFORCED (David's condition, 2026-07-20).
 *
 * He ruled the day's label should shift with the star — "A **if the prose already honestly covers
 * both**." That conditional is the whole ruling: the label may only follow the sky if the reading
 * actually reads the day in two parts. Otherwise the header changes at 3:42 and the prose never
 * mentions a turn.
 *
 * I could not verify the OUTPUT by reading code — a law being in the prompt is not the prose obeying
 * it, which is the distinction this entire run has been about. So his condition is enforced by a
 * guard with a corrective retry, and this is the guard's proof.
 */
describe("missingTurn", () => {
  const turn = { toStar: "Hasta", atLocalTime: "3:42 PM" };

  it("passes when the prose names the hour", () => {
    expect(missingTurn("Steady for close work until about 3:42, and after that it wants people.", turn)).toBeNull();
  });

  it("passes when the prose names the second star instead", () => {
    expect(missingTurn("The morning belongs to patience; by afternoon Hasta wants your hands busy.", turn)).toBeNull();
  });

  it("FAILS when the day turns and the prose flattens it", () => {
    const msg = missingTurn("A steady day for close work. Keep your head down and finish what is open.", turn);
    expect(msg).toMatch(/THE DAY TURNS AND YOUR PROSE DOES NOT SAY SO/);
    expect(msg).toContain("3:42 PM");   // the correction tells the model the actual hour
  });

  it("is silent on a day that does not turn — no invented shifts", () => {
    expect(missingTurn("A steady day.", null)).toBeNull();
    expect(missingTurn("A steady day.", undefined)).toBeNull();
    expect(missingTurn("A steady day.", { toStar: "Hasta" } as any)).toBeNull();
  });

  it("accepts the hour in any honest rendering", () => {
    // "3:42 PM", "3:42pm", "3:42" — a model writing "until about 3:42" is obeying him. Demanding
    // the exact rendering would reject honest prose, which is how a guard becomes a nuisance and
    // then gets deleted.
    for (const p of ["until 3:42 PM", "until 3:42pm", "after 3:42 the day opens"]) {
      expect(missingTurn(`Something holds ${p}.`, turn), p).toBeNull();
    }
  });

  it("matches the star as a whole word, not a fragment", () => {
    // "Hasta" must not be satisfied by an unrelated substring.
    expect(missingTurn("The day is steadfast and hastens nothing.", turn)).not.toBeNull();
  });
});
