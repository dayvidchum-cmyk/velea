import { describe, it, expect } from "vitest";
import { moonBrightness } from "./moon-brightness.js";

/**
 * MOON BRIGHTNESS (David 2026-07-23, states doctrine #5) — the day-trigger's strength dial, off the
 * same Sun–Moon elongation the tithi is cut from. Pins the physics (illumination curve), the phase
 * bins, and — critically — that it never disagrees with the tithi's shukla/krishna split.
 */
const ZOD = 30;

describe("moonBrightness — illumination + phase from the elongation", () => {
  it("new moon (conjunct): dark, waxing about to begin", () => {
    const b = moonBrightness(0, 0);
    expect(b.illumination).toBeCloseTo(0, 3);
    expect(b.pakshaBala).toBeCloseTo(0, 3);
    expect(b.phase).toBe("new");
    expect(b.paksha).toBe("shukla");
  });

  it("full moon (opposition): brimming", () => {
    const b = moonBrightness(0, 180);
    expect(b.illumination).toBeCloseTo(1, 3);
    expect(b.pakshaBala).toBeCloseTo(1, 3);
    expect(b.phase).toBe("full");
  });

  it("quarters are half-lit", () => {
    expect(moonBrightness(0, 90).illumination).toBeCloseTo(0.5, 3);   // first quarter
    expect(moonBrightness(0, 270).illumination).toBeCloseTo(0.5, 3);  // last quarter
    expect(moonBrightness(0, 90).phase).toBe("first-quarter");
    expect(moonBrightness(0, 270).phase).toBe("last-quarter");
  });

  it("illumination rises to full then falls, symmetric about opposition", () => {
    const up = moonBrightness(0, 60).illumination;
    const peak = moonBrightness(0, 180).illumination;
    const down = moonBrightness(0, 300).illumination;
    expect(peak).toBeGreaterThan(up);
    expect(up).toBeCloseTo(down, 3); // 60° and 300° are mirror elongations
  });

  it("names every phase across the month", () => {
    const at = (e: number) => moonBrightness(0, e).phase;
    expect(at(10)).toBe("new");
    expect(at(45)).toBe("waxing-crescent");
    expect(at(90)).toBe("first-quarter");
    expect(at(135)).toBe("waxing-gibbous");
    expect(at(180)).toBe("full");
    expect(at(225)).toBe("waning-gibbous");
    expect(at(270)).toBe("last-quarter");
    expect(at(315)).toBe("waning-crescent");
    expect(at(350)).toBe("new");
  });

  it("waxing/paksha NEVER disagrees with the tithi cut from the same elongation", () => {
    // tithi = floor(elong/12)+1; shukla = 1..15, krishna = 16..30. The brightness paksha must match.
    for (let e = 0; e < 360; e += 3) {
      const b = moonBrightness(0, e);
      const tithi = Math.floor(e / 12) + 1;
      const tithiPaksha = tithi <= 15 ? "shukla" : "krishna";
      expect(b.paksha, `elong ${e}° → tithi ${tithi}`).toBe(tithiPaksha);
    }
  });

  it("uses the same elongation wrap regardless of absolute sign positions", () => {
    // Moon 30° ahead of Sun is the same brightness whether they sit in Aries or Sagittarius.
    const a = moonBrightness(0, 30);
    const b = moonBrightness(8 * ZOD, 8 * ZOD + 30);
    expect(a).toEqual(b);
  });
});
