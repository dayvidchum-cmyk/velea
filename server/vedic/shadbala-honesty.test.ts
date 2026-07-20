import { describe, it, expect } from "vitest";
import { shadbala } from "./shadbala.js";

/**
 * MISSING AND APPROXIMATE ARE DIFFERENT FAILURES.
 *
 * `pending` only ever caught a source that could not be computed at all. Chesta is computed by
 * K&F's relative-speed rule (p.314) — a cited method, but NOT the fuller eight-state
 * seeghra-kendra. Because a computed-but-simplified source left `pending` empty, the six-source
 * total published as though all six were exact, and that number reaches the reader as
 * "strong — can deliver what it promises" on every paid surface.
 *
 * The repair is not to delete the number (that would make every planet read "unmeasured" on
 * every surface, which is a product decision, not a defect repair). It is to stop the total
 * claiming a precision it does not have: `approximate` now travels with it.
 */
const LON = { Sun: 10, Moon: 100, Mars: 200, Mercury: 25, Jupiter: 300, Venus: 40, Saturn: 130 } as any;
const SPEEDS = { Mars: 0.52, Mercury: 1.2, Jupiter: 0.08, Venus: 1.1, Saturn: 0.03 } as any;

describe("a simplified strength source declares itself", () => {
  it("ANCHOR — with no speeds at all, Chesta is MISSING and lands on pending (not approximate)", () => {
    const r = shadbala(LON, 5);
    expect(r.Mars.pending).toContain("chesta");
    expect(r.Mars.approximate).not.toContain("chesta");
    expect(r.Mars.sixSourceRupas).toBeNull(); // missing source ⇒ no total, unchanged law
  });

  it("when Chesta IS computed it is declared approximate, never silently exact", () => {
    const r = shadbala(LON, 5, SPEEDS);
    expect(r.Mars.chestaBala).not.toBeNull();
    expect(r.Mars.pending).not.toContain("chesta"); // it was computed...
    expect(r.Mars.approximate).toContain("chesta"); // ...by the simplified rule
  });

  it("every graha that carries a Chesta value carries the declaration with it", () => {
    const r = shadbala(LON, 5, SPEEDS);
    const graha = Object.keys(r) as Array<keyof typeof r>;
    expect(graha.length).toBe(7); // denominator
    const undeclared = graha.filter((g) => r[g].chestaBala != null && !r[g].approximate.includes("chesta"));
    expect(undeclared, `grahas quoting Chesta with no declaration: ${undeclared.join(", ")}`).toEqual([]);
  });

  it("the declaration is not blanket — nothing else is marked approximate", () => {
    const r = shadbala(LON, 5, SPEEDS);
    for (const g of Object.keys(r) as Array<keyof typeof r>) {
      expect(r[g].approximate.filter((x) => x !== "chesta")).toEqual([]);
    }
  });
});
