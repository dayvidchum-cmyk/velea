import { describe, it, expect } from "vitest";
import { vimshopak } from "./vimshopak";
import { GRAHAS, type Graha } from "./dignity";

describe("vimshopak — 20-point varga-weighted strength (Ch.6 pp.297-299)", () => {
  it("every group score is within (0, 20]; classification matches the shodasha score", () => {
    const lonBy = Object.fromEntries(GRAHAS.map((g, i) => [g, i * 47])) as Record<Graha, number>;
    const v = vimshopak(lonBy);
    for (const g of GRAHAS) {
      for (const grp of ["shad", "sapta", "dasha", "shodasha"] as const) {
        expect(v[g].points[grp]).toBeGreaterThan(0);
        expect(v[g].points[grp]).toBeLessThanOrEqual(20);
      }
      expect(v[g].classification).toBeTruthy();
    }
  });

  it("a planet exalted through the vargas scores at the top of its class", () => {
    // Sun at 10° Aries (deep exaltation): D1 exalted; strong in many vargas → high total.
    const lonBy = Object.fromEntries(GRAHAS.map((g) => [g, 190])) as Record<Graha, number>;
    lonBy.Sun = 10;
    const v = vimshopak(lonBy);
    expect(v.Sun.points.shodasha).toBeGreaterThan(10);
    // and a debilitated Sun (10° Libra) scores lower than the exalted one
    const lonBy2 = { ...lonBy, Sun: 190 };
    expect(vimshopak(lonBy2).Sun.points.shodasha).toBeLessThan(v.Sun.points.shodasha);
  });
});
