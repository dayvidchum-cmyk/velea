import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * PAID MUST OUTWEIGH FREE (David's ruling, 2026-07-20).
 *
 *   "paid surfaces must always be more words than the free day read. people are paying for deeper
 *    insight."
 *
 * It was not true. Measured before the fix:
 *   the free day read              190 words
 *   WindowRead (Life Atlas, PAID)  150   — FORTY WORDS FEWER THAN FREE
 *   TlWindowRead (paid)            200   — ten more
 *   YogaRead (paid)                210   — twenty more
 *
 * A paying reader was getting less prose than a free one on the Life Atlas window, and barely more
 * on two others. Every other paid surface sits at 360-650, so those three were the anomalies rather
 * than the design.
 *
 * THE NUMBER IS MINE, THE ORDERING IS HIS. 280 is a proposal for the three FOCUSED paid reads — he
 * can move it. What must never move is the ordering, and that is what this file guards.
 */
const SRC = readFileSync(new URL("./generate.ts", import.meta.url), "utf8");

/** Every generator's word budget, keyed by the function that owns it. */
function budgets(): Array<{ name: string; words: number; tokens: number }> {
  const out: Array<{ name: string; words: number; tokens: number }> = [];
  for (const m of SRC.matchAll(/maxTokens: (\d+), maxWords: (\d+)/g)) {
    const before = SRC.slice(Math.max(0, m.index! - 1500), m.index!);
    const owners = [...before.matchAll(/function generate(\w+)/g)].map((x) => x[1]);
    out.push({ name: owners.at(-1) ?? "?", words: Number(m[2]), tokens: Number(m[1]) });
  }
  return out;
}

// The free daily reads. Everything else is behind a gate.
const FREE = new Set(["DayRead", "Cast", "Chapter"]);

describe("the extraction can be trusted", () => {
  it("finds every generator and names it", () => {
    const b = budgets();
    expect(b.length).toBeGreaterThan(10);
    expect(b.every((x) => x.name !== "?")).toBe(true);
  });

  it("knows which surface is the free bar", () => {
    const free = budgets().filter((x) => FREE.has(x.name));
    expect(free.map((f) => f.name).sort()).toContain("DayRead");
    expect(Math.max(...free.map((f) => f.words))).toBe(190);
  });
});

describe("his rule", () => {
  it("NO paid surface gets fewer words than the free day read", () => {
    const b = budgets();
    const bar = Math.max(...b.filter((x) => FREE.has(x.name)).map((x) => x.words));
    const under = b.filter((x) => !FREE.has(x.name) && x.words <= bar)
      .map((x) => `${x.name} (${x.words} vs ${bar})`);
    expect(under, `paid surfaces at or below the free read: ${under.join(", ")}`).toEqual([]);
  });

  it("the three that violated it are specifically fixed", () => {
    const by = Object.fromEntries(budgets().map((x) => [x.name, x.words]));
    for (const n of ["WindowRead", "TlWindowRead", "YogaRead"]) {
      expect(by[n], `${n} regressed`).toBeGreaterThanOrEqual(280);
    }
  });

  it("the token ceiling actually allows the words — a budget the model cannot reach is a lie", () => {
    // maxWords only enforces; maxTokens is what lets a draft COMPLETE so the guard can correct it.
    // Raising words without raising tokens would truncate mid-sentence and then retry forever.
    //
    // I FIRST ASSERTED > 2.5 AND IT FAILED ON CORRECT CODE. The ratios are not noise: the LARGE
    // reads are deliberately set at exactly 2x (LifeArea 450/900, EclipseSeason 550/1100, Month
    // 650/1300, the rx reads 460/950), while the SHORT ones carry ~4x headroom. 2.5 was a number I
    // invented, and it flagged an intentional convention as a defect. The floor is the convention
    // actually in use.
    for (const x of budgets()) {
      expect(x.tokens / x.words, `${x.name}: ${x.tokens} tokens for ${x.words} words`).toBeGreaterThanOrEqual(2);
    }
  });

  it("the three raised surfaces kept headroom in line with their siblings", () => {
    // They landed at 4.11, next to HouseRead and DashaRead at 4.17 — the short-read convention.
    // If a later edit raises words without raising tokens, this catches it before the model starts
    // truncating mid-sentence and burning retries.
    const by = Object.fromEntries(budgets().map((x) => [x.name, x]));
    for (const n of ["WindowRead", "TlWindowRead", "YogaRead"]) {
      expect(by[n].tokens / by[n].words, n).toBeGreaterThan(3);
    }
  });
});
