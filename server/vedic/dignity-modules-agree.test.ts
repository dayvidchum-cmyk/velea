import { describe, it, expect } from "vitest";
import { planetDignity, GRAHAS } from "./dignity.js";
import { dignityLabel } from "../panchang/dignity.js";

/**
 * TWO DIGNITY MODULES, ONE CLASSICAL TABLE (v834).
 *
 * server/vedic/dignity.ts and server/panchang/dignity.ts BOTH hand-copy the exaltation, own-sign
 * and moolatrikona tables. That is the exact shape of HOUSE_TO_BASE_MODE, which was a private copy
 * of the house→mode map, silently drifted for eight days, and was still being served on a public
 * endpoint when it was found (v810). It is also the shape of the karakas drift, where Jupiter went
 * missing from career.
 *
 * The two agree today — verified across every planet × sign × degree, not by eyeballing the source.
 * Nothing enforced that. This does.
 *
 * Scope, stated honestly: only the FOUR states both modules claim to compute are compared. vedic
 * collapses friendship to "neutral" while panchang carries friend/enemy tiers, so comparing those
 * would be comparing two different questions.
 */
const ZOD = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const STRONG = ["exalted", "debilitated", "own", "moolatrikona"];
const norm = (s: unknown) => String(s).toLowerCase();

describe("the two dignity modules do not drift", () => {
  it("agree on every strong dignity, for every planet, sign and degree", () => {
    const diffs: string[] = [];
    let compared = 0;
    for (const g of GRAHAS) {
      for (let si = 0; si < 12; si++) {
        for (const deg of [1, 15, 29]) {
          const v = norm(planetDignity(g as any, si * 30 + deg));
          const p = norm(dignityLabel(g, ZOD[si], deg));
          compared++;
          if (STRONG.includes(v) || STRONG.includes(p)) {
            if (v !== p) diffs.push(`${g} ${ZOD[si]} ${deg}°: vedic="${v}" panchang="${p}"`);
          }
        }
      }
    }
    expect(compared).toBe(GRAHAS.length * 12 * 3);
    expect(diffs).toEqual([]);
  });

  it("actually EXERCISES each strong dignity — a sweep that never hits one proves nothing", () => {
    const seen = new Set<string>();
    for (const g of GRAHAS) {
      for (let si = 0; si < 12; si++) {
        for (const deg of [1, 15, 29]) {
          const v = norm(planetDignity(g as any, si * 30 + deg));
          if (STRONG.includes(v)) seen.add(v);
        }
      }
    }
    // If a future refactor made planetDignity return "neutral" for everything, the test above would
    // pass in silence. This is its denominator.
    expect([...seen].sort()).toEqual(["debilitated", "exalted", "moolatrikona", "own"]);
  });

  it("pins the classical anchors by value, so a 'fix' to either copy fails here", () => {
    // The four best-known exaltations. If someone edits one table and not the other, the sweep above
    // catches the divergence — but if someone edits BOTH the same wrong way, only this catches it.
    expect(norm(planetDignity("Sun" as any, 0 * 30 + 10))).toBe("exalted");      // Sun 10° Aries
    expect(norm(planetDignity("Moon" as any, 1 * 30 + 3))).toBe("exalted");      // Moon 3° Taurus
    expect(norm(planetDignity("Jupiter" as any, 3 * 30 + 5))).toBe("exalted");   // Jupiter 5° Cancer
    expect(norm(planetDignity("Saturn" as any, 6 * 30 + 20))).toBe("exalted");   // Saturn 20° Libra
    // And the debilitations are the opposite signs at the same degrees.
    expect(norm(planetDignity("Sun" as any, 6 * 30 + 10))).toBe("debilitated");  // Sun 10° Libra
    expect(norm(planetDignity("Saturn" as any, 0 * 30 + 20))).toBe("debilitated"); // Saturn 20° Aries
  });
});
