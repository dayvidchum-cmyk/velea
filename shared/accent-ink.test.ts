import { describe, expect, it } from "vitest";
import { accentInk, contrastRatio, luminance, PARCHMENT, ESPRESSO } from "./accent-ink";

// The seven day-mode accents, as the app defines them.
const MODES: Record<string, string> = {
  build: "#B8912F", energize: "#6BA644", restore: "#3C8A7A", restraint: "#8B3A62",
  peak: "#C41E3A", selective: "#5C6B7A", action: "#2E7D4F",
};

// Hue is what makes a Build day GOLD. It must survive the fix, or this is a recolour.
function hueOf(hex: string): number {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

describe("contrast maths", () => {
  it("agrees with the known anchors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });

  // The measurement that started this. If these ever stop failing, the palette changed.
  it("confirms the raw accents FAIL as ink — the bug being fixed", () => {
    expect(contrastRatio(MODES.build, PARCHMENT)).toBeLessThan(4.5);      // 2.75x — gold on light
    expect(contrastRatio(MODES.energize, PARCHMENT)).toBeLessThan(4.5);   // 2.74x
    expect(contrastRatio(MODES.restore, PARCHMENT)).toBeLessThan(4.5);    // 3.84x — fails BOTH
    expect(contrastRatio(MODES.restore, ESPRESSO)).toBeLessThan(4.5);     // 4.15x
    expect(contrastRatio(MODES.restraint, ESPRESSO)).toBeLessThan(4.5);   // 2.34x — wine on dark
    expect(contrastRatio(MODES.peak, ESPRESSO)).toBeLessThan(4.5);        // 2.92x
    expect(contrastRatio(MODES.selective, ESPRESSO)).toBeLessThan(4.5);   // 3.12x
    expect(contrastRatio(MODES.action, ESPRESSO)).toBeLessThan(4.5);      // 3.38x
  });
});

describe("accentInk — every mode reads on every ground", () => {
  for (const ground of [PARCHMENT, ESPRESSO]) {
    for (const [name, accent] of Object.entries(MODES)) {
      it(`${name} clears 4.5:1 on ${ground === PARCHMENT ? "parchment" : "espresso"}`, () => {
        const ink = accentInk(accent, ground);
        expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("PRESERVES HUE — a Build day stays gold, it just becomes a gold you can read", () => {
    for (const [name, accent] of Object.entries(MODES)) {
      for (const ground of [PARCHMENT, ESPRESSO]) {
        const ink = accentInk(accent, ground);
        // within a couple of degrees; rounding to 8-bit channels moves it slightly
        expect(Math.abs(hueOf(ink) - hueOf(accent)), `${name} on ${ground}`).toBeLessThan(3);
      }
    }
  });

  it("leaves an already-readable accent completely untouched — no gratuitous recolouring", () => {
    expect(accentInk(MODES.restraint, PARCHMENT)).toBe(MODES.restraint); // 6.82x, already fine
    expect(accentInk(MODES.peak, PARCHMENT)).toBe(MODES.peak);           // 5.46x
    expect(accentInk(MODES.build, ESPRESSO)).toBe(MODES.build);          // 5.79x
  });

  it("moves as little as it has to — stops at the first colour that clears the bar", () => {
    const ink = accentInk(MODES.build, PARCHMENT);
    const r = contrastRatio(ink, PARCHMENT);
    expect(r).toBeGreaterThanOrEqual(4.5);
    expect(r).toBeLessThan(6.5); // not driven all the way to near-black
  });

  it("accepts a lower bar for marks whose shape already carries the meaning", () => {
    const ink = accentInk(MODES.restore, ESPRESSO, 3);
    expect(contrastRatio(ink, ESPRESSO)).toBeGreaterThanOrEqual(3);
  });

  it("never throws on junk input or an impossible ground", () => {
    expect(accentInk("var(--day-accent)", PARCHMENT)).toBe("var(--day-accent)");
    expect(accentInk(MODES.build, "not-a-colour")).toBe(MODES.build);
    // a mid-grey ground cannot reach 4.5:1 with a saturated hue — return the best, do not crash
    expect(() => accentInk(MODES.selective, "#808080")).not.toThrow();
  });
});
