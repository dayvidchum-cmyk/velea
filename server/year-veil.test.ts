import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE VEILED YEAR MUST NOT LEAK A FUTURE DATE (2026-07-22).
 *
 * crown.forYear serves the ranked solar year. The ranked year is deterministic (no LLM), so the
 * PAST is free for everyone (the time-gate doctrine: the past builds faith); the FUTURE is the
 * premium jewel. A free (non-entitled) user gets a VEILED year — past-through-today real, today-
 * forward stripped SERVER-SIDE so the client can't leak what it never receives (the arc-veil
 * pattern). This guard, a static scan in that same spirit, pins the two things that keep it honest:
 *   1. today is computed from the USER'S location (localToday), never from a client-sent date — a
 *      forged "future today" would otherwise unlock the very year the gate protects.
 *   2. both the day marks AND the crown list (topDates) are cut to `<= today`.
 * Plus the mirror check: the entitled branch still returns the WHOLE year (no accidental veil-all).
 */
const SRC = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
// The crown.forYear query body — from its declaration to the sibling `dignities:` procedure.
const start = SRC.indexOf("forYear: protectedProcedure");
const block = SRC.slice(start, SRC.indexOf("dignities: protectedProcedure", start));

describe("crown.forYear veils the future for the non-entitled", () => {
  it("has the query", () => {
    expect(start).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(0);
  });

  it("computes today from the user's location, not a client-sent date", () => {
    expect(block).toMatch(/localToday\(/);
    // The date the strip compares against must be the server-computed `today`, not anything off input.
    expect(block).toMatch(/const today = localToday\(/);
  });

  it("strips the day marks to the past (<= today)", () => {
    expect(block).toMatch(/full\.days[\s\S]*?\.filter\(\([^)]*\)\s*=>\s*[^)]*\.date <= today\)/);
  });

  it("strips the crown list (topDates) to the past (<= today)", () => {
    expect(block).toMatch(/topDates:\s*allTop\.filter\(\([^)]*\)\s*=>\s*[^)]*<= today\)/);
  });

  it("marks the payload non-entitled so the client renders the veil", () => {
    expect(block).toMatch(/entitled:\s*false as const/);
  });

  it("still hands the entitled user the WHOLE year (no veil-all)", () => {
    expect(block).toMatch(/if \(entitled\) return \{ entitled: true as const, \.\.\.full \}/);
  });
});
