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

/**
 * A law is DEFINED when its heading starts a line — not when its name appears somewhere in the
 * text. Every cross-reference in this prompt quotes the heading verbatim ('See "X" below.'), so a
 * bare `toContain(name)` is satisfied by the pointer alone and stays green while the definition it
 * points at is renamed or deleted. Found by mutation probe at v841; it is the same shape as the
 * assertion in bell-ladder.test.ts that matched a word in a comment instead of the call.
 */
function defines(prompt: string, heading: string): boolean {
  return new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(prompt);
}

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
    // DEFINED, not merely mentioned. A MUTATION PROBE (v841) renamed the section heading itself and
    // this test still passed, because BASE_PROMPT also contains the CROSS-REFERENCE
    // ('See "PERSONAL APEX — THE CROWN DAY" below.') and toContain cannot tell a pointer from a
    // definition. That is the v805 defect exactly — a tail citing a law that is no longer stated —
    // so the test written to prevent it was blind to it. defines() below is the fix, and it is used
    // for every law in this file: a heading counts only when it starts its own line.
    expect(defines(BASE_PROMPT, "PERSONAL APEX — THE CROWN DAY")).toBe(true);
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

describe("no tail cites a law the model does not receive (v825)", () => {
  // The reach audit found NO SINGLE MOVE deleted along with GLANCE_TAIL while two tails still cited
  // it BY NAME — a dangling pointer in a shipped prompt, the same defect v819 set out to remove and
  // created again in the same commit. Every law CITED by a tail must be present in the prompt the
  // model actually receives.
  it("BASE_PROMPT carries NO SINGLE MOVE, which two tails cite by name", async () => {
    const { BASE_PROMPT, DAY_READ_TAIL, LIFE_AREA_TAIL } = await import("./prompts.js");
    expect(DAY_READ_TAIL).toContain("NO SINGLE MOVE");
    expect(LIFE_AREA_TAIL).toContain("NO SINGLE MOVE");
    expect(BASE_PROMPT).toContain("NO SINGLE MOVE. The guidance is the day");
  });

  it("PROMPT_VERSION was bumped when the shared laws came back", async () => {
    // Restoring a law into BASE_PROMPT reaches nothing already cached unless this moves — the cache
    // key is keyed on it. A restoration that cannot reach a cached reading is not a restoration.
    //
    // The `not.toBe` on its own PASSES WHEN THE EXPORT IS GONE (v841 mutation probe): deleting
    // PROMPT_VERSION makes it undefined, and undefined is indeed not that string. A negative
    // assertion alone can never prove a value arrived — it has to be pinned positively first.
    const { PROMPT_VERSION } = await import("./prompts.js");
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}-/);
    expect(PROMPT_VERSION).not.toBe("2026-07-18-audit4-law-reconcile");
  });

  it("the 2nd house does not default to self-love, and never says self-worth", async () => {
    // David's standing law: the 2nd is money, livelihood and belief FIRST. Self-worth is the second
    // face, surfaced only when a self-planet actually links to the 2nd.
    //
    // This assertion used to live in quarantine.test.ts, guarding the dead meaning-engine that
    // contradicted it. When David ruled "delete it" at v851 I deleted the module AND its describe
    // block — and took the only guard on the law with it. A mutation probe caught that the doctrine
    // could be removed from prompts.ts with the whole suite green. Deleting a stale thing must not
    // delete the rule it was violating.
    // I first asserted both halves against BASE_PROMPT and it failed — the fuller rule lives in
    // DEEP_READ_TAIL. Before reporting that as a reach gap I checked what BASE_PROMPT actually
    // says, and it carries the law in its own words: the 2nd leads with earned money and
    // possessions, and worth is read THROUGH them, "never as a bare label". So every read is
    // covered and there was no gap to report. Asserting each where it genuinely lives.
    const { BASE_PROMPT, DEEP_READ_TAIL } = await import("./prompts.js");
    expect(BASE_PROMPT).toMatch(/earned money and possessions/);
    expect(BASE_PROMPT).toMatch(/never as a bare label/);
    expect(BASE_PROMPT).toMatch(/not\s+a feeling to announce/);
    // David's rename, 2026-07-21: the second face is SELF-LOVE, and "self-worth" is banned
    // vocabulary. "Worth" prices a person and drags the self-help register in behind it.
    expect(DEEP_READ_TAIL).toMatch(/do NOT reach for\s+"worth"\s+or\s+"self-love"\s+as a default theme/);
    expect(DEEP_READ_TAIL).toMatch(/NEVER WRITE "SELF-WORTH"/);
    expect(DEEP_READ_TAIL).toMatch(/second face of the 2nd is SELF-LOVE/);
    expect(DEEP_READ_TAIL).toMatch(/2nd house = MONEY/);
  });

  it("the polar and no-single-move laws are DEFINED too, not just cited", async () => {
    // Same probe, same fix, applied to the rest of the shared laws rather than only the one that
    // happened to be caught. Fixing the instance is what let v805 recur as v825.
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(defines(BASE_PROMPT, "WHEN THE SUN DID NOT RISE")).toBe(true);
    expect(BASE_PROMPT).toMatch(/^NO SINGLE MOVE\./m);
    expect(defines(BASE_PROMPT, "RECENT READS — ONE CONTINUING STORY, NEVER THE SAME PAGE TWICE")).toBe(true);
  });

  it("never orders a blanket fusion — the kind decides how hard two planets merge (v885)", () => {
    // The defect: "A conjunction is NOT two separate placements — read the planets as ONE fused
    // body" was stated over a list built at orb <= 10°, with no sign test. On the maker's chart
    // that ordered the model to fuse a Pisces planet with an Aries one while every sign-based
    // module in the engine read them as unrelated. The instruction must now branch on `kind`.
    expect(SRC).not.toContain("A conjunction is\nNOT two separate placements");
    for (const kind of ["same-party", "through-the-wall", "across-the-room"]) {
      expect(SRC, `the prompt must say how to voice a ${kind} contact`).toContain(`kind "${kind}"`);
    }
    // Only the agreed kind may be told to fuse.
    expect(SRC).toMatch(/kind "same-party"[\s\S]{0,400}ONE fused body/);
    // And the machinery must be banned from the prose the reader sees.
    expect(SRC).toMatch(/NEVER print the words "same-party", "through-the-wall", "across-the-room"/);
  });
});
