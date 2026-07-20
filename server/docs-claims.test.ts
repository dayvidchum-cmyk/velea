import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE DOCUMENTS MUST CARRY WHAT THE COMMITS CLAIM THEY CARRY (v824).
 *
 * The audit sheet and the working brief are how David sees this work. They are edited by scripts,
 * and on 2026-07-20 one of those scripts died on an assertion AFTER its intended change and BEFORE
 * writing the file — while I read the retry's success line as confirmation that everything had
 * landed. I then told him the header carried a correction it did not carry.
 *
 * That is the reach failure in its purest form, committed while writing up the reach audit. This is
 * the guard: a claim I make about these documents is only true if it is IN them, and the suite says
 * so on every run rather than on the day I remember to look.
 *
 * Deliberately narrow. It pins the CORRECTIONS and the OPEN DECISIONS — the two things that must
 * never silently vanish — not the prose, which should stay free to change.
 */
const SHEET = readFileSync(new URL("../tools/audit-sheet/index.html", import.meta.url), "utf8");
const BRIEF = readFileSync(new URL("../tools/working-brief/index.html", import.meta.url), "utf8");

describe("the audit sheet still says what it must", () => {
  it("declares itself NOT clear", () => {
    expect(SHEET).toContain("not clear");
  });

  it.each([
    ["v794's claim was false", "my claim about the narrative was FALSE"],
    ["v805 orphaned the crown doctrine", "BROKEN AGAIN BY ME IN v805"],
    ["v806 mis-calibrated the cap", "MIS-CALIBRATED BY ME"],
    ["the reach audit is recorded", "THE REACH AUDIT"],
    ["the first self-audit is recorded", "MY OWN RUN, RE-AUDITED"],
  ])("keeps the correction: %s", (_label, needle) => {
    expect(SHEET).toContain(needle);
  });

  it("keeps the header correction naming my own failures", () => {
    expect(SHEET).toContain("seven of my own fixes were wrong or landed nowhere");
  });
});

describe("the working brief still carries every open decision", () => {
  it.each([
    ["neecha bhanga conditions", "Which neecha bhanga conditions are Velea"],
    ["the crown mark's colour", "The crown mark's colour"],
    ["the dark-parchment ink", "The dark-parchment ink"],
    ["a chartless day's character", "What is a CHARTLESS day's character"],
    ["the durable cap", "The durable generation cap"],
    ["mrita vs the canon's nil", "mrita: 0.05 or the canon"],
    ["which nakshatra table wins", "Which nakshatra table wins"],
    ["which yogas the reader hears", "Which yogas does the reader actually hear"],
  ])("keeps the decision: %s", (_label, needle) => {
    expect(BRIEF).toContain(needle);
  });

  it("keeps the v794 correction rather than the original claim", () => {
    expect(BRIEF).toContain("my claim about the narrative was FALSE");
  });
});
