import { describe, it, expect } from "vitest";
import { neechaBhanga, planetDignity } from "./dignity.js";

/**
 * THE KENDRA TAUTOLOGY, and David's condition 3 (v871).
 *
 * He listed six neecha-bhanga conditions. I had built four and a half. For condition 3 — "the
 * debilitated planet ITSELF in a kendra" — I had researched the verses, decided the popular reading
 * was a mistranslation, and told him so instead of building it. His reply: "huh????? i feel like you
 * are overcomplicating this." He was right: which authority Velea follows was always his call, he
 * had already made it by writing the condition down, and I reopened a settled question as a seminar.
 *
 * Building it is what exposed the real bug. THE MOON IS IN THE 1ST HOUSE FROM ITSELF IN EVERY CHART
 * EVER CAST. Since "in a kendra" is tested from the ascendant OR the Moon, any condition whose
 * subject is the Moon answered YES unconditionally — an identity, not a fact about the chart:
 *
 *   · Mars debilitated in CANCER — dispositor is the Moon (condition 1). SHIPPED BUG, predates me.
 *   · Jupiter debilitated in CAPRICORN — exalts in Cancer, whose lord is the Moon (condition 3).
 *     SHIPPED BUG, predates me.
 *   · a debilitated Moon under the new condition 7.
 *
 * Both shipped bugs had been live and silent. They were found by MEASURING the new rule's effect
 * rather than by reading the diff — which is the only reason I looked at the helper at all.
 */

const DEBIL = { Sun: 190, Moon: 218, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20 };
const chart = (over: Partial<Record<string, number>>) =>
  ({ Sun: 5, Moon: 5, Mars: 5, Mercury: 5, Jupiter: 5, Venus: 5, Saturn: 5, ...over }) as any;

describe("the fixtures are what I claim they are (controls first)", () => {
  it("every planet is genuinely debilitated at its test longitude", () => {
    for (const [p, lon] of Object.entries(DEBIL)) {
      expect(planetDignity(p as any, lon), `${p}@${lon}`).toBe("debilitated");
    }
  });
});

describe("David's condition 3 — the debilitated planet itself in a kendra", () => {
  it("fires when the fallen planet sits in a kendra from the ascendant", () => {
    // Sun falls in Libra (190°). From an Aries ascendant that is the 7th — a kendra.
    const nb = neechaBhanga("Sun", chart({ Sun: DEBIL.Sun, Moon: 100 }), 0);
    expect(nb.reasons.join(" | ")).toMatch(/Sun itself in a kendra/);
  });

  it("does NOT fire when it sits outside every kendra", () => {
    // Same fallen Sun, ascendant Taurus (30°): Libra is the 6th, and the Moon is placed so the
    // chandra-lagna frame does not rescue it either.
    const nb = neechaBhanga("Sun", chart({ Sun: DEBIL.Sun, Moon: 130 }), 30);
    expect(nb.reasons.join(" | ")).not.toMatch(/Sun itself in a kendra/);
  });

  it("is credited to the planet itself, so its OWN dasha activates it", () => {
    // No rescuer is involved in this condition, so under the canon's dashaGate rule the period that
    // lights it is the fallen planet's own. If `by` omitted it, the yoga could never activate.
    const nb = neechaBhanga("Sun", chart({ Sun: DEBIL.Sun, Moon: 100 }), 0);
    expect(nb.by).toContain("Sun");
  });
});

