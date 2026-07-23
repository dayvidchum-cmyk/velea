import { describe, it, expect } from "vitest";
import { guardViolation, scrubMachinery } from "./generate";

// These prove — deterministically, no LLM, no spend — that the two failure modes David kept
// hitting (chart-machinery leaks and over-length reads) are CAUGHT in code and regenerated,
// not shipped. If any of these fail, the guard has a hole and the bad read would reach the user.

describe("guardViolation — chart-machinery leaks are rejected", () => {
  const cases: [string, string][] = [
    ["house number", "The Moon sits in your 9th house of belief and reach."],
    ["ordinal-word house", "Saturn is in the first house of the body and the self."],
    ["exalted", "The Moon is exalted and generous today."],
    ["debilitated", "Venus is debilitated and running low."],
    ["retrograde", "Mercury is home and retrograde, hiding out."],
    ["combust", "Mercury is combust, swallowed by the Sun."],
    ["sign name — Scorpio", "The natal Moon, hard-won in Scorpio, runs the year."],
    ["sign name — Gemini", "Mercury is home in Gemini right now."],
  ];
  for (const [label, text] of cases) {
    it(`rejects: ${label}`, () => {
      expect(guardViolation(text, 120)).toMatch(/BANNED CHART JARGON/);
    });
  }
});

describe("guardViolation — clean prose passes", () => {
  it("allows planet names + plain felt language (no machinery)", () => {
    const clean =
      "The Moon is having her best day of the month — clear-headed and generous, holding the door " +
      "open on everything you mean to say. Jupiter's parked in his favorite spot, fat and happy over " +
      "your money and your people; go draw from that well. Mercury's home but three drinks in, hiding " +
      "in a back room — let the words cook. And Venus is running on fumes; she's not asking to be " +
      "spent, she's asking to be refilled.";
    expect(guardViolation(clean, 120)).toBeNull();
  });
});

describe("scrubMachinery — the deterministic last-resort net (nothing model-dependent)", () => {
  // The retries catch most leaks; this GUARANTEES a dignity/motion term stubborn across every retry
  // still can't reach the reader. Regression anchor: "debilitation" shipped in an Aug-12 Money read.
  it("removes the exact term that leaked (debilitation) and reads clean", () => {
    const leaked = "Mars in the deep chart sits in a position of debilitation and withdrawal.";
    const scrubbed = scrubMachinery(leaked);
    expect(scrubbed).not.toMatch(/debilitat/i);
    expect(scrubbed).toBe("Mars in the deep chart sits in a position of weakness and withdrawal.");
  });
  it("neutralizes the whole dignity/motion family", () => {
    const s = scrubMachinery("Jupiter is exalted; Mercury is retrograde and combust; Venus is debilitated.");
    for (const banned of [/exalt/i, /retrograde/i, /combust/i, /debilitat/i]) expect(s).not.toMatch(banned);
  });
  it("leaves clean prose untouched", () => {
    const clean = "The floor holds — today is for finding the drain, not opening a new tap.";
    expect(scrubMachinery(clean)).toBe(clean);
  });
  it("the scrubbed output passes guardViolation's machinery check", () => {
    const scrubbed = scrubMachinery("Venus is debilitated; the Moon is exalted.");
    // (No house numbers / sign names here, so a machinery-clean scrub yields a clean guard result.)
    expect(guardViolation(scrubbed, 120)).toBeNull();
  });
  // OVER-SCRUB REGRESSION (David: "fix the scrub overreach"). Half the sign names are also
  // everyday words / common names; the sign scrub must never mangle ordinary prose. Before the
  // fix, "recovering from cancer" → "…from that ground", "Leo asked" → " asked", "from Aries
  // in accounting" → "from that ground…". The scrub now touches only never-a-word signs.
  it("never mangles a sign-name homograph used as an ordinary word or name", () => {
    for (const clean of [
      "recovering from cancer needs your patience.",
      "Cancer scares are easing; the body settles.",
      "Leo asked you to look again at the work.",
      "reading about Gemini missions kept him up.",
      "walked into Leo's office and sat down.",
      "from Aries in accounting, the news was good.",
      "a Libra on the team, and the Age of Aquarius.",
    ]) expect(scrubMachinery(clean)).toBe(clean);
  });
  it("still scrubs the unambiguous sign names (never ordinary words)", () => {
    expect(scrubMachinery("your deep Scorpio channel")).not.toMatch(/Scorpio/);
    expect(scrubMachinery("delivering through Sagittarius today")).not.toMatch(/Sagittarius/);
    expect(scrubMachinery("sitting in Pisces")).not.toMatch(/Pisces/);
  });
});

describe("guardViolation — over-length reads are rejected", () => {
  it("rejects a read past the word cap", () => {
    const longText = Array.from({ length: 140 }, (_, i) => `word${i}`).join(" ");
    expect(guardViolation(longText, 120)).toMatch(/TOO LONG/);
  });
  it("passes a read at the cap", () => {
    const okText = Array.from({ length: 118 }, (_, i) => `word${i}`).join(" ");
    expect(guardViolation(okText, 120)).toBeNull();
  });
});

describe("guardViolation — the day-sentence restatement ban (David's law 3, enforced)", () => {
  it("rejects prose containing the day headline; passes clean prose", () => {
    const headline = "a cutting day built for work";
    expect(guardViolation("This is a cutting day built for work, not warmth.", 200, [headline])).toMatch(/RESTATED THE DAY SENTENCE/);
    expect(guardViolation("Jupiter is glowing over your circle today.", 200, [headline])).toBeNull();
    expect(guardViolation("Any prose at all.", 200, [])).toBeNull();
  });
});

describe("guardViolation — the fate ban, which was enforced NOWHERE", () => {
  // "the path is COMPUTED, NOT FIXED" is the brand's own metaphysics and the reason "destined" is
  // banned in copy. BASE_PROMPT bends fate-verbs back into the reader's hands, but the words
  // themselves appeared in no tail's ban list, in no guard and in no scrub — so a decree could
  // ship. Found by auditing the law-by-tail matrix, 2026-07-20.
  it("rejects a decree about this person, on every surface", () => {
    expect(guardViolation("You were destined for this work.", 200)).toMatch(/DOES NOT DEAL IN FATE/);
    expect(guardViolation("She is fated to meet him again.", 200)).toMatch(/DOES NOT DEAL IN FATE/);
    // ...INCLUDING the surfaces that are allowed their machinery: the atlas and the house explorer
    // may name a sign, never a fate.
    expect(guardViolation("Your predestined year in Scorpio.", 200, [], true)).toMatch(/DOES NOT DEAL IN FATE/);
  });

  it("leaves the tradition's own vocabulary alone — the ban is the DECREE, not the noun", () => {
    // CONTROL in the other direction. Without this, widening the regex to /fate|destiny/ would
    // pass the test above while silently banning half the glossary.
    expect(guardViolation("Karma is the ledger, not a sentence handed down.", 200)).toBeNull();
    expect(guardViolation("What you do with the season is yours.", 200)).toBeNull();
    expect(guardViolation("The destiny point in this tradition is Rahu.", 200)).toBeNull();
  });
});
