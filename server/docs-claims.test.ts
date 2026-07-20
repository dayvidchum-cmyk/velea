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
// v849: David said the sheet was confusing to read, so the long forensic form — including every
// correction I made to my own claims — moved to an archive file that the sheet links to. The
// corrections were NOT dropped, so this guard follows them instead of being loosened. RECORD is
// where a correction may live; SHEET is what he actually opens.
const ARCHIVE = readFileSync(new URL("../tools/audit-sheet/archive-longform-v848.html", import.meta.url), "utf8");
// The BRIEF was rewritten in the same pass, and its long form needed archiving too — this test
// caught that I had preserved the sheet's history and let the brief's corrections fall out of the
// record entirely. Archiving one of two is not archiving.
const BRIEF_ARCHIVE = readFileSync(new URL("../tools/working-brief/archive-longform-v848.html", import.meta.url), "utf8");
const RECORD = SHEET + ARCHIVE + BRIEF + BRIEF_ARCHIVE;

describe("the audit sheet still says what it must", () => {
  it("still says out loud that the work is not finished", () => {
    // Was toContain("not clear") against the old prose. Same fact, pinned to the new page: a
    // non-zero broken count and a non-zero decision count, both stated as numbers he can see.
    expect(SHEET).toMatch(/<div class="n bad">([1-9]\d*)<\/div><div class="l">Still broken/);
    expect(SHEET).toMatch(/<div class="n warn">([1-9]\d*)<\/div><div class="l">Your call/);
  });

  it("points at the archive, so the long form is findable and not merely gone", () => {
    expect(SHEET).toContain("archive-longform-v848.html");
    expect(SHEET).toMatch(/nothing was deleted/i);
  });

  it("the counts on the page reconcile with each other", () => {
    const n = (label: string) => Number(SHEET.match(new RegExp(`<div class="n[^"]*">(\\d+)</div><div class="l">${label}`))![1]);
    const fixed = n("Fixed"), broken = n("Still broken"), asks = n("Your call");
    expect(SHEET).toContain(`${fixed} fixed + ${broken} broken`);
    // the decision cards rendered must equal the number advertised at the top
    // Count cards by CLASS, not by the exact tag text — adding a style attribute to one card made
    // this miss it and report 14 against a header of 15. The guard was right that they disagreed;
    // it was my counter that was brittle.
    expect((SHEET.match(/<div class="ask"[ >]/g) ?? []).length).toBe(asks);
    // and the broken list must have as many rows as it claims
    expect((SHEET.match(/<span class="tag">(?:DATA|MONEY|BUILD|READ|LOOK)<\/span>/g) ?? []).length).toBe(broken);
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
    expect(RECORD).toMatch(re);
  });

  it("keeps a correction that COUNTS my own failures", () => {
    // The number changes as more are found; that it is stated at all must not.
    expect(RECORD).toMatch(/(\w+) of my own (claims or )?fixes[\s\S]{0,80}(wrong|landed nowhere)/i);
  });

  it("the reader-facing page still owns up, in its own words", () => {
    // The archive holds the detail, but he should not have to open it to learn I was wrong.
    expect(SHEET).toMatch(/Where I was wrong/i);
    expect(SHEET).toMatch(/my own tests were guarding nothing/i);
    // PIN THE FACT, NOT THE PHRASE — third time this file has taught me that. What must survive is
    // that the page states how far the broken count has actually been VERIFIED, not the wording it
    // uses to say so.
    expect(SHEET).toMatch(/upper bound/i);
    expect(SHEET).toMatch(/re-check|not been individually re-checked/i);
  });
});

describe("both documents carry the same open decisions", () => {
  // PIN THE FACT, NOT THE PROSE — the same lesson this file already learned at v827, relearned at
  // v849 when the readability rewrite reworded every decision and eight assertions fired on wording
  // while the decisions were all still there. These match on the ONE word that cannot change
  // without changing the question, and they check BOTH pages, because the pages disagreeing about
  // what David owes an answer to is exactly the bug this rewrite fixed.
  // OPEN decisions must appear on BOTH pages. David asked (2026-07-20) that a decision come OFF the
  // queue once he has ruled — "take it off if it is fixed… less friction for me to process" — so
  // this list is now the OPEN set only, and the resolved ones are asserted separately below.
  it.each([
    ["the cancelled-fall rules", /cancelled-fall/i],
    ["which yogas the reader hears", /yogas/i],
    ["the knot thresholds", /knot threshold/i],
    ["the crown mark's missing pieces", /Siddhi/i],
    ["the crown mark's colour", /gold on a gold coin/i],
    ["the dark-parchment ink", /Parchment ink/i],
    ["the chip rename", /Roots &amp; Ancestry|Roots & Ancestry/i],
    ["set the price", /Set the price/i],
    ["stripe keys", /Stripe keys/i],
    ["the schema reconcile", /schema reconcile/i],
    ["wire or delete the precision layer", /precision layer/i],
  ])("keeps the OPEN decision: %s", (_label, re) => {
    expect(SHEET, "missing from the audit sheet").toMatch(re);
    expect(BRIEF, "missing from the working brief").toMatch(re);
  });

  // A decision may leave the queue ONLY because it was RESOLVED — never because it was forgotten.
  // Each of these must still be recorded, in one line, where he can see what was decided.
  it.each([
    ["which house is parents", /both stay/i],
    ["which nakshatra table wins", /the cited tables/i],
    ["when a day becomes its star", /named at sunrise/i],
    ["mrita: 0.05 or the canon's nil", /0\.05 as/i],
    ["a chartless day's character", /no birth data means no app/i],
    ["delete or rebuild meaning-engine", /meaning-engine.{0,40}deleted/i],
    ["should the nature drive every star", /neither\.<\/b> They are favourable/i],
    // Was an OPEN row until v870. It had been ruled on AND shipped, but the open-list regex was
    // loose enough (`NAMED.{0,20}sunrise`) to match the RESOLVED line instead — so the sheet passed
    // spuriously while the brief, which had correctly dropped it, failed. The regex below is
    // anchored to the verdict, which cannot match a question.
    ["naming the day by sunrise", /Named by the sunrise star<\/b> — <b>yes, and done/i],
  ])("still RECORDS the settled decision: %s", (_label, re) => {
    expect(SHEET, "a settled decision vanished instead of being recorded").toMatch(re);
  });

  it("both pages advertise the SAME number of decisions", () => {
    const sheetN = Number(SHEET.match(/<div class="n warn">(\d+)<\/div>/)![1]);
    const briefN = Number(BRIEF.match(/Your decisions — (\d+)/)![1]);
    expect(briefN).toBe(sheetN);
  });

  it("the durable cap is still visible, even though it is parked not decided", () => {
    // It waits on a schema change rather than on a choice, so it moved out of the decision list.
    // Moved is fine; disappeared is not.
    expect(SHEET).toMatch(/durable generation cap/i);
  });

  it("keeps the v794 correction rather than the original claim", () => {
    // Lives in the record now — the brief is the state of the APP, not of my mistakes.
    expect(RECORD).toContain("my claim about the narrative was FALSE");
  });
});
