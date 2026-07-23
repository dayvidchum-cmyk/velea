import { describe, it, expect } from "vitest";
import { gradeRecovery, rulesAngleOrTrine, recoveryState, neechaBhanga } from "./dignity.js";

/**
 * THE RECOVERY CONTINUUM (David 2026-07-23) — neecha bhanga graded, not binary.
 *
 * These pin the ARCHITECTURE (the shape of the continuum + the NBRY gate), not the exact weights —
 * the weights are David's first curve, tuned by looking (recovery-scan.ts). So the tests assert
 * ordering, gating, and boundaries that must hold however the numbers move; a weight change he makes
 * should not turn these red unless it breaks the shape.
 */

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const mid = (sign: string) => ZOD.indexOf(sign) * 30 + 15;

describe("gradeRecovery — the pure fold (structural × functional → band)", () => {
  it("a bare-2 cancellation, unbacked, is only PARTIAL recovery", () => {
    const r = gradeRecovery({ count: 2, solid: false, important: false });
    expect(r.band).toBe("partial");
    expect(r.isNBRY).toBe(false);
  });

  it("more classical conditions climb the continuum", () => {
    const two = gradeRecovery({ count: 2, solid: false, important: false }).confidence;
    const three = gradeRecovery({ count: 3, solid: true, important: false }).confidence;
    const four = gradeRecovery({ count: 4, solid: true, important: false }).confidence;
    expect(three).toBeGreaterThan(two);
    expect(four).toBeGreaterThan(three);
  });

  it("functional strength MOVES the band — shadbala backing lifts, thinness/combust drag", () => {
    const base = gradeRecovery({ count: 3, solid: true, important: false }).confidence;
    const backed = gradeRecovery({ count: 3, solid: true, important: false, impair: { shadbalaRatio: 1.3 } }).confidence;
    const thin = gradeRecovery({ count: 3, solid: true, important: false, impair: { shadbalaRatio: 0.7 } }).confidence;
    const burnt = gradeRecovery({ count: 3, solid: true, important: false, impair: { combust: true } }).confidence;
    expect(backed).toBeGreaterThan(base);
    expect(thin).toBeLessThan(base);
    expect(burnt).toBeLessThan(base);
    // The whole point of Layer 3: a structurally-cancelled fall can still be functionally weak.
    expect(gradeRecovery({ count: 3, solid: true, important: false, impair: { shadbalaRatio: 0.7 } }).band)
      .not.toBe(gradeRecovery({ count: 3, solid: true, important: false, impair: { shadbalaRatio: 1.3 } }).band);
  });

  it("EXCEPTIONAL (NBRY) gates on strong + solid + important + not-burnt — never a bare high score", () => {
    const full = { count: 4, solid: true, important: true, rescuerDignity: "dignified" as const, impair: { shadbalaRatio: 1.3 } as const };
    expect(gradeRecovery(full).band).toBe("exceptional");
    expect(gradeRecovery(full).isNBRY).toBe(true);
    // Same strength, but NOT an angle/trine lord → caps at operational, no raja yoga.
    expect(gradeRecovery({ ...full, important: false }).isNBRY).toBe(false);
    expect(gradeRecovery({ ...full, important: false }).band).toBe("operational");
    // Same strength, but burnt → the functional impairment blocks the top band.
    expect(gradeRecovery({ ...full, impair: { shadbalaRatio: 1.3, combust: true } }).isNBRY).toBe(false);
    // Same score, but the structural rescue isn't solid → not a raja yoga.
    expect(gradeRecovery({ ...full, solid: false }).isNBRY).toBe(false);
  });

  it("a fallen rescuer weakens the rescue; a dignified one strengthens it", () => {
    const neutral = gradeRecovery({ count: 3, solid: true, important: false }).confidence;
    const dignified = gradeRecovery({ count: 3, solid: true, important: false, rescuerDignity: "dignified" }).confidence;
    const fallen = gradeRecovery({ count: 3, solid: true, important: false, rescuerDignity: "fallen" }).confidence;
    expect(dignified).toBeGreaterThan(neutral);
    expect(fallen).toBeLessThan(neutral);
  });
});

describe("rulesAngleOrTrine — the functional-importance (raja-yoga) gate", () => {
  it("reads angle/trine lordship from the lagna", () => {
    const aries = mid("Aries");
    expect(rulesAngleOrTrine("Sun", aries)).toBe(true);    // Leo = 5th (trine)
    expect(rulesAngleOrTrine("Saturn", aries)).toBe(true); // Capricorn = 10th (angle)
    expect(rulesAngleOrTrine("Mars", aries)).toBe(true);   // Aries = 1st
    expect(rulesAngleOrTrine("Mercury", aries)).toBe(false); // Gemini 3rd + Virgo 6th — neither
  });
});

describe("recoveryState — geometry → band", () => {
  it("an UNCANCELLED fall is the continuum's floor (strong-friction)", () => {
    // Jupiter debilitated in Capricorn with no rescuer in a kendra and no dispositor aspect.
    const chart: Record<string, number> = {
      Sun: mid("Aries") + 10, Moon: mid("Gemini"), Mars: mid("Aries") + 5,
      Mercury: mid("Aries") - 5, Jupiter: mid("Capricorn"), Venus: mid("Libra") + 5, Saturn: mid("Libra"),
    };
    const lagna = mid("Taurus");
    // CONTROL: prove the fixture really is an uncancelled fall before trusting the band.
    expect(neechaBhanga("Jupiter" as any, chart as any, lagna).cancelled, "fixture must be UNcancelled").toBe(false);
    const r = recoveryState("Jupiter" as any, chart as any, lagna);
    expect(r.band).toBe("strong-friction");
    expect(r.isNBRY).toBe(false);
  });

  it("shadbala shifts the band for the SAME cancelled geometry (Layer 3 is real)", () => {
    // David's Moon: debilitated in Scorpio, cancelled — dispositor Mars in the 1st, exalt-lord Venus
    // in a kendra. Virgo lagna. (Fixture control-checked below; the point is the L3 sensitivity.)
    const chart: Record<string, number> = {
      Sun: mid("Leo"), Moon: ZOD.indexOf("Scorpio") * 30 + 25, Mars: mid("Virgo"),
      Mercury: mid("Leo") + 5, Jupiter: mid("Aquarius"), Venus: mid("Gemini"), Saturn: mid("Aquarius") + 5,
    };
    const lagna = mid("Virgo");
    const nb = neechaBhanga("Moon" as any, chart as any, lagna);
    if (nb.cancelled) {
      const backed = recoveryState("Moon" as any, chart as any, lagna, { shadbalaRatio: 1.3 });
      const thin = recoveryState("Moon" as any, chart as any, lagna, { shadbalaRatio: 0.7 });
      expect(backed.confidence).toBeGreaterThan(thin.confidence);
      expect(["partial", "substantial", "operational", "exceptional"]).toContain(backed.band);
    } else {
      // If the fixture doesn't cancel, the geometry needs revisiting — fail loudly, don't skip.
      expect(nb.cancelled, "David's-Moon fixture should cancel; adjust the fixture").toBe(true);
    }
  });
});
