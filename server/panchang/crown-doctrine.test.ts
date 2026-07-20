import { describe, it, expect } from "vitest";
import { tarabala, chandrabala } from "./crown.js";

/**
 * THE CROWN MARK AGAINST DAVID'S SPEC (2026-07-20), captured in canon/crown-doctrine.md.
 *
 * He specified how a day earns a mark: Tara Bala from the birth star, Chandra Bala from the natal
 * Moon sign, and a universal Shubha Muhurta layer on top. Two of those are already exact. These
 * tests pin the two that match, so they cannot drift away from his spec silently — and they name
 * the three that do NOT match rather than quietly asserting the engine's own behaviour as correct.
 */

describe("Tara Bala matches his list exactly", () => {
  // Ashwini = 0. Counting from the birth star, the Nth star reached is tara N.
  const taraAt = (n: number) => tarabala(0, n - 1);

  it("the five he calls good are good: Sampat 2, Kshema 4, Sadhana 6, Mitra 8, Parama Mitra 9", () => {
    for (const [n, name] of [[2, "Sampat"], [4, "Kshema"], [6, "Sadhaka"], [8, "Mitra"], [9, "Parama Mitra"]] as const) {
      const t = taraAt(n);
      expect(t.taraNum, `tara ${n}`).toBe(n);
      expect(t.name).toBe(name);
      expect(t.favorable, `${name} must be favourable`).toBe(true);
    }
  });

  it("the three he says to avoid are not favourable: Vipat 3, Pratyak 5, Naidhana 7", () => {
    for (const [n, name] of [[3, "Vipat"], [5, "Pratyak"], [7, "Naidhana"]] as const) {
      const t = taraAt(n);
      expect(t.name).toBe(name);
      expect(t.favorable, `${name} must never be favourable`).toBe(false);
      expect(t.quality, `${name} in the first round is at full force`).toBe("bad");
    }
  });

  it("no OTHER tara sneaks into the favourable set", () => {
    const good = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => taraAt(n).favorable);
    expect(good).toEqual([2, 4, 6, 8, 9]);
  });

  it("the birth star itself is sensitive, not lucky", () => {
    // His spec is silent on Janma; the engine calls it mixed. Recorded, not assumed correct.
    const t = taraAt(1);
    expect(t.name).toBe("Janma");
    expect(t.favorable).toBe(false);
    expect(t.quality).toBe("mixed");
  });
});

describe("Chandra Bala matches his list exactly", () => {
  const houseAt = (h: number) => chandrabala(0, h - 1);

  it("his six lucky houses are the favourable set, and only those", () => {
    const fav = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => houseAt(h).favorable);
    expect(fav).toEqual([1, 3, 6, 7, 10, 11]);
  });

  it("the 11th is favourable — but is NOT yet treated as the peak he describes", () => {
    // "The 11th house transit is universally known as the day of gains, unexpected opportunities,
    // and manifestations." The engine currently weighs it identically to the 3rd. This test states
    // the gap rather than hiding it: if someone later makes the 11th outrank the others, this fails
    // and sends them to his ruling, which is where that decision belongs.
    const eleventh = houseAt(11);
    const third = houseAt(3);
    expect(eleventh.favorable).toBe(true);
    expect(eleventh.quality).toBe(third.quality);
  });
});

describe("what his spec asks for and the engine does not have", () => {
  it("Amrita Siddhi / Sarvartha Siddhi Yoga is not implemented anywhere", async () => {
    // A 7x27 weekday-by-nakshatra grid. It is NOT typed from memory — an uncited table that looks
    // authoritative is the exact failure this run has spent the day unpicking. It needs the same
    // corpus and citation as muhurta-tables.json first.
    const { readdirSync, readFileSync } = await import("node:fs");
    const dir = new URL("../vedic/canon/", import.meta.url);
    const blob = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
    const mentioned = /Sarvartha|Amrita Siddhi/i.test(blob);
    const isOnlyTheDoctrineNote = !/\"sarvartha\"|\"amritaSiddhi\"/i.test(blob);
    expect(mentioned && isOnlyTheDoctrineNote,
      "if a Siddhi table has been added, this test must be replaced by one that checks it").toBe(true);
  });
});

describe("the muhurta gap is stated honestly", () => {
  // David listed what a professional muhurta weighs. I wrote down which of those Velea has — and my
  // first draft said Gulika was not built, which was WRONG: it exists as the natal upagraha and
  // reaches the prompt as gulikaHouse. What is missing is Gulika as a daily TIME WINDOW. Two
  // instruments, one name. This pins the distinction so the doctrine file cannot drift back.
  it("Gulika exists as a natal point and reaches the model", async () => {
    const { readFileSync } = await import("node:fs");
    const builder = readFileSync(new URL("../narrative/input-builder.ts", import.meta.url), "utf8");
    const prompts = readFileSync(new URL("../narrative/prompts.ts", import.meta.url), "utf8");
    expect(builder).toContain("gulikaHouse");
    expect(prompts).toContain("gulikaHouse");
  });

  it("the day-window instruments genuinely are absent", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const walk = (d: URL): string => readdirSync(d, { withFileTypes: true }).map((e) => {
      const p = new URL(e.name + (e.isDirectory() ? "/" : ""), d);
      return e.isDirectory() ? (e.name === "node_modules" ? "" : walk(p))
        : (/\.(ts|json)$/.test(e.name) && !/\.test\./.test(e.name) && !/doctrine/.test(e.name) ? readFileSync(p, "utf8") : "");
    }).join("\n");
    const blob = walk(new URL("../", import.meta.url));
    for (const missing of [/rahu.?kalam/i, /yamaganda/i, /durmuhurta/i, /panchaka/i]) {
      expect(blob, `${missing} appears to exist now — update crown-doctrine.md`).not.toMatch(missing);
    }
  });
});

describe("his calibration reached the prompt", () => {
  // He graded his own spec down: "these factors are intended to improve the PROBABILITY of
  // favourable outcomes, not ensure them", and pulled back "guarantees success", "extremely
  // prosperous" and "manifestation days" as stronger than the texts support.
  //
  // I added the law and no test for it — a mutation probe orphaned the section heading and nothing
  // noticed. Adding a law without a guard is the same reach failure as adding data without a law.
  it("BASE_PROMPT defines PROBABILITY, NEVER A PROMISE", async () => {
    const { BASE_PROMPT } = await import("../narrative/prompts.js");
    expect(/^PROBABILITY, NEVER A PROMISE\.$/m.test(BASE_PROMPT)).toBe(true);
  });

  it("forbids the exact overclaims he named", async () => {
    const { BASE_PROMPT } = await import("../narrative/prompts.js");
    expect(BASE_PROMPT).toMatch(/no guarantees/i);
    expect(BASE_PROMPT).toMatch(/manifestation-speak/i);
    expect(BASE_PROMPT).toMatch(/never say what it will produce/i);
  });

  it("keeps a hard tara a headwind, not a veto", async () => {
    // "Experienced astrologers don't automatically cancel important events solely because one of
    // these Taras appears." The law must say so, or the reading starts forbidding days.
    const { BASE_PROMPT } = await import("../narrative/prompts.js");
    expect(BASE_PROMPT).toMatch(/headwind, not a verdict/i);
    expect(BASE_PROMPT).toMatch(/Name the friction, do not forbid the day/i);
  });
});
