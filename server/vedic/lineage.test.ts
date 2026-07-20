import { describe, it, expect } from "vitest";
import { buildLineage } from "./lineage.js";
import type { NatalPlanet } from "./knots.js";
import { readFileSync } from "node:fs";

/**
 * THE LINEAGE SPREAD (David's ruling, 2026-07-20: "latter" — ancestry is a spread, not a chip).
 *
 * Seven strands across seven houses, plus the karakas he named. These tests pin the doctrine's
 * SHAPE — which house carries which question — because that mapping is his, transcribed from
 * canon/lineage-doctrine.md, and a silent edit to it would be an edit to his method.
 */

const natal = (over: Record<string, Partial<NatalPlanet>> = {}): Record<string, NatalPlanet> => {
  const base: Record<string, NatalPlanet> = {};
  for (const p of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) {
    base[p] = { house: 1, sign: "Aries", rulesHouses: [] };
  }
  for (const [p, v] of Object.entries(over)) base[p] = { ...base[p], ...v } as NatalPlanet;
  return base;
};

describe("the spread carries the doctrine's map", () => {
  const { all } = buildLineage({ natal: natal(), dashaLords: {} });

  it("has all seven strands, on the houses he named", () => {
    const map = Object.fromEntries(all.map((t) => [t.strand, t.house]));
    expect(map).toEqual({
      kula: 2, mother: 4, forward: 5, inheritance: 8, father: 9, fatherStanding: 10, departed: 12,
    });
  });

  it("names the Moon for the mother and the Sun for the father", () => {
    // "Houses only tell half the story. You must also look at the planets."
    expect(all.find((t) => t.strand === "mother")!.karakas).toContain("Moon");
    expect(all.find((t) => t.strand === "father")!.karakas).toContain("Sun");
    expect(all.find((t) => t.strand === "fatherStanding")!.karakas).toContain("Sun");
  });

  it("gives Ketu to the two strands that reach backwards", () => {
    // "Ketu: the planet of the past… deep genetic or spiritual ancestral roots."
    expect(all.find((t) => t.strand === "inheritance")!.karakas).toContain("Ketu");
    expect(all.find((t) => t.strand === "departed")!.karakas).toContain("Ketu");
  });

  it("asks a question per strand, in the reader's language, never a house number", () => {
    for (const t of all) {
      expect(t.question.length).toBeGreaterThan(20);
      expect(t.question).not.toMatch(/\b\d{1,2}(st|nd|rd|th) house\b/);
    }
  });
});

describe("a strand lights only when something is actually tied to it", () => {
  it("nothing running, nothing lit", () => {
    const { lit } = buildLineage({ natal: natal(), dashaLords: {} });
    expect(lit).toEqual([]);
  });

  it("a period lord SEATED in the house lights that strand", () => {
    const { lit } = buildLineage({
      natal: natal({ Saturn: { house: 8 } }),
      dashaLords: { maha: "Saturn" },
    });
    expect(lit.map((t) => t.strand)).toContain("inheritance");
    expect(lit.find((t) => t.strand === "inheritance")!.signals[0].text).toMatch(/sits in the 8th/);
  });

  it("a period lord RULING the house lights it", () => {
    const { lit } = buildLineage({
      natal: natal({ Venus: { rulesHouses: [4] } }),
      dashaLords: { antar: "Venus" },
    });
    expect(lit.map((t) => t.strand)).toContain("mother");
    expect(lit[0].signals[0].text).toMatch(/rules the 4th/);
  });

  it("a period lord that IS the karaka lights it, even placed elsewhere", () => {
    // The whole reason he gave the karakas: the Moon is the mother regardless of house.
    const { lit } = buildLineage({ natal: natal(), dashaLords: { maha: "Moon" } });
    expect(lit.map((t) => t.strand)).toContain("mother");
    expect(lit.find((t) => t.strand === "mother")!.signals[0].text).toMatch(/significator/);
  });

  it("the year lord counts too", () => {
    const { lit } = buildLineage({ natal: natal({ Sun: { house: 9 } }), dashaLords: {}, timeLord: "Sun" });
    expect(lit.map((t) => t.strand)).toContain("father");
    expect(lit[0].signals[0].text).toMatch(/the year lord/);
  });

  it("SLOW transits light a strand; fast ones never do", () => {
    const slow = buildLineage({
      natal: natal(), dashaLords: {},
      transitsHitting: [{ planet: "Saturn", hitsNatalPoint: null, houseFromLagna: 12, slow: true }],
    });
    expect(slow.lit.map((t) => t.strand)).toContain("departed");

    // Ancestry is a STANDING theme. If the Moon could light "the departed" every third day the
    // spread would be noise, and the reading would talk about dead ancestors on a Tuesday.
    const fast = buildLineage({
      natal: natal(), dashaLords: {},
      transitsHitting: [{ planet: "Moon", hitsNatalPoint: null, houseFromLagna: 12, slow: false }],
    });
    expect(fast.lit).toEqual([]);
  });

  it("counts each tied lord once, and reports them", () => {
    const { lit } = buildLineage({
      natal: natal({ Sun: { house: 9, rulesHouses: [9] } }),
      dashaLords: { maha: "Sun", antar: "Sun" },
    });
    const father = lit.find((t) => t.strand === "father")!;
    expect(father.activeLords).toEqual(["Sun"]);
  });
});

