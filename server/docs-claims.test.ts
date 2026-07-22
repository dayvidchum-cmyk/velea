import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE DOCUMENTS MUST CARRY WHAT THE COMMITS CLAIM THEY CARRY (v824; relean v924).
 *
 * The audit sheet and the working brief are how David sees this work — the sheet is the state of the
 * WORK (open issues, his calls, the fixed record collapsed), the brief is the state of the APP and
 * the live to-do list. On 2026-07-22 he asked for both to be leaned to only the open, the
 * waiting-on-him, and the threads to pick back up, with the fixed record stored out of his eyes but
 * not deleted. This guard follows that structure: the things that must never silently vanish — the
 * open issues, the decisions he owes an answer to, and my own corrections — are pinned; the prose is
 * free to change. It pins the FACT, not the phrase.
 */
const SHEET = readFileSync(new URL("../tools/audit-sheet/index.html", import.meta.url), "utf8");
const BRIEF = readFileSync(new URL("../tools/working-brief/index.html", import.meta.url), "utf8");
// The full forensic version and every correction live in the archives the sheet links to. RECORD is
// anywhere a correction may live; SHEET is what David actually opens.
const ARCHIVE = readFileSync(new URL("../tools/audit-sheet/archive-longform-v848.html", import.meta.url), "utf8");
const BRIEF_ARCHIVE = readFileSync(new URL("../tools/working-brief/archive-longform-v848.html", import.meta.url), "utf8");
const RECORD = SHEET + ARCHIVE + BRIEF + BRIEF_ARCHIVE;

describe("the audit sheet still says what is open, in reconciling numbers", () => {
  const tile = (label: string) => {
    const m = SHEET.match(new RegExp(`<div class="n[^"]*">(\\d+)</div><div class="l">${label}`));
    return m ? Number(m[1]) : null;
  };

  it("still says out loud that the work is not finished", () => {
    // Non-zero open issues AND non-zero decisions still waiting — both as numbers he can see.
    expect(SHEET).toMatch(/<div class="n bad">([1-9]\d*)<\/div><div class="l">Open issues/);
    expect(SHEET).toMatch(/<div class="n warn">([1-9]\d*)<\/div><div class="l">Your call/);
  });

  it("the open-issue tile reconciles with the rows rendered", () => {
    const open = tile("Open issues");
    expect(open).not.toBeNull();
    // Every open issue carries a tag; the count of tag rows must equal the tile.
    const tagRows = (SHEET.match(/<span class="tag">(?:DATA|MONEY|BUILD|READ|LOOK)<\/span>/g) ?? []).length;
    expect(tagRows).toBe(open);
  });

  it("the decision cards reconcile with the heading that owns them", () => {
    const asks = Number(SHEET.match(/What I need from you — (\d+)/)![1]);
    expect((SHEET.match(/<div class="ask"[ >]/g) ?? []).length).toBe(asks);
    // and the "Your call" tile advertises that same number.
    expect(tile("Your call")).toBe(asks);
  });

  it("points at the archive, so the fixed record is stored not deleted", () => {
    expect(SHEET).toContain("archive-longform-v848.html");
    expect(SHEET).toMatch(/nothing was deleted/i);
    // The fixed work is kept for reference (collapsed), not dropped.
    expect(SHEET).toMatch(/Fixed &amp; verified|Fixed &amp; settled/i);
  });

  it("owns up, in its own words, where I was wrong", () => {
    expect(SHEET).toMatch(/Where I was wrong/i);
    expect(SHEET).toMatch(/guarding nothing/i);
  });
});

describe("both living pages agree on the live decisions and the open calls", () => {
  it("both carry the TWO live decisions", () => {
    for (const [name, doc] of [["sheet", SHEET], ["brief", BRIEF]] as const) {
      expect(doc, `${name} lost the live-decisions framing`).toMatch(/two live decisions/i);
      expect(doc, `${name} lost Full Spectrum → mode colour`).toMatch(/Full Spectrum → mode colour/i);
      expect(doc, `${name} lost the dark-mode decision`).toMatch(/dark[- ]mode/i);
    }
  });

  // The OPEN calls David owes an answer to — pinned by the ONE word that cannot change without
  // changing the question, on BOTH pages, so neither can quietly drop one.
  it.each([
    ["how loudly a Siddha yoga speaks", /Siddha Yoga/i],
    ["Lang's birth data", /Lang's birth data/i],
    ["the eclipse before/after guidance", /eclipse (day|today)|before vs after/i],
    ["the knot thresholds", /knot threshold/i],
    ["the crown mark's spec gaps", /crown mark/i],
    ["the crown mark's gold-on-gold contrast", /gold on a gold coin/i],
    ["parchment ink in dark mode", /Parchment ink/i],
    ["the chip rename", /Roots &amp; Ancestry|Roots & Ancestry/i],
    ["set the price", /Set the price/i],
    ["stripe keys", /Stripe keys/i],
    ["wire or delete the precision layer", /precision layer/i],
  ])("keeps the open call: %s", (_label, re) => {
    expect(SHEET, "missing from the audit sheet").toMatch(re);
    expect(BRIEF, "missing from the working brief").toMatch(re);
  });
});

describe("the corrections survive, pinned to the fact", () => {
  // These are the non-negotiable details of each correction I made to my OWN earlier claims — kept
  // in the record (sheet's collapsed section and/or the archive), never quietly rewritten.
  it.each([
    ["v794's claim was false", /panchang\.mode = undefined/],
    ["...and says so in capitals", /FALSE/],
    ["v805 orphaned the crown doctrine", /(orphan|broke it again)[\s\S]{0,600}(crown|GLANCE_TAIL)/i],
    ["the NO SINGLE MOVE law came back", /NO SINGLE MOVE/],
    ["the cap's unit vs its number", /MIS-CALIBRATED/i],
    ["the reach audit is recorded", /REACH AUDIT/i],
    ["a self-audit is recorded", /RE-AUDITED|self-audit/i],
    ["PROMPT_VERSION reaching cached readings", /PROMPT_VERSION/],
    ["the interpreter.ts file I named never existed", /interpreter\.ts.{0,60}(does not exist|never opened)/i],
  ])("keeps the correction: %s", (_label, re) => {
    expect(RECORD).toMatch(re);
  });
});
