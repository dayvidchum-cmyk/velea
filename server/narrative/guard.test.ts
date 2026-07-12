import { describe, it, expect } from "vitest";
import { guardViolation } from "./generate";

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
