import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { calcPanchang } from "./astronomy.js";
import { interpretPanchang } from "./interpreter.js";

/**
 * DOES THE POLAR FLAG ACTUALLY ARRIVE? (v820)
 *
 * v801 computed `noSunrise` and gave it to NOBODY — the field was set on AstronomyData and no line
 * of code ever read it. The commit said "the fabrication is now visible". Visible to whom? That is
 * the same failure the v819 self-audit found twice over: I verify the MECHANISM and not the REACH.
 *
 * So this test does not check that the flag is computed — polar-sunrise.test.ts already does. It
 * checks that it ARRIVES: on the DayField, in the narrative input (conditionally), and in a prompt
 * that tells the model what to do with it. A value that reaches nothing is not a fix.
 */
const SVALBARD = { lat: 78.22, lon: 15.65, tz: 1 };
const BOSTON = { lat: 42.36, lon: -71.06, tz: -5 };
const INPUT_BUILDER = readFileSync(new URL("../narrative/input-builder.ts", import.meta.url), "utf8");
const PROMPTS = readFileSync(new URL("../narrative/prompts.ts", import.meta.url), "utf8");

describe("the polar flag reaches something", () => {
  it("arrives on the DayField, not just on the astronomy object", async () => {
    const astro = await calcPanchang("2026-12-21", SVALBARD.lat, SVALBARD.lon, SVALBARD.tz);
    expect((astro as any).noSunrise).toBe("polar-night");
    const field: any = interpretPanchang(astro as any, "Aries");
    // NO FALLBACK. My first version of this line read `field.noSunrise ?? astro.noSunrise`, which
    // passed while interpretPanchang carried NOTHING — a probe that could not fail, checking the
    // very thing it was meant to prove. That is the third construction site of a DayField and I
    // had wired the other two. Asserted directly now.
    expect(field.noSunrise).toBe("polar-night");
  });

  it("is spread into the narrative input ONLY when set", () => {
    // A `noSunrise: null` on every ordinary day would change the input JSON for every user on
    // earth and regenerate every cached reading to say nothing. The conditional spread is the
    // whole reason this is safe to ship.
    expect(INPUT_BUILDER).toMatch(/\.\.\.\(\(field as any\)\.noSunrise \? \{ noSunrise: \(field as any\)\.noSunrise \} : \{\}\)/);
  });

  it("the prompt tells the model what to do with it", () => {
    // Without this the field is decoration — present in the JSON, meaningless to the reader.
    expect(PROMPTS).toContain("WHEN THE SUN DID NOT RISE");
    expect(PROMPTS).toContain("panchang.noSunrise");
    // And it must tell the model to stay silent when absent, or every ordinary day risks a caveat.
    expect(PROMPTS).toMatch(/if you do not see it, this does not apply and you say nothing/);
  });

  it("says nothing at a latitude where the Sun rises — the denominator", async () => {
    const astro = await calcPanchang("2026-12-21", BOSTON.lat, BOSTON.lon, BOSTON.tz);
    expect((astro as any).noSunrise).toBeNull();
    const field: any = interpretPanchang(astro as any, "Aries");
    expect(field.noSunrise ?? null).toBeNull();
  });
});
