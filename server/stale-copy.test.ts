import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { HOUSE_MODE } from "./panchang/interpreter.js";

/**
 * ONE MAP, NOT TWO (v810).
 *
 * modifier-config.ts carried a private COPY of interpreter.ts's HOUSE_MODE that stopped being
 * updated on 2026-07-12, when David corrected the 3rd/5th/9th assignments. It disagreed with the
 * live map on exactly those three houses — 3: Build vs Selective, 5: Selective vs Build, 9: Flex vs
 * Action — and it was still being SERVED, unauthenticated, by the /config endpoint. It corrupted no
 * computation, because nothing else imported it; it simply published three wrong houses to anyone
 * who asked, for eight days.
 *
 * A second copy of a table is not a config file. It is a bug with a delay.
 */
const ROUTERS = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const MODIFIER_CONFIG = readFileSync(new URL("./panchang/modifier-config.ts", import.meta.url), "utf8");

describe("the house→mode map has exactly one home", () => {
  it("the stale copy is gone, not merely unused", () => {
    expect(MODIFIER_CONFIG).not.toContain("export const HOUSE_TO_BASE_MODE");
  });

  it("the public config endpoint serves the live map", () => {
    expect(ROUTERS).toContain("houseToBaseMode: HOUSE_MODE");
    expect(ROUTERS).not.toContain("HOUSE_TO_BASE_MODE");
  });

  it("and the live map still carries David's 2026-07-12 correction", () => {
    // The three houses the copy had wrong. If someone "fixes" the live map back toward the old
    // copy, this fails — which is the point of pinning them by value rather than by shape.
    expect(HOUSE_MODE[3]).toBe("Selective");
    expect(HOUSE_MODE[5]).toBe("Build");
    expect(HOUSE_MODE[9]).toBe("Action");
  });

  it("covers all twelve houses, so nothing falls through to a default", () => {
    for (let h = 1; h <= 12; h++) {
      expect(HOUSE_MODE[h], `house ${h}`).toBeTruthy();
    }
  });
});
