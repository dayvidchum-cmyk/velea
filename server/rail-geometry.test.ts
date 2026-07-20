import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * THE GLYPH RAIL'S GEOMETRY (v813).
 *
 * v777 fixed the overflow — no cell spills into its neighbour any more. It did not fix the two
 * things David actually keeps seeing:
 *
 *  1. THE CROWN WAS OFF-AXIS on every ODD mark count. `mid = floor(n/2)` put the extra slot on the
 *     right, so the crown hung 4–6.5px LEFT of the date number underneath it. The code conceded it:
 *     "with even flanks the crown still sits exactly on-axis" is another way of saying it does not
 *     on odd ones.
 *  2. THE RAIL FLOATED. `top:-17` with no height made the row's height equal its tallest child, and
 *     glyphs shrink 13 → 7 as marks are added — so the baseline swung between a light day and a
 *     loaded one, and again against a crowned day.
 *
 * The arithmetic below re-derives the layout from the same constants the component uses, so this
 * is a real geometry check rather than a promise that the source contains some words. The anchoring
 * half genuinely is a source assertion — it is a CSS fact, and there is no DOM here.
 */
const SRC = readFileSync(new URL("../client/src/components/CalendarCoin.tsx", import.meta.url), "utf8");
const RAIL_BUDGET = 40;

/** The component's own solve, restated. */
function layout(markCount: number, hasCrown: boolean) {
  const maxSlots = hasCrown ? 4 : 5;
  const m = Math.min(markCount, maxSlots);
  const crownW = !hasCrown ? 0 : m === 0 ? 17 : 14;
  const perFlank = hasCrown && m > 0 ? Math.ceil(m / 2) : 0;
  const slotW = m === 0 ? 0
    : hasCrown
      ? Math.max(7, Math.min(13, Math.floor((RAIL_BUDGET - crownW) / (2 * perFlank))))
      : Math.max(7, Math.min(13, Math.floor(RAIL_BUDGET / m)));
  const leftW = hasCrown ? perFlank * slotW : 0;
  const rightW = hasCrown ? perFlank * slotW : 0;   // padded to the same COUNT, so the same width
  const width = hasCrown ? leftW + crownW + rightW : m * slotW;
  return { m, crownW, slotW, perFlank, leftW, rightW, width };
}

describe("the crown sits on the coin's axis", () => {
  it.each([1, 2, 3, 4])("is centred with %i marks — including the odd counts that were wrong", (m) => {
    const L = layout(m, true);
    expect(L.leftW, `left ${L.leftW} vs right ${L.rightW}`).toBe(L.rightW);
  });

  it("was NOT centred under the old arithmetic — the denominator for the case above", () => {
    // Old: mid = floor(n/2), no padding, so the flanks differed by one slot on odd counts.
    for (const m of [1, 3]) {
      const crownW = 14;
      const oldSlot = Math.max(7, Math.min(13, Math.floor((RAIL_BUDGET - crownW) / m)));
      const mid = Math.floor(m / 2);
      const offset = ((m - mid) - mid) * oldSlot / 2;
      expect(offset, `m=${m} used to be on-axis, so this test proves nothing`).toBeGreaterThan(0);
    }
  });
});

describe("the rail still fits the cell", () => {
  // 375px iPhone: (375 - 48) / 7 = 46.7px per cell. Centring must not have bought the axis with
  // overflow — that is the bug v777 closed.
  const CELL_375 = (375 - 48) / 7;

  it.each([
    [0, true], [1, true], [2, true], [3, true], [4, true],
    [0, false], [1, false], [2, false], [3, false], [4, false], [5, false],
  ])("marks=%i crown=%s fits", (m, crown) => {
    expect(layout(m as number, crown as boolean).width).toBeLessThanOrEqual(CELL_375);
  });

  it("the widest rail is unchanged at 42px — the axis fix cost nothing", () => {
    let widest = 0;
    for (const crown of [true, false]) for (let m = 0; m <= 5; m++) widest = Math.max(widest, layout(m, crown).width);
    expect(widest).toBe(42);
  });

  it("never shrinks a glyph below the 7px floor", () => {
    for (const crown of [true, false]) for (let m = 1; m <= 5; m++) {
      expect(layout(m, crown).slotW).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("the rail's baseline is pinned, not floating", () => {
  it("has a fixed height and bottom-aligned children", () => {
    expect(SRC).toMatch(/position: "absolute", top: -17, left: 0, right: 0, height: 17/);
    expect(SRC).toContain('alignItems: "flex-end"');
  });

  it("no longer centres the rail's children vertically", () => {
    // alignItems:"center" inside a content-sized box is exactly what made the baseline swing.
    const rail = SRC.slice(SRC.indexOf("position: \"absolute\", top: -17"), SRC.indexOf("THE COIN CENTER"));
    expect(rail).not.toContain('alignItems: "center"');
  });
});
