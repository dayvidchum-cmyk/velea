import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE BRIEF MUST CARRY WHAT THE COMMITS CLAIM IT CARRIES (v824; relean v924; MERGED v930).
 *
 * The audit sheet and the working brief were folded into ONE document (David, 2026-07-22 — "the audit
 * sheet and working brief can be folded into one"). `tools/working-brief/index.html` is now the single
 * living page: the app, the work, and his calls, with a ruling box under everything that needs one. The
 * old audit sheet is a stub pointing here; its forensic archive still holds the long record.
 *
 * This guard follows that structure. The things that must never silently vanish — the open issues, the
 * decisions he owes an answer to, and my own corrections — are pinned; the prose is free to change. It
 * pins the FACT, not the phrase.
 */
const BRIEF = readFileSync(new URL("../tools/working-brief/index.html", import.meta.url), "utf8");
const VERSION_SRC = readFileSync(new URL("../client/src/lib/version.ts", import.meta.url), "utf8");
const APP_VERSION = VERSION_SRC.match(/APP_VERSION\s*=\s*"([^"]+)"/)![1];
// Every correction to my own earlier claims lives in the record: the brief's collapsed section and the
// two forensic archives the brief links to. RECORD is anywhere a correction may live.
const ARCHIVE = readFileSync(new URL("../tools/audit-sheet/archive-longform-v848.html", import.meta.url), "utf8");
const BRIEF_ARCHIVE = readFileSync(new URL("../tools/working-brief/archive-longform-v848.html", import.meta.url), "utf8");
const RECORD = BRIEF + ARCHIVE + BRIEF_ARCHIVE;

describe("the brief still says what is open, in reconciling numbers", () => {
  const tile = (label: string) => {
    const m = BRIEF.match(new RegExp(`<div class="n[^"]*">(\\d+)</div><div class="l">${label}`));
    return m ? Number(m[1]) : null;
  };

  it("shows the LIVE app version at the top — always current (David, 2026-07-22)", () => {
    // The brief must list the most current version at the top, always. Coupled to APP_VERSION so a
    // release that forgets to update the brief fails here. The version badge sits before the sub line.
    const header = BRIEF.slice(0, BRIEF.indexOf('class="sub"'));
    expect(header, `the brief header must show the live version v${APP_VERSION}`).toContain(APP_VERSION);
    expect(BRIEF).toMatch(/class="ver">Live:/);
  });

  it("still says out loud that the work is not finished", () => {
    expect(BRIEF).toMatch(/<div class="n bad">([1-9]\d*)<\/div><div class="l">Open issues/);
    expect(BRIEF).toMatch(/<div class="n warn">([1-9]\d*)<\/div><div class="l">Your calls/);
  });

  it("the open-issue tile reconciles with the rows rendered", () => {
    const open = tile("Open issues");
    expect(open).not.toBeNull();
    // Every open issue carries a tag; the count of tag rows must equal the tile.
    const tagRows = (BRIEF.match(/<span class="tag">(?:DATA|MONEY|BUILD|READ|LOOK|AUDIT)<\/span>/g) ?? []).length;
    expect(tagRows).toBe(open);
  });

  it("every open call has a ruling box to answer in", () => {
    // The interactive contract (David, 2026-07-22): anything needing his call carries a textarea.
    const boxes = (BRIEF.match(/<textarea data-q=/g) ?? []).length;
    expect(boxes, "the ruling boxes vanished — the brief is no longer interactive").toBeGreaterThan(10);
    expect(BRIEF, "lost the copy-my-rulings action").toMatch(/Copy my rulings/i);
  });

  it("points at the archive, so the fixed record is stored not deleted", () => {
    expect(BRIEF).toContain("archive-longform-v848.html");
    expect(BRIEF).toMatch(/nothing was deleted/i);
    expect(BRIEF).toMatch(/Fixed &amp; verified|Fixed &amp; settled/i);
  });

  it("owns up, in its own words, where I was wrong", () => {
    expect(BRIEF).toMatch(/Where I was wrong/i);
  });

  it("carries the doctrine — the Principle, the five gates, the two live decisions", () => {
    expect(BRIEF).toMatch(/Velea Principle/i);
    expect(BRIEF).toMatch(/five release gates/i);
    expect(BRIEF).toMatch(/two live decisions/i);
    expect(BRIEF).toMatch(/Full Spectrum → mode colour/i);
    expect(BRIEF).toMatch(/dark[- ]mode/i);
  });
});

describe("the open calls David owes an answer to are all still on the page", () => {
  // Pinned by the ONE word that cannot change without changing the question.
  it.each([
    ["how loudly a Siddha yoga speaks", /Siddha Yoga/i],
    ["the eclipse before/after guidance", /eclipse.{0,40}before vs after|before vs after/i],
    ["the knot thresholds", /knot threshold/i],
    ["the crown mark's spec gaps", /crown mark/i],
    ["the crown mark's gold-on-gold contrast", /gold on a gold coin/i],
    ["parchment ink in dark mode", /Parchment ink/i],
    ["the chip rename", /Roots &amp; Ancestry|Roots & Ancestry/i],
    ["futura vs optima", /Futura/i],
    ["set the price", /Set the price/i],
    ["stripe keys", /Stripe keys/i],
    ["wire or delete the precision layer", /precision layer/i],
  ])("keeps the open call: %s", (_label, re) => {
    expect(BRIEF, "missing from the brief").toMatch(re);
  });
});

describe("the corrections survive, pinned to the fact", () => {
  // The non-negotiable details of each correction I made to my OWN earlier claims — kept in the record
  // (the brief's collapsed section and/or the archives), never quietly rewritten.
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
