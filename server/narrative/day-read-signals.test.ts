import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { combustion, COMBUSTION_ORB } from "../panchang/affliction.js";

/**
 * THE PRECISION LAYER THAT NOTHING CALLS (v842).
 *
 * server/narrative/day-read-signals.ts opens by describing itself as "the deterministic precision
 * layer for the 'pick a date' horoscope (Step 4)". It is 170 lines. NOTHING IN THE REPO IMPORTS IT
 * — not a router, not input-builder, not a script. It is the largest reach failure found in this
 * run, and the same shape as the five before it (v800 yoga, v801 polar flag, v808 bell crown, v811
 * cookie, v815 ink): the code is correct in its own file and arrives nowhere.
 *
 * What it uniquely carries, and the live path does not: Bhava Chalit houses per transit, and
 * per-transit Ashtakavarga bindus via transitStrength() — which, checked across the whole repo, is
 * reached by this dead module and by nothing else. input-builder DOES already carry crownDay,
 * tarabala/chandrabala and the natal ashtakavarga, so the loss is the transit-level precision, not
 * the whole layer.
 *
 * WIRING IT IS A PRODUCT DECISION, NOT A SILENT FIX — it changes what a paid pick-a-date reading
 * says, and per David's standing rule the method is his. So this file does two things: it pins the
 * bug found INSIDE the dead module (below), and it makes the dead-ness visible instead of letting
 * it sit unnoticed for another however-many versions.
 */
const SRC = readFileSync(new URL("./day-read-signals.ts", import.meta.url), "utf8");

describe("combustion is owned by affliction.ts, not hand-rolled here", () => {
  // THE BUG (v842): `const combust = planet !== "Sun" && sep(lon, daySunLon) < 8` — one flat 8°
  // orb for every body. Wrong in BOTH directions, which is why it is worth fixing even in a module
  // nobody calls: if this is ever wired, it hands the model a false condition on the most
  // frequently-lit planets.
  it("imports the canonical function", () => {
    expect(SRC).toContain('from "../panchang/affliction.js"');
    expect(SRC).toMatch(/const comb = combustion\(planet, lon, daySunLon, retro\)/);
    expect(SRC).toMatch(/comb\?\.combust === true/);
  });

  it("no longer decides combustion with a flat orb", () => {
    expect(SRC).not.toMatch(/sep\(lon, daySunLon\)\s*<\s*\d+/);
  });

  it("passes the retrograde flag — Mercury and Venus tighten when retrograde", () => {
    expect(COMBUSTION_ORB.Mercury).toEqual({ direct: 14, retro: 12 });
    expect(COMBUSTION_ORB.Venus).toEqual({ direct: 10, retro: 8 });
    expect(SRC).toMatch(/combustion\(planet, lon, daySunLon, retro\)/);
  });
});

describe("what the flat 8° actually got wrong", () => {
  // Stated as executable arithmetic rather than a claim in a comment, because the claim is the
  // reason the fix is justified. Each of these is a real sky position the old line misreports.
  const FLAT = 8;

  it("UNDER-reported every one of the five — a Mars 12° from the Sun was called clear", () => {
    for (const [planet, orb] of Object.entries(COMBUSTION_ORB)) {
      if (planet === "Moon") continue; // the Moon is not in this module's CAST
      expect(orb.direct).toBeGreaterThan(FLAT);
      // a separation inside the classical orb but outside the flat one
      const gap = (FLAT + orb.direct) / 2;
      expect(combustion(planet, gap, 0, false)!.combust).toBe(true);
      expect(gap > FLAT).toBe(true); // …and the old line would have said "clear"
    }
  });

  it("OVER-reported the nodes, which have no orb at all", () => {
    // Rahu/Ketu are in CAST. The old line applied 8° to them; classically they are not subject to
    // combustion, and the canonical function says so by returning null.
    expect(combustion("Rahu", 3, 0, false)).toBeNull();
    expect(combustion("Ketu", 3, 0, false)).toBeNull();
  });

  it("ignored retrograde entirely — Venus at 9° retrograde is clear, direct is combust", () => {
    expect(combustion("Venus", 9, 0, true)!.combust).toBe(false);
    expect(combustion("Venus", 9, 0, false)!.combust).toBe(true);
  });
});

describe("the module's reach", () => {
  it("declares itself a live layer for the pick-a-date read", () => {
    expect(SRC).toMatch(/precision layer for the "pick a date" horoscope/);
  });

  it("carries the transit-level precision the live path does not", () => {
    // If these ever move into input-builder, this module is genuinely redundant and should be
    // deleted rather than left to rot — that is the other half of the decision.
    expect(SRC).toContain("transitStrength");
    expect(SRC).toContain("placeInBhava");
  });
});
