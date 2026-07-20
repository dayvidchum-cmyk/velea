import { describe, it, expect } from "vitest";
import avashtas from "./canon/avashtas.json";
import { readFileSync } from "node:fs";

/**
 * THE BALAADI DIAL IS READ FROM CANON, NOT RE-TYPED (v816).
 *
 * verdict.ts cited canon/avashtas.json for the fruition fractions and that file did not contain
 * them — they were a bare literal in the module, and the citation was decoration. That is the same
 * "cited but not executed" class as the karakas drift, on the dial that decides whether a chart
 * reads "late" or "late if at all".
 *
 * The block now exists with each state's classical wording beside its number, and the engine reads
 * it. Two of the five numbers are deliberately NOT the corpus's, and the file says so out loud —
 * this test pins that honesty so a later reader cannot mistake a decision for a transcription.
 */
const B = (avashtas as any).balaadi;
const VERDICT_SRC = readFileSync(new URL("./verdict.ts", import.meta.url), "utf8");

describe("balaadi fruition", () => {
  it("lives in the canon file the engine cites", () => {
    expect(B?.states).toBeTruthy();
    expect(Object.keys(B.states).sort()).toEqual(["bala", "kumara", "mrita", "vriddha", "yuva"]);
  });

  it("is READ by verdict.ts rather than re-typed there", () => {
    expect(VERDICT_SRC).toContain('import avashtasCanon from "./canon/avashtas.json"');
    // The old literal must be gone, or the canon file is decoration again.
    expect(VERDICT_SRC).not.toMatch(/bala:\s*0\.25,\s*kumara:\s*0\.5/);
  });

  it("matches the corpus where the corpus is explicit", () => {
    expect(B.states.bala.fruition).toBe(0.25);    // "one fourth"
    expect(B.states.kumara.fruition).toBe(0.5);   // "one half"
    expect(B.states.yuva.fruition).toBe(1);       // "full"
  });

  it("declares the two numbers that are OURS, not the book's", () => {
    // vriddha: the canon says "very little" and names no fraction.
    expect(B.states.vriddha.canon).toBe("very little");
    expect(B.states.vriddha.deviation).toBeTruthy();
    // mrita: the canon says nil. 0.05 is a deliberate non-zero.
    expect(B.states.mrita.canon).toBe("nil");
    expect(B.states.mrita.fruition).toBeGreaterThan(0);
    expect(B.states.mrita.deviation).toMatch(/NIL/);
  });

  it("keeps the states that DO match marked as no deviation — the denominator", () => {
    // If every state carried a deviation note the flag would mean nothing.
    for (const k of ["bala", "kumara", "yuva"]) expect(B.states[k].deviation).toBeNull();
  });

  it("orders the fruition monotonically down from adult", () => {
    // A sanity anchor: whatever the numbers become, an infant and a corpse cannot out-yield an adult.
    const s = B.states;
    expect(s.yuva.fruition).toBeGreaterThan(s.kumara.fruition);
    expect(s.kumara.fruition).toBeGreaterThan(s.bala.fruition);
    expect(s.bala.fruition).toBeGreaterThan(s.vriddha.fruition);
    expect(s.vriddha.fruition).toBeGreaterThan(s.mrita.fruition);
  });
});