describe("it REACHES the reading — a spread nothing reads is a chip with extra steps", () => {
  // Every reach failure in this run had the same shape: correct in its own file, arriving nowhere.
  // Building the spread and not wiring it would have been that failure committed knowingly, on the
  // very day I finished cataloguing it.
  const BUILDER = readFileSync(new URL("../narrative/input-builder.ts", import.meta.url), "utf8");

  it("the builder imports and calls it", () => {
    expect(BUILDER).toContain('from "../vedic/lineage.js"');
    expect(BUILDER).toMatch(/const lineageResult = buildLineage\(\{/);
  });

  it("it is emitted in the day payload, and only when something is lit", () => {
    expect(BUILDER).toMatch(/\.\.\.\(lineage \? \{ lineage \} : \{\}\)/);
    expect(BUILDER).toMatch(/lineageResult\.lit\.length/);
  });

  it("reuses the SAME chart inputs as the knots, so the two cannot disagree", () => {
    const call = BUILDER.slice(BUILDER.indexOf("const lineageResult = buildLineage({"));
    const body = call.slice(0, call.indexOf("});"));
    expect(body).toContain("natal: knotNatal");
    expect(body).toContain("timeLord: pf.timeLord");
    expect(body).toContain("SLOW_TRANSITS.has(t.planet)");
  });

  it("the model is given a law for it, naming every field the payload sends", async () => {
    const { BASE_PROMPT } = await import("../narrative/prompts.js");
    expect(/^ANCESTRY IS A SPREAD, NOT A TOPIC\.$/m.test(BASE_PROMPT)).toBe(true);
    for (const k of ["strand", "label", "asks", "why"]) expect(BASE_PROMPT).toContain(k);
    expect(BASE_PROMPT).toContain("input.lineage");
  });

  it("the law forbids the two ways this goes wrong", async () => {
    const { BASE_PROMPT } = await import("../narrative/prompts.js");
    // Naming the house number, and finding ancestral trauma every single morning.
    expect(BASE_PROMPT).toMatch(/NEVER name the house number/);
    expect(BASE_PROMPT).toMatch(/Do NOT reach for the ancestors when input\.lineage is absent/);
  });

  it("PROMPT_VERSION moved, or the law reaches nothing already cached", async () => {
    // PIN THE FACT, NOT THE STRING. This asserted PROMPT_VERSION === "2026-07-20-two-part-day",
    // so adding the NEXT law (the lineage spread) broke it against correct code — the version had
    // moved, which is exactly what it is supposed to do. What must hold is that it is dated and is
    // not any value that predates a law now in the prompt.
    const { PROMPT_VERSION } = await import("../narrative/prompts.js");
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}-/);
    for (const stale of ["2026-07-18-audit4-law-reconcile", "2026-07-20-laws-restored"]) {
      expect(PROMPT_VERSION).not.toBe(stale);
    }
  });
});
