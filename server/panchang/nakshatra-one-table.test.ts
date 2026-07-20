import { describe, it, expect } from "vitest";
import { calculateFinalMode } from "./interpreter.js";
import { NAKSHATRA_MODIFIERS } from "./modifier-config.js";

// ONE TABLE. The engine's live nakshatra direction must equal the CITED, corrected table
// (David's ruling 2026-07-20: the cited tables win). interpreter.ts used to keep private
// copies, so a correction to NAKSHATRA_MODIFIERS never reached a single reading.
const EXPECT: Record<string, RegExp> = {
  Upgrade:   /supports expansion\/outward movement \(\+1\)/,
  Downgrade: /supports containment\/correction \(-1\)/,
  Selective: /supports precision\/selective action/,
  Neutral:   /is neutral \(no mode shift\)/,
};
const reasonFor = (star: string) =>
  JSON.stringify(calculateFinalMode("Build", star, "Panchami", "Shukla"));

describe("the nakshatra direction the ENGINE uses is the cited table", () => {
  it("ANCHOR — the harness actually reads the live reason string", () => {
    // Bharani already agrees in both tables, so this must pass before AND after the fix.
    expect(reasonFor("Bharani")).toMatch(EXPECT.Downgrade);
    // and must NOT match a different category — proves the regex discriminates
    expect(reasonFor("Bharani")).not.toMatch(EXPECT.Upgrade);
  });

  it("all 27 stars: live direction === cited table category", () => {
    const wrong: string[] = [];
    for (const [star, { category }] of Object.entries(NAKSHATRA_MODIFIERS)) {
      if (!EXPECT[category].test(reasonFor(star))) wrong.push(`${star} (expected ${category})`);
    }
    expect(Object.keys(NAKSHATRA_MODIFIERS)).toHaveLength(27); // denominator
    expect(wrong).toEqual([]);
  });
});
