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

  // ── THE HALF THIS FILE USED TO MISS (audit, 2026-07-20) ───────────────────────────────────────
  // Everything above reads generate.ts, where maxWords is a CEILING — guardViolation only rejects
  // a draft for being TOO LONG. Raising it does not make the model write more. What the reader
  // actually receives is set by the instruction in prompts.ts, and those were never touched:
  // the Life Atlas window still said "aim ~120 words, hard cap 150" while this file asserted 280
  // and passed. The row was marked fixed on the strength of a test that could not see the defect.
  const PROMPTS = readFileSync(new URL("./prompts.ts", import.meta.url), "utf8");

  /** The word instruction inside a tail constant, and the surface it belongs to. */
  function aims(): Array<{ tail: string; aim: number; cap: number }> {
    const out: Array<{ tail: string; aim: number; cap: number }> = [];
    for (const m of PROMPTS.matchAll(/THE READ \(~?(?:aim ~)?(\d+) words, hard cap (\d+)/g)) {
      const before = PROMPTS.slice(0, m.index!);
      const owner = [...before.matchAll(/export const (\w+_TAIL) =/g)].at(-1)?.[1] ?? "?";
      out.push({ tail: owner, aim: Number(m[1]), cap: Number(m[2]) });
    }
    return out;
  }

  /** The free day read's own instruction — the bar every paid surface must clear. */
  function freeAim(): number {
    const m = PROMPTS.match(/HARD LENGTH LIMIT — (\d+) WORDS TOTAL/);
    if (!m) throw new Error("free day read's length instruction not found — this test is blind");
    return Number(m[1]);
  }

  const TAIL_TO_GENERATOR: Record<string, string> = {
    WINDOW_READ_TAIL: "WindowRead",
    YOGA_READ_TAIL: "YogaRead",
    TL_WINDOW_TAIL: "TlWindowRead",
  };

  it("the extraction can be trusted — every tail is found and named", () => {
    const a = aims();
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.every((x) => x.tail !== "?")).toBe(true);
    expect(freeAim()).toBe(175); // anchor: if this moves, the bar below moved with it
  });

  it("NO paid surface is INSTRUCTED to write fewer words than the free day read", () => {
    const bar = freeAim();
    const under = aims().filter((x) => TAIL_TO_GENERATOR[x.tail] && x.aim <= bar)
      .map((x) => `${x.tail} (aims ${x.aim} vs free ${bar})`);
    expect(under, `paid prompts at or below the free read: ${under.join(", ")}`).toEqual([]);
  });

  it("the prompt's hard cap matches the ceiling the code enforces — two numbers, one truth", () => {
    // A prompt cap BELOW maxWords silently makes the enforced budget unreachable; a prompt cap
    // ABOVE it means every draft gets rejected and retried at cost.
    const by = Object.fromEntries(budgets().map((x) => [x.name, x.words]));
    for (const x of aims()) {
      const gen = TAIL_TO_GENERATOR[x.tail];
      if (!gen) continue;
      expect(x.cap, `${x.tail} caps at ${x.cap} but ${gen} enforces ${by[gen]}`).toBe(by[gen]);
    }
  });

  it("a prompt change to these three moved their cache salt, or readers keep the old prose", () => {
    // Changing the instruction without moving SURFACE_VERSION leaves every cached paid read
    // serving the shorter prose forever. Per-surface salt, never PROMPT_VERSION — a global bump
    // regenerates (and re-bills) every surface for every profile.
    for (const s of ["window_read", "yoga_read", "tl_window"]) {
      const m = PROMPTS.match(new RegExp(`${s}: "([^"]+)"`));
      expect(m?.[1], `${s} has no salt`).toBeTruthy();
      expect(m![1], `${s} still on the pre-fix salt`).not.toMatch(/tense-law|yoga-reader-v1/);
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
