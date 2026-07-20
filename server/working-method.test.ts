import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * CLAUDE.md IS THE MECHANISM, NOT A NOTE.
 *
 * David, 2026-07-20: "how do i ensure you work in the manner you have been working in? where you
 * test and probe, never take a green as truth, checking all the work before you declare it is
 * fixed?" — and then, after I made the same class of mistake again an hour later: "well fix it so
 * when i close this terminal and start a new conversation you don't fuck up and waste time."
 *
 * The answer must never be "he types a longer prompt." CLAUDE.md loads automatically in every
 * session opened in this repo, so it is the only thing standing between a fresh context and the
 * mistakes below. This test exists so it cannot be deleted, emptied, or quietly hollowed out —
 * the laws are pinned by MEANING, not by wording, so the file can be rewritten but not defanged.
 */

const PATH = new URL("../CLAUDE.md", import.meta.url);

describe("the working method survives a fresh session", () => {
  it("CLAUDE.md exists at the repo root, where it auto-loads", () => {
    expect(existsSync(PATH), "CLAUDE.md is gone — a new session gets no method at all").toBe(true);
  });

  const md = existsSync(PATH) ? readFileSync(PATH, "utf8") : "";

  it("is substantial enough to actually say something", () => {
    expect(md.length).toBeGreaterThan(2000);
  });

  // Each entry is a law that cost David real time when it was missing. The regex pins the IDEA.
  it.each([
    ["data accuracy outranks cosmetics", /accuracy of the data|never outranks a data fix/i],
    ["never trust a passing test", /never take a green as truth|passing test proves nothing/i],
    ["every guard gets a mutation probe", /probe/i],
    ["gate on the build's exit code, not grep", /exit code/i],
    ["run the control before the conclusion", /control before the conclusion|control/i],
    ["never state a value you have not printed", /never state a value you have not printed/i],
    ["an unrun search is not evidence of absence", /unrun search is not evidence/i],
    ["fix the class, not the instance", /fix the class/i],
    ["never encode a guess into a chart", /do not encode a\s*\n?guess|never guess/i],
    ["flag only what needs his authority", /needs his authority/i],
    ["'fixed' means deployed", /built, tested, probed/i],
    ["no auto-migrations", /no auto-migrations/i],
    ["look at every visual shipped", /visual/i],
  ])("still carries the law: %s", (_label, re) => {
    expect(md, "this law was dropped from CLAUDE.md").toMatch(re);
  });

  it("keeps the receipts — the laws are evidenced, not just asserted", () => {
    // Stripped of the concrete failures, these read as generic advice and get skimmed. The specific
    // ones are what make a fresh session believe them.
    // EACH RECEIPT PINNED SEPARATELY, ON TEXT THAT APPEARS ONCE. The first version of this test
    // matched /exalts in Libra/ — which occurs TWICE in that passage, so a probe that deleted the
    // receipt line still passed. It SURVIVED the mutation harness, which is the whole reason the
    // harness exists: a guard satisfied by half the evidence is not a guard.
    // Pinned at BOTH ends: the concrete example and the sentence naming the error. Removing either
    // half guts the receipt, so a guard on only one half is half a guard — the mutation harness
    // caught exactly that, twice, before this line looked like this.
    expect(md, "the wrong example was dropped").toMatch(/`Venus \(exalts in Libra\)`/);
    expect(md, "the ruler/exaltation receipt was dropped").toMatch(/Conflated ruler with exaltation/i);
    expect(md, "the uncited-source receipt was dropped").toMatch(/I had never opened it/i);
    expect(md, "the four-condition fixture receipt was dropped").toMatch(/actually fired \*\*four\*\*/i);
    expect(md, "the production-script receipt was dropped").toMatch(/trusting that line/i);
  });

  it("names the priority order in the order David gave it", () => {
    const data = md.search(/Accuracy of the data/i);
    const money = md.search(/money could bleed/i);
    const pixels = md.search(/Colours, margins, pixels/i);
    expect(data).toBeGreaterThan(-1);
    expect(money).toBeGreaterThan(data);
    expect(pixels).toBeGreaterThan(money);
  });
});
