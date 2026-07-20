import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LIFE_AREAS } from "./life-areas.js";

/**
 * PARENTS ARE NOT ROOTS (David's ruling, 2026-07-20).
 *
 * Two live systems both answered "parents" and both used the word "roots":
 *   knots.ts      — houses [4, 9], karakas Moon/Sun/Jupiter, labelled "Parents / roots"
 *   life-areas.ts — house 12 with the nodes, chip labelled "Parents & Roots"
 *
 * I put this to him as "pick one". He did not pick one — he said BOTH ARE CORRECT, because they
 * answer different questions: "4th and 9th are specifically mother and father. Ancestry is roots,
 * and that should cover any role parents play into the concept of roots. Ancestry is also what your
 * parents inherited, which you in turn inherited."
 *
 * So the defect was never that one of them was wrong. It was that BOTH claimed BOTH WORDS, which
 * let the model fold two distinct readings into one theme. These tests pin the separation.
 */

const KNOTS = readFileSync(new URL("./knots.ts", import.meta.url), "utf8");

describe("the two readings stay distinct", () => {
  it("the convergence engine's theme is the PARENTS themselves, on 4 and 9", () => {
    expect(KNOTS).toMatch(/parents:\s*\{ label: "Parents — mother and father", houses: \[4, 9\]/);
  });

  it("…and no longer also claims the word 'roots'", () => {
    // The old label was "Parents / roots". Both systems saying "roots" is the conflation.
    expect(KNOTS).not.toContain('label: "Parents / roots"');
  });

  it("the life-area lens leads with ANCESTRY, not with the word parents", () => {
    const d = LIFE_AREAS.parents.domain;
    expect(d).toMatch(/^ancestry and roots/i);
    expect(d).toMatch(/inherited/i);
  });

  it("the lens still reads the 12th through the nodes — his ruling kept it", () => {
    expect(LIFE_AREAS.parents.primaryHouse).toBe(12);
    expect(LIFE_AREAS.parents.karakas.map((k) => k.planet).sort()).toEqual(["Ketu", "Rahu"]);
  });

  it("mother and father are still named where they belong", () => {
    // The ruling does not erase the parents-as-people reading; it puts it in one place.
    expect(KNOTS).toMatch(/karakas: \["Moon", "Sun", "Jupiter"\]/);
  });
});
