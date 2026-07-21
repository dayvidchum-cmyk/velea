import { describe, it, expect } from "vitest";
import { vetoViolation, guardViolation } from "./generate";

// THE VETO LANDS ONCE (David, 2026-07-21). Both halves come from real pulls he read side by side:
// one dropped Vishti entirely, another stated the same order four times, and a third named the
// Sanskrit mechanism the prompt had always told it not to name.
const read = (p: Partial<Record<"scene" | "story" | "tilt" | "closeLine" | "question", string>>) => ({
  scene: "", story: "", tilt: "", closeLine: "", question: "", ...p,
}) as any;

describe("the veto must land — and land once", () => {
  it("a vishti day whose prose never says 'nothing new begins' is rejected", () => {
    const r = read({
      scene: "The day splits at 11:19 AM.",
      story: "Venus is running low, asking to be restored.",
      tilt: "Give the morning to the craft and let the afternoon be small.",
      closeLine: "The morning is for making; the afternoon for tending.",
    });
    expect(vetoViolation(r, true)).toMatch(/DROPPED THE DAY'S VETO/);
  });

  // THE CONTROL. The same prose on a NON-vishti day must pass, or the guard is just noise that
  // fires on everything.
  it("the identical prose on a non-vishti day is fine", () => {
    const r = read({
      scene: "The day splits at 11:19 AM.",
      story: "Venus is running low, asking to be restored.",
      tilt: "Give the morning to the craft and let the afternoon be small.",
      closeLine: "The morning is for making; the afternoon for tending.",
    });
    expect(vetoViolation(r, false)).toBeNull();
  });

  it("saying it once satisfies the veto", () => {
    const r = read({
      scene: "The day splits at 11:19 AM.",
      story: "Venus is running low.",
      tilt: "Nothing new begins today — continue, complete, repair.",
      closeLine: "The morning is for making.",
    });
    expect(vetoViolation(r, true)).toBeNull();
  });

  it("saying it twice in the middle is rejected as repetition", () => {
    const r = read({
      scene: "Nothing new starts today.",
      story: "Venus is running low.",
      tilt: "Nothing is launched today.",
      closeLine: "The morning is for making.",
    });
    expect(vetoViolation(r, true)).toMatch(/YOU SAID IT 2 TIMES/);
  });

  // DAVID'S CORRECTION TO MY FIRST RULE. I wanted it once anywhere; he ruled the closing line and
  // question SHOULD mirror the verdict, because the reader meets them last, going down the screen
  // in time. So an echo in the close is a seal, not a repetition — and must never be penalised.
  it("the closing line may echo the verdict — that is the seal, not a repetition", () => {
    const r = read({
      scene: "The day splits at 11:19 AM.",
      story: "Venus is running low.",
      tilt: "Nothing new begins today — continue, complete, repair.",
      closeLine: "Nothing new begins today; the morning is for the hands.",
      question: "What would you finish, since nothing new starts?",
    });
    expect(vetoViolation(r, true)).toBeNull();
  });

  it("David's four-times draft is caught", () => {
    const r = read({
      scene: "Nothing new starts, nothing gets severed.",
      story: "Venus is running low.",
      tilt: "Nothing is launched today. Do not begin anything.",
      closeLine: "Let the outcome wait.",
    });
    expect(vetoViolation(r, true)).toMatch(/YOU SAID IT/);
  });
});

// prompts.ts always said "the words are in your throat, not 'Vishti karana'" — and nothing
// enforced it, so "Vishti karana seals it: finish, don't start" shipped, as did "the afternoon
// tara withdraws its goodwill".
describe("the mechanism names are banned, not merely discouraged", () => {
  for (const leak of [
    "Vishti karana seals it: finish, don't start.",
    "After 11:19 the tara withdraws its goodwill.",
    "Her dasha turns this year.",
    "The tithi favours completion.",
    "Saturn sits in your lagna.",
  ]) {
    it(`rejects: ${leak}`, () => {
      expect(guardViolation(leak, 200)).toMatch(/BANNED CHART JARGON/);
    });
  }

  it("still allows the planets themselves — they are the characters, not the machinery", () => {
    expect(guardViolation("Venus is running low, and Saturn holds her close.", 200)).toBeNull();
  });

  // The surfaces that are explicitly mechanics-allowed keep their jargon.
  it("a mechanics-allowed surface may name them", () => {
    expect(guardViolation("Vishti karana blocks beginnings.", 200, undefined, true)).toBeNull();
  });
});
