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
    expect(contrastRatio(MODES.restore, ESPRESSO)).toBeLessThan(4.5);     // 4.1x
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

  // THIS TEST EXISTED AND COULD NOT CATCH THE BUG (v807). The case above is build-on-parchment,
  // where the accent's own lightness happens to sit near 0.5 — so the old sweep, which STARTED at
  // 0.5 instead of at the colour, gave nearly the right answer and the 6.5 ceiling never tripped.
  // The failure only shows on an accent whose lightness is far from mid-grey. A loose ceiling on a
  // convenient fixture is how a real defect passes a green suite.
  it("does not overshoot on an accent whose lightness is nowhere near mid-grey", () => {
    // restore (#3C8A7A, L≈0.39) on espresso: needs 4.5, and the old sweep — forced to start at 0.5
    // and walk UP — could not return anything below it. Measured 7.80 before, ~4.5 after.
    const ink = accentInk(MODES.restore, ESPRESSO);
    const r = contrastRatio(ink, ESPRESSO);
    expect(r).toBeGreaterThanOrEqual(4.5);
    expect(r).toBeLessThan(5.5);
  });

  it("every accent that needs fixing lands just past the bar, on both grounds", () => {
    // The general form of the same law, so no single fixture can hide it again.
    for (const [name, hex] of Object.entries(MODES)) {
      for (const ground of [PARCHMENT, ESPRESSO]) {
        const ink = accentInk(hex, ground);
        if (ink === hex) continue; // already readable — nothing to overshoot
        const r = contrastRatio(ink, ground);
        expect(r, `${name} on ${ground === PARCHMENT ? "parchment" : "espresso"}`).toBeGreaterThanOrEqual(4.5);
        expect(r, `${name} on ${ground === PARCHMENT ? "parchment" : "espresso"} overshot`).toBeLessThan(6.0);
      }
    }
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

describe("the ground is the surface the text ACTUALLY sits on (v822)", () => {
  // ink.ts's own header warns about this for tinted chips: solving against the card when the text
  // sits on something else leaves it short — "measured at 3.9:1 where 4.5 was intended". The
  // profection panel hit the same wall from a different direction: it is drawn on --secondary,
  // which is darker than the card, and v815 inked its sign colours against the card anyway.
  const CARD_LIGHT = "#F9F4EA", SECONDARY_LIGHT = "#E9E4D8";
  const SIGNS = ["#C0392B", "#27AE60", "#F1C40F", "#5DADE2", "#E67E22", "#16A085",
                 "#EC7063", "#8E44AD", "#D35400", "#34495E", "#5D6D7E", "#48C9B0"];

  it("solving against the WRONG ground leaves the text short — the denominator", () => {
    let worst = 99;
    for (const c of SIGNS) worst = Math.min(worst, contrastRatio(accentInk(c, CARD_LIGHT), SECONDARY_LIGHT));
    expect(worst).toBeLessThan(4.5);      // ~3.92 — this is the bug, reproduced
  });

  it("solving against the REAL ground clears the bar for every sign colour", () => {
    for (const c of SIGNS) {
      expect(contrastRatio(accentInk(c, SECONDARY_LIGHT), SECONDARY_LIGHT), c).toBeGreaterThanOrEqual(4.5);
    }
  });
});
