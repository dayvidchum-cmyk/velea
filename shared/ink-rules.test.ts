import { describe, expect, it } from "vitest";
import { accentInk, contrastRatio, PARCHMENT, ESPRESSO } from "./accent-ink";

/**
 * Every SURFACE colour the app paints as TEXT must clear 4.5:1 on both card grounds once inked.
 * These are the real tables, copied from where they live, so a new colour added to any of them
 * without checking will fail here.
 */
const PLANETS = { Sun: "#E8A317", Moon: "#C0C0C0", Mars: "#BD0039", Mercury: "#85CDB5", Jupiter: "#C9A800", Venus: "#F8A4AC", Saturn: "#3F50AF", Ketu: "#9A7B6C", Rahu: "#5691A4" };
const MODES = { Build: "#D4AF37", Action: "#318a55", Selective: "#178F9E", Restraint: "#9A4E6E" };
const COINS = { build: "#D4AF37", action: "#5E9457", restraint: "#d57176", caution: "#B3232F", ochre: "#C49A2E", rose: "#CD9E86" };

describe("surface colours, inked, are readable as text", () => {
  for (const [group, table] of Object.entries({ planet: PLANETS, mode: MODES, coin: COINS })) {
    for (const [name, hex] of Object.entries(table)) {
      it(`${group} ${name} clears 4.5:1 on both grounds`, () => {
        for (const ground of [PARCHMENT, ESPRESSO]) {
          expect(contrastRatio(accentInk(hex, ground), ground)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  // The measurement that made this necessary — if these stop failing, the palette changed.
  it("the RAW colours genuinely fail, or this whole layer is pointless", () => {
    const failures = [...Object.values(PLANETS), ...Object.values(MODES), ...Object.values(COINS)]
      .filter((h) => contrastRatio(h, PARCHMENT) < 4.5 || contrastRatio(h, ESPRESSO) < 4.5);
    expect(failures.length).toBe(19); // every single one of them
  });

  it("a mark can use the looser 3:1 bar and still be met", () => {
    for (const hex of Object.values(PLANETS)) {
      for (const ground of [PARCHMENT, ESPRESSO]) {
        expect(contrastRatio(accentInk(hex, ground, 3), ground)).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