describe("the Moon's self-reference is not evidence of anything", () => {
  // Each of these was 100% before the fix. The assertion is simply that a counterexample EXISTS —
  // that the chart can change the answer at all.
  const varyMoon = (subject: any, subjectLon: number, reason: RegExp) => {
    const fired = new Set<boolean>();
    for (let m = 0; m < 360; m += 5) {
      const nb = neechaBhanga(subject, chart({ [subject]: subjectLon, Moon: m }), 0);
      fired.add(reason.test(nb.reasons.join(" | ")));
    }
    return fired;
  };

  it("Mars in Cancer is no longer cancelled by its dispositor in EVERY chart", () => {
    const fired = varyMoon("Mars", DEBIL.Mars, /dispositor Moon/);
    expect(fired.has(false), "the Moon's position still cannot change the answer").toBe(true);
    expect(fired.has(true), "the condition can no longer fire at all — overcorrected").toBe(true);
  });

  it("Jupiter in Capricorn is no longer cancelled by the Cancer lord in EVERY chart", () => {
    const fired = varyMoon("Jupiter", DEBIL.Jupiter, /lord of Jupiter's exaltation/);
    expect(fired.has(false)).toBe(true);
    expect(fired.has(true)).toBe(true);
  });

  it("a debilitated Moon is not automatically 'in a kendra'", () => {
    // The Moon's own placement IS the chandra-lagna, so only the ascendant frame can answer here.
    // Scorpio Moon, Scorpio ascendant → 1st → kendra → fires.
    expect(neechaBhanga("Moon", chart({ Moon: DEBIL.Moon }), 210).reasons.join(" | "))
      .toMatch(/Moon itself in a kendra/);
    // Scorpio Moon, Sagittarius ascendant → 12th → not a kendra → silent.
    expect(neechaBhanga("Moon", chart({ Moon: DEBIL.Moon }), 245).reasons.join(" | "))
      .not.toMatch(/Moon itself in a kendra/);
  });

  it("the ascendant frame is untouched — this fixed the Moon, not the kendra", () => {
    // A non-Moon subject must still be testable from BOTH frames. Saturn falls in Aries (20°);
    // ascendant Cancer (100°) puts Aries in the 10th — a kendra from the lagna, no Moon involved.
    const nb = neechaBhanga("Saturn", chart({ Saturn: DEBIL.Saturn, Moon: 200 }), 100);
    expect(nb.reasons.join(" | ")).toMatch(/Saturn itself in a kendra/);
  });
});

describe("the base rate is pinned, because 'cancelled' has to MEAN something", () => {
  /**
   * Velea currently cancels ~96% of all debilitations, and ~60% read to the user as "acting as
   * exalted". Only ~4% of fallen planets are read as fallen. That is David's own criticism of other
   * tools — "they check only one or two rules and then label a planet Neecha Bhanga without
   * considering whether the cancellation is meaningful in the context of the whole chart."
   *
   * The cause is structural: cancellation is an OR over conditions that are individually near
   * coin-flips (a kendra from either frame covers ~half the zodiac), so ORing seven of them is
   * close to a certainty. Raising the bar is a METHOD change that would move every existing user's
   * chart, so it is David's ruling and is NOT made here. This test only makes the rate VISIBLE, so
   * it can never drift again without someone being told.
   */
  const rate = () => {
    let seed = 4242;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const G = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as const;
    let total = 0, cancelled = 0;
    for (let t = 0; t < 20000; t++) {
      const p = G[Math.floor(rnd() * 7)];
      const lonBy: any = {};
      for (const g of G) lonBy[g] = rnd() * 360;
      lonBy[p] = (DEBIL as any)[p];
      if (planetDignity(p as any, lonBy[p]) !== "debilitated") continue;
      total++;
      if (neechaBhanga(p as any, lonBy, rnd() * 360).cancelled) cancelled++;
    }
    return cancelled / total;
  };

  it("records today's cancellation rate — change this number ONLY on purpose", () => {
    // CHANGED ON PURPOSE, 2026-07-20: David ruled "two, with three+ as solid", and the rate moved
    // from 96% to ~76%. He was shown the whole curve first (>=1 -> 96%, >=2 -> 76%, >=3 -> 55%,
    // >=4 -> 25%) and picked the bar. Nothing was removed; the evidence bar moved.
    const r = rate();
    expect(r).toBeGreaterThan(0.72);
    expect(r).toBeLessThan(0.80);
  });

  it("the tautology fix stays fixed — the rate cannot climb back toward certainty", () => {
    // At a one-condition bar this sat at 97%. If a future edit drops the `who` argument at any call
    // site, or lowers the threshold, the rate rises and this fails.
    expect(rate()).toBeLessThan(0.85);
  });

  it("a fallen planet actually reads as fallen a meaningful share of the time", () => {
    // The point of the ruling. At the old bar only ~3% of debilitations survived as plain falls,
    // which made "debilitated" a word Velea never really said.
    expect(1 - rate()).toBeGreaterThan(0.15);
  });
});

describe("David's ruling: two conditions cancel, three or more is solid", () => {
  /**
   * Ruled 2026-07-20 after being shown the curve: ≥1 → 96%, ≥2 → 76%, ≥3 → 55%, ≥4 → 25%.
   * He chose two. Nothing classical was removed — the EVIDENCE BAR moved, which is the difference
   * between this and dropping a condition.
   */
  // Saturn falls in Aries (20°). Ascendant Aries (0°) makes that the 1st — a kendra — so his
  // condition 7 fires. Every possible rescuer sits in Leo (130°), the 5th from both the ascendant
  // and the Moon, so none of them qualifies.
  //
  // MY FIRST ATTEMPT AT THIS FIXTURE WAS WRONG and the control below caught it. I had parked the
  // rescuers at 130° AND put the Moon at 130° too — which placed every one of them in the 1st house
  // from the Moon, a kendra. It fired four conditions, not one. That is the whole argument for
  // asserting the fixture's own count before asserting anything about the threshold.
  const base = (moon: number) =>
    ({ Sun: 130, Moon: moon, Mars: 130, Mercury: 130, Jupiter: 130, Venus: 130, Saturn: 20 }) as any;
  const one = () => neechaBhanga("Saturn", base(0), 0);

  it("CONTROL: the one-condition fixture really does fire exactly one condition", () => {
    // Without this the next assertion could pass because zero conditions fired, not one.
    expect(one().count).toBe(1);
  });

  it("one condition is no longer enough", () => {
    expect(one().cancelled).toBe(false);
    expect(one().solid).toBe(false);
  });

  it("two conditions cancel, but are not yet solid", () => {
    // Sweeping the Moon alone off `base` never lands on exactly two — it jumps 1 → 3. Found by
    // searching where the rescuers sit instead: parked in Virgo (160°), Mars aspects the fallen
    // Saturn (its 8th) while none of them reaches a kendra, so exactly two conditions hold.
    const c = { Sun: 160, Moon: 0, Mars: 160, Mercury: 160, Jupiter: 160, Venus: 160, Saturn: 20 } as any;
    const found = neechaBhanga("Saturn", c, 0);
    expect(found.count, "fixture no longer fires exactly two conditions").toBe(2);
    expect(found.cancelled).toBe(true);
    expect(found.solid).toBe(false);
  });

  it("three conditions is solid", () => {
    let found: any = null;
    for (let m = 0; m < 360 && !found; m += 1) {
      const nb = neechaBhanga("Saturn", base(m), 0);
      if (nb.count >= 3) found = nb;
    }
    expect(found, "no 3-condition chart in the sweep").toBeTruthy();
    expect(found.cancelled).toBe(true);
    expect(found.solid).toBe(true);
  });

  it("solid never implies an outcome — it counts evidence, not fortune", () => {
    // His doctrine keeps cancellation and raja yoga separate: "Not everyone with Neecha Bhanga
    // experiences extraordinary success."
    let found: any = null;
    for (let m = 0; m < 360 && !found; m += 1) {
      const nb = neechaBhanga("Saturn", base(m), 0);
      if (nb.solid) found = nb;
    }
    expect(JSON.stringify(found)).not.toMatch(/raja|guarantee|success/i);
  });
});
