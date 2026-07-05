import { describe, it, expect } from "vitest";
import { evaluateRestGate } from "./rest-gate";

const axes = (p: number, m: number, e: number, c: number, mo: number) => ({
  physicalEnergy: p,
  mentalClarity: m,
  emotionalStability: e,
  creativeFlow: c,
  motivation: mo,
});

describe("evaluateRestGate", () => {
  it("does not trip on a missing check-in (silence ≠ rest)", () => {
    expect(evaluateRestGate(null).tripped).toBe(false);
    expect(evaluateRestGate(undefined).tripped).toBe(false);
  });

  it("trips on all 1's", () => {
    expect(evaluateRestGate(axes(1, 1, 1, 1, 1)).tripped).toBe(true);
  });

  it("Trigger 1 — average ≤ 1.5 (e.g. 2,1,1,1,1 → avg 1.2)", () => {
    expect(evaluateRestGate(axes(2, 1, 1, 1, 1)).tripped).toBe(true);
  });

  it("Trigger 2 — physical energy AND motivation both 1, even if others are high", () => {
    expect(evaluateRestGate(axes(1, 5, 5, 5, 1)).tripped).toBe(true);
  });

  it("Trigger 3 — four axes at 1 (the fifth okay)", () => {
    expect(evaluateRestGate(axes(1, 1, 1, 1, 4)).tripped).toBe(true);
  });

  it("does NOT trip on a merely low-ish day (3,2,3,2,3 → avg 2.6)", () => {
    expect(evaluateRestGate(axes(3, 2, 3, 2, 3)).tripped).toBe(false);
  });

  it("does NOT trip when only energy is at floor but drive is intact (1,3,3,3,3)", () => {
    expect(evaluateRestGate(axes(1, 3, 3, 3, 3)).tripped).toBe(false);
  });

  it("does NOT trip on three-at-floor without the energy+motivation combo (1,1,1,5,5 → avg 2.6)", () => {
    expect(evaluateRestGate(axes(1, 1, 1, 5, 5)).tripped).toBe(false);
  });

  it("returns a human reason when tripped", () => {
    expect(evaluateRestGate(axes(1, 1, 1, 1, 1)).reason).toBeTruthy();
  });
});
