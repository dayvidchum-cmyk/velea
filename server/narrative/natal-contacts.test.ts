import { describe, it, expect } from "vitest";
import { natalContactPayload } from "./input-builder";

/**
 * THE PAYLOAD THE PROMPT ACTUALLY READS.
 *
 * contacts.ts shipped in v884 with its own passing tests and was imported by NOTHING — the
 * prompt kept getting the bare `orb <= 10°` scan. Its unit tests could not catch that, because
 * they tested the module, not the path. These tests hold the PATH: if the wiring is removed or
 * the entries collapse back to {name, orb}, they fail.
 *
 * Longitudes are the maker's chart as measured 2026-07-20 (the case that exposed the conflict).
 */
const VIRGO_LAGNA = 5 * 30;
const HIS_CHART = {
  Sun: 11 * 30 + 29.52,      // Pisces 29.52
  Mercury: 0 * 30 + 1.34,    // Aries 1.34  → 1.82° from the Sun, across a sign wall
  Mars: 3 * 30 + 2.0,        // Cancer 2.00
  Saturn: 3 * 30 + 15.06,    // Cancer 15.06 → same sign, 13.06° apart
  Jupiter: 8 * 30 + 10.0,    // Sagittarius — touches nothing, the negative control
};

const entry = (byPlanet: Record<string, any[]>, owner: string, other: string) =>
  (byPlanet[owner] ?? []).find((e) => e.name === other);

describe("natal contact payload — the prompt's conjunct list", () => {
  it("names the tight pair that crosses a sign wall, and does NOT call it agreed", () => {
    const { byPlanet } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    const e = entry(byPlanet, "Sun", "Mercury");
    expect(e).toBeDefined();
    expect(e.kind).toBe("through-the-wall");
    expect(e.sameSign).toBe(false);
    expect(e.conventionsAgree).toBe(false);
    expect(e.orb).toBeCloseTo(1.8, 1);
  });

  it("surfaces the same-sign wide pair the old 10° scan dropped entirely", () => {
    const { byPlanet } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    // The old scan: orb 13.06 > 10, so Mars/Saturn never reached the prompt — while
    // avashtas/aspects/crown counted it as a conjunction all along.
    const e = entry(byPlanet, "Mars", "Saturn");
    expect(e).toBeDefined();
    expect(e.kind).toBe("across-the-room");
    expect(e.sameSign).toBe(true);
    expect(e.conventionsAgree).toBe(false);
  });

  it("CONTROL — a genuine same-party conjunction is reported as agreed and fusible", () => {
    const { byPlanet, disagreements } = natalContactPayload(
      { Sun: 100.0, Mercury: 103.5 }, VIRGO_LAGNA);
    const e = entry(byPlanet, "Sun", "Mercury");
    expect(e.kind).toBe("same-party");
    expect(e.sameSign).toBe(true);
    expect(e.conventionsAgree).toBe(true);
    expect(disagreements).toHaveLength(0);
  });

  it("CONTROL — a wide pair in different signs is reported by neither convention", () => {
    const { byPlanet } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    expect(byPlanet["Jupiter"] ?? []).toHaveLength(0);
    expect(entry(byPlanet, "Sun", "Jupiter")).toBeUndefined();
  });

  it("every contact appears on BOTH planets — a pair-fact, not a property of one", () => {
    const { byPlanet } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    for (const [owner, list] of Object.entries(byPlanet)) {
      for (const e of list) {
        const mirror = entry(byPlanet, e.name, owner);
        expect(mirror, `${e.name} is missing its ${owner} contact`).toBeDefined();
        expect(mirror.orb).toBe(e.orb);
        expect(mirror.kind).toBe(e.kind);
      }
    }
  });

  it("no entry may collapse back into a bare name+orb — kind is what the prompt branches on", () => {
    const { byPlanet } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    const all = Object.values(byPlanet).flat();
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(typeof e.kind, JSON.stringify(e)).toBe("string");
      expect(["same-party", "through-the-wall", "across-the-room"]).toContain(e.kind);
      expect(typeof e.sameSign).toBe("boolean");
      expect(typeof e.conventionsAgree).toBe("boolean");
    }
  });

  it("disagreements carries exactly the pairs the conventions split on", () => {
    const { disagreements } = natalContactPayload(HIS_CHART, VIRGO_LAGNA);
    expect(disagreements.map((c) => `${c.a}/${c.b}:${c.kind}`).sort()).toEqual([
      "Mars/Saturn:across-the-room",
      "Sun/Mercury:through-the-wall",
    ]);
  });

  it("empty and partial charts do not throw", () => {
    expect(natalContactPayload({}, VIRGO_LAGNA).disagreements).toEqual([]);
    expect(natalContactPayload({ Sun: 10 }, VIRGO_LAGNA).byPlanet).toEqual({});
  });
});
