import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE LAW MUST NOT LIVE INSIDE A FIELD DESCRIPTION (v804).
 *
 * The RECENT READS doctrine — the entire anti-repetition law, written after the 2026-07-10
 * "wallpaper era" when the same essay ran four mornings straight — had been pasted into the MIDDLE
 * of the personalApex field gloss, after an opening double-quote that never closed on that line.
 * The model read: 'isCrown TRUE = a rare peak day. See "RECENT READS — ONE CONTINUING STORY…' then
 * 37 lines of doctrine, then '…PERSONAL APEX — THE CROWN DAY" in the glance task.'
 *
 * So roughly 855 tokens of law were presented as the CONTENTS OF A CROSS-REFERENCE, and the crown
 * reference the sentence was actually making was severed across 40 lines. It had been that way
 * since 07-10 and survived four audits.
 *
 * This reads the raw file rather than a built prompt: the defect is textual position, which is
 * exactly what a structural assertion can see and a behavioural one cannot.
 */
const SRC = readFileSync(new URL("./prompts.ts", import.meta.url), "utf8");
const HEADING = "RECENT READS — ONE CONTINUING STORY, NEVER THE SAME PAGE TWICE";

describe("the prompt's structure", () => {
  it("keeps the crown cross-reference whole", () => {
    // The sentence must point at the crown section, not open a quote it never closes.
    // v819: this used to assert the pointer read "in the glance task" — which, after v805 deleted
    // the glance, was a pointer to a section no prompt carried. The test was DEFENDING the
    // regression. It now asserts the doctrine is present in the prompt that cites it.
    expect(SRC).toContain('See "PERSONAL APEX — THE CROWN DAY" below.');
    expect(SRC).not.toContain("in the glance task");
    expect(SRC).not.toContain("as the glance defines it");
    expect(SRC).not.toContain(`See "${HEADING}`);
  });

  it("states the RECENT READS doctrine as a top-level section, at the start of a line", () => {
    const occurrences = SRC.split(HEADING).length - 1;
    expect(occurrences).toBeGreaterThan(0);
    // Every occurrence must begin its own line — an indented one is inside a field gloss.
    const re = new RegExp(`^${HEADING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gm");
    expect(SRC.match(re)?.length).toBe(occurrences);
  });

  it("still contains the doctrine's teeth — this is a move, not a delete", () => {
    for (const line of [
      "This person's days are chapters of ONE story",
      "Omission is never compliance.",
      "When recentReads is empty, none of this constrains you",
    ]) {
      expect(SRC).toContain(line);
    }
  });

  it("does not leave an unterminated quote in the personalApex gloss", () => {
    const gloss = SRC.slice(SRC.indexOf("  personalApex: {"), SRC.indexOf("- profection: {"));
    // An even number of double quotes in the block means nothing is left hanging open.
    expect((gloss.match(/"/g) ?? []).length % 2).toBe(0);
  });
});

describe("the laws ARRIVE, not just appear in the file (v823)", () => {
  // Every finding of this run's reach audit had the same shape: the change was correct in its own
  // file and landed nowhere. A structural assertion over prompts.ts cannot tell the difference —
  // GLANCE_TAIL was in the file too, and nothing sent it. These import the built prompt and ask
  // what the MODEL actually receives.
  it("BASE_PROMPT carries the anti-repetition law, its teeth and its escape hatch", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(BASE_PROMPT).toContain("This person's days are chapters of ONE story");
    expect(BASE_PROMPT).toContain("Omission is never compliance.");
    expect(BASE_PROMPT).toContain("When recentReads is empty, none of this constrains you");
  });

  it("BASE_PROMPT carries the crown doctrine — orphaned by v805, restored in v819", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(BASE_PROMPT).toContain("PERSONAL APEX — THE CROWN DAY");
    expect(BASE_PROMPT).toContain("a crown, not confetti");
    expect(BASE_PROMPT).not.toContain("in the glance task");
  });

  it("BASE_PROMPT carries the polar rule — computed in v801, delivered in v820", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(BASE_PROMPT).toContain("WHEN THE SUN DID NOT RISE");
    expect(BASE_PROMPT).toContain("panchang.noSunrise");
  });

  it("the day read still carries its own prosperity rule", async () => {
    // It does NOT live in BASE_PROMPT, and it must not be assumed to — that assumption is exactly
    // what made the crown doctrine vanish for four commits.
    const { DAY_READ_TAIL } = await import("./prompts.js");
    expect(DAY_READ_TAIL).toContain("PROSPERITY DAY");
  });
});
