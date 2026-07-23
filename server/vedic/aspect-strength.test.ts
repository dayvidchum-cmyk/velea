import { describe, it, expect } from "vitest";
import {
  aspectInfluence,
  resolveInfluenceState,
  INFLUENCE_FLOOR,
} from "./aspect-strength.js";
import { sputaDrishti } from "./shadbala.js";

describe("resolveInfluenceState — the virupa→state first curve", () => {
  it("resolves each band by its floor", () => {
    expect(resolveInfluenceState(60)).toBe("dominant"); // the 7th, full gaze
    expect(resolveInfluenceState(48)).toBe("dominant");
    expect(resolveInfluenceState(47.9)).toBe("strong");
    expect(resolveInfluenceState(36)).toBe("strong");
    expect(resolveInfluenceState(24)).toBe("moderate");
    expect(resolveInfluenceState(12)).toBe("growing");
    expect(resolveInfluenceState(INFLUENCE_FLOOR)).toBe("weak");
  });

  it("returns null below the floor (the curve's tail is not an aspect)", () => {
    expect(resolveInfluenceState(INFLUENCE_FLOOR - 0.01)).toBeNull();
    expect(resolveInfluenceState(0)).toBeNull();
  });

  it("agrees with the classical curve at the cardinal arcs", () => {
    // These are the sputaDrishti outputs (p.315) the state must resolve — trust the engine's curve.
    expect(resolveInfluenceState(sputaDrishti(180))).toBe("dominant"); // 60 — the 7th
    expect(resolveInfluenceState(sputaDrishti(90))).toBe("strong");    // 45
    expect(resolveInfluenceState(sputaDrishti(120))).toBe("moderate"); // 30
    expect(resolveInfluenceState(sputaDrishti(60))).toBe("growing");   // 15
    expect(resolveInfluenceState(sputaDrishti(150))).toBeNull();       // 0 — no gaze
    expect(resolveInfluenceState(sputaDrishti(29))).toBeNull();        // 0 — inside the null cone
  });
});

describe("aspectInfluence — resolved gaze + direction of travel", () => {
  it("the exact 7th (180° arc) reads dominant", () => {
    const a = aspectInfluence(0, 1, 180);
    expect(a).not.toBeNull();
    expect(a!.state).toBe("dominant");
    expect(a!.virupas).toBe(60);
  });

  it("no gaze inside the null cone (< 30° arc) is null", () => {
    expect(aspectInfluence(0, 1, 20)).toBeNull();
    expect(aspectInfluence(0, 1, 5)).toBeNull();
  });

  it("FORMING when the gaze is strengthening (arc closing toward the 7th)", () => {
    // aspecter at 0 moving +1/day, target at 181: arc 181 → 180, drishti 59.5 → 60 (rising).
    const a = aspectInfluence(0, 1, 181);
    expect(a!.trend).toBe("forming");
  });

  it("SEPARATING when the gaze is weakening (arc opening past the 7th)", () => {
    // aspecter at 0 moving +1/day, target at 179: arc 179 → 178, drishti 58 → 56 (falling).
    const a = aspectInfluence(0, 1, 179);
    expect(a!.trend).toBe("separating");
  });

  it("retrograde motion flips the direction of travel (no special case)", () => {
    const direct = aspectInfluence(0, 1, 179);   // separating when moving forward
    const retro = aspectInfluence(0, -1, 179);   // same geometry, reversed motion
    expect(direct!.trend).toBe("separating");
    expect(retro!.trend).toBe("forming");
    // identical geometry → identical resolved strength; only the trend differs
    expect(retro!.state).toBe(direct!.state);
    expect(retro!.virupas).toBe(direct!.virupas);
  });

  it("control — a mid-strength gaze does NOT read dominant", () => {
    // arc 120 → 30 virupas → moderate, never dominant/strong.
    const a = aspectInfluence(0, 1, 120);
    expect(a!.state).toBe("moderate");
    expect(a!.state).not.toBe("dominant");
  });
});
