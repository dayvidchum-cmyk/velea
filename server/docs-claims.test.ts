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

  // PIN THE FACT, NOT THE PROSE (v827). The first version of this guard matched exact sentences,
  // and it fired the moment I REWORDED a correction that was still fully present. A guard that
  // taxes editing gets edited away. These match the concrete, non-negotiable detail of each
  // correction — the thing that cannot be reworded without changing what is being said.
  it.each([
    ["v794's claim was false", /panchang\.mode = undefined/],
    ["...and says so in capitals", /FALSE/],
    ["v805 orphaned the crown doctrine", /(orphan|broke it again)[\s\S]{0,600}(crown|GLANCE_TAIL)/i],
    ["the NO SINGLE MOVE law came back", /NO SINGLE MOVE/],
    ["the cap's unit vs its number", /(MIS-CALIBRATED|unit and left)/i],
    ["the reach audit is recorded", /REACH AUDIT/i],
    ["a self-audit is recorded", /RE-AUDITED|self-audit/i],
    ["PROMPT_VERSION reaching cached readings", /PROMPT_VERSION/],
  ])("keeps the correction: %s", (_label, re) => {
    expect(SHEET).toMatch(re);
  });

  it("keeps a header correction that COUNTS my own failures", () => {
    // The number changes as more are found; that it is stated at all must not.
    expect(SHEET).toMatch(/(\w+) of my own (claims or )?fixes[\s\S]{0,80}(wrong|landed nowhere)/i);
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
