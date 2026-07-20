import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE TWO-PART DAY (David's doctrine, 2026-07-20).
 *
 * "A standard daily horoscope does not stay frozen at sunrise; it changes the exact moment the Moon
 * shifts into a new star… an accurate Vedic horoscope will often say 'Favorable for creative work
 * until 3:00 PM, after which focus shifts to health and diet.' Most generic apps look at whichever
 * Nakshatra occupies the majority of the day and write the horoscope based on that single star.
 * This is why daily horoscopes can sometimes feel inaccurate or 'off' during the morning or evening."
 *
 * Velea was doing the thing he describes as wrong. The model received `nakshatra` — the MAJORITY
 * star — and nothing else. It also received `turnsAtNote`, but that sentence is emitted only when
 * the crossing CHANGES THE MODE, so on every transition day where the mode holds, the model never
 * learned the star turned at all.
 *
 * WHAT THIS FILE GUARDS IS THE FIELD NAMES, and that is not incidental. My first version read
 * field.sunriseNak / .afterNak / .transitionTime — those are the names used INSIDE finishDayMode's
 * options object, NOT the names on the object it returns. It typechecked (they were cast `as any`),
 * it would have emitted null on every day forever, and I would have reported the two-part day as
 * wired. The returned object calls them nakshatraAtSunrise / nakshatraAfterTransition /
 * nakshatraTransitionTime.
 *
 * Runtime verification needs a database this environment does not have, so this asserts the two
 * sides against each other structurally rather than claiming a behaviour I could not observe.
 */
const BUILDER = readFileSync(new URL("./input-builder.ts", import.meta.url), "utf8");
const SERVICE = readFileSync(new URL("../panchang/service.ts", import.meta.url), "utf8");

describe("the model is told the day turns, and when", () => {
  it("the payload carries starTurn, BOUND to the panchang field", () => {
    // A mutation probe rewrote `atLocalTime: (field as any).nakshatraTransitionTime` to
    // `atLocalTime: null` and this test stayed green, because it only checked that the KEY existed.
    // That is the decorative-assertion class exactly: a key name proves nothing about what flows
    // through it. Each field is now asserted against its source expression.
    expect(BUILDER).toMatch(/starTurn:/);
    expect(BUILDER).toMatch(/fromStar:\s*\(field as any\)\.nakshatraAtSunrise/);
    expect(BUILDER).toMatch(/toStar:\s*\(field as any\)\.nakshatraAfterTransition/);
    expect(BUILDER).toMatch(/atLocalTime:\s*\(field as any\)\.nakshatraTransitionTime/);
    expect(BUILDER).toMatch(/rulesMostOfDay:\s*field\.nakshatra/);
  });

  it("reads the names the panchang field ACTUALLY returns", () => {
    for (const name of ["nakshatraAtSunrise", "nakshatraAfterTransition", "nakshatraTransitionTime"]) {
      expect(BUILDER, `input-builder must read ${name}`).toContain(name);
      // and the same name must be a key on the object the service returns
      expect(SERVICE, `${name} must be returned by the panchang field`).toMatch(
        new RegExp(`^\\s*${name},?\\s*$|^\\s*${name}:`, "m"),
      );
    }
  });

  it("does NOT use the option-side names that only exist inside finishDayMode", () => {
    // The exact mistake. These are real identifiers in service.ts — as OPTIONS — so a grep for them
    // succeeds and proves nothing.
    //
    // My first version of THIS assertion then failed against correct code, because the builder's
    // comment explains the mistake by naming it. An assertion that cannot tell a comment from a
    // call is not asserting what it claims — the identical flaw I fixed in bell-ladder.test.ts and
    // reproduced here. Comments are stripped before the check.
    const code = BUILDER.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const wrong of ["sunriseNak", "afterNak", "transitionTime"]) {
      expect(code, `${wrong} is the option-side name`).not.toMatch(
        new RegExp(`\\)\\.${wrong}\\b`),
      );
    }
  });

  it("still carries the majority star, because the day is still named by one star", () => {
    // The two-part reading does not replace the day's name; it describes the turn inside it.
    expect(BUILDER).toMatch(/rulesMostOfDay:/);
  });

  it("is null on days that do not turn — no empty scaffolding in the prompt", () => {
    expect(BUILDER).toMatch(/nakshatraAfterTransition && \(field as any\)\.nakshatraTransitionTime/);
    expect(BUILDER).toMatch(/:\s*null,/);
  });
});

describe("the law ARRIVES — the data is useless without it (v855)", () => {
  // The whole point of this run's reach findings: a field the model receives and has no instruction
  // about is a field that changes nothing. Shipping starTurn without this law would have been the
  // same defect I have been cataloguing all day, committed knowingly.
  it("BASE_PROMPT defines the two-part law as its own section", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(/^THE DAY THAT TURNS — READ IT IN TWO PARTS\.$/m.test(BASE_PROMPT)).toBe(true);
  });

  it("tells the model every field starTurn actually carries", async () => {
    // A law naming a field the payload does not emit is the mirror failure — the model told to
    // expect data it never gets. These four are exactly what input-builder sends.
    const { BASE_PROMPT } = await import("./prompts.js");
    for (const k of ["fromStar", "toStar", "atLocalTime", "rulesMostOfDay"]) {
      expect(BASE_PROMPT, `law must explain ${k}`).toContain(k);
    }
  });

  it("orders the model to name the hour, and forbids flattening to the majority", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(BASE_PROMPT).toMatch(/NAME THE HOUR/);
    expect(BASE_PROMPT).toMatch(/Do NOT flatten the day into whichever star holds the majority/);
  });

  it("handles the absent case, so non-turning days invent nothing", async () => {
    const { BASE_PROMPT } = await import("./prompts.js");
    expect(BASE_PROMPT).toMatch(/When starTurn is ABSENT/);
  });

  it("PROMPT_VERSION moved, or the law reaches no cached reading", async () => {
    const { PROMPT_VERSION } = await import("./prompts.js");
    expect(PROMPT_VERSION).toBe("2026-07-20-two-part-day");
  });
});
