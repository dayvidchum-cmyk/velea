import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE DAY IS NAMED BY THE SUNRISE STAR (David's ruling, 2026-07-20: "yes").
 *
 * The Vedic day begins at local sunrise, and the configuration at that instant prints the blueprint
 * for the whole cycle — so the civil day keeps the sunrise star's name. Blending to whichever star
 * holds the MAJORITY is what the generic apps do, and he was explicit that it is why their
 * horoscopes feel wrong in the morning or the evening.
 *
 * MEASURED before the flip (server/scripts/sunrise-mode-impact.ts, one year at Boston):
 *   the star NAME changes on 172 of 365 days (47.1%)
 *   the MODE SCORE changes on 118 (32.3%), fifteen of them by a full point
 *
 * This is NOT the two-part reading. That is separate and already live: the prose still reads the day
 * in two halves around the turn and names the hour. This decides only what the day is CALLED — and
 * therefore which star feeds the mode.
 */
const SVC = readFileSync(new URL("./service.ts", import.meta.url), "utf8");

describe("the day's name", () => {
  it("comes from the sunrise star, with the majority star only as a fallback", () => {
    expect(SVC).toMatch(/const dominantNak = \(astro as any\)\?\.nakshatraAtSunrise \?\? astro\?\.nakshatra/);
  });

  it("falls back rather than failing when there is no sunrise value", () => {
    // A polar day, or a cached row from before this field existed, must still produce a name.
    // Silence is not an option here — every day has to be called something.
    const m = SVC.match(/const dominantNak = .*/);
    expect(m![0]).toContain("?? cached.nakshatra");
  });

  it("still feeds the mode from whatever the day is named by", () => {
    // The star is not just a label: getNakshatraModifier reads it, so the naming decision IS the
    // mode decision. That coupling is the reason this needed his ruling and not my inference.
    expect(SVC).toMatch(/const nakshatraModifier = getNakshatraModifier\(dominantNak\)/);
  });

  it("the majority star is NOT lost — it still reaches the model", () => {
    // He needs both: the day is named at sunrise, and the reading covers both halves. The majority
    // star travels as starTurn.rulesMostOfDay so the model can still say which one holds the day.
    const builder = readFileSync(new URL("../narrative/input-builder.ts", import.meta.url), "utf8");
    expect(builder).toMatch(/rulesMostOfDay: field\.nakshatra/);
  });

  it("the two-part reading is untouched by this", () => {
    // The turn data and its law are independent of the naming. If a later edit couples them, the
    // reading would start describing only the half the day is named for.
    const builder = readFileSync(new URL("../narrative/input-builder.ts", import.meta.url), "utf8");
    expect(builder).toMatch(/fromStar: \(field as any\)\.nakshatraAtSunrise/);
    expect(builder).toMatch(/toStar: \(field as any\)\.nakshatraAfterTransition/);
  });
});
