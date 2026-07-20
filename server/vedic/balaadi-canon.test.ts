import { describe, it, expect, vi } from "vitest";
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

describe("the guard fails CLOSED, not open (v819)", () => {
  // The v816 guard counted keys, and the consumer reads `BALAADI_FRUIT[bal] ?? 1`. A null value or
  // a renamed key therefore scored 1.0 — full fruition — which on `mrita` (canon: nil) is the exact
  // inversion of the dial it claims to protect. Found by a regression hunt over my own run.
  const load = async (states: any) => {
    vi.resetModules();
    vi.doMock("./canon/avashtas.json", () => ({ default: { balaadi: { states } } }));
    return import("./verdict.js");
  };
  const GOOD = {
    bala: { fruition: 0.25 }, kumara: { fruition: 0.5 }, yuva: { fruition: 1 },
    vriddha: { fruition: 0.125 }, mrita: { fruition: 0.05 },
  };

  it("loads with a well-formed block", async () => {
    await expect(load(GOOD)).resolves.toBeTruthy();
  });

  it("REFUSES a null fruition instead of scoring it 1.0", async () => {
    await expect(load({ ...GOOD, mrita: { fruition: null } })).rejects.toThrow(/mrita/);
  });

  it("REFUSES a renamed state instead of falling through to 1.0", async () => {
    const { yuva, ...rest } = GOOD as any;
    await expect(load({ ...rest, yuvaa: { fruition: 1 } })).rejects.toThrow(/yuva/);
  });

  it("REFUSES a value outside [0,1]", async () => {
    await expect(load({ ...GOOD, bala: { fruition: 4 } })).rejects.toThrow(/bala/);
  });

  it("still refuses a missing block entirely", async () => {
    await expect(load(undefined)).rejects.toThrow();
  });
});
