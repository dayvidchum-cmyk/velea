import { describe, it, expect } from "vitest";
import { rankStandingYogas } from "./input-builder";

/**
 * A CUTOFF THAT SELECTS BY ARRAY POSITION (found 2026-07-20, on the maker's own chart).
 *
 * The gate says a yoga holding from two or more VANTAGES is the strong kind. Then `.slice(0, 4)`
 * took the first four in detection order and discarded that signal. Measured on his chart: twelve
 * yogas detected, six passed the gate, and the four that reached the model were all single-frame —
 * while Sarpa and Dur, the only two holding from two vantages, were cut for being fifth and sixth
 * in the array. Identical in shape to the crown-day cutoff taking the twelve earliest dates.
 *
 * The fixture below is his real chart's gate-passing set, in the order detectYogas returns them.
 */
const HIS_CHART = [
  { name: "Dharma Karma Adhipati", frames: [1], inNavamsha: true },
  { name: "Veshi", frames: [1], inNavamsha: true },
  { name: "Vashi", frames: [1], inNavamsha: true },
  { name: "Ubhayachari", frames: [1], inNavamsha: true },
  { name: "Sarpa", frames: [1, 2], inNavamsha: true },
  { name: "Dur", frames: [1, 2], inNavamsha: true },
];

describe("standing yogas — everything the gate calls strong ships, strongest first", () => {
  it("orders by vantages, not by position in the array", () => {
    const shipped = rankStandingYogas(HIS_CHART).map((y) => y.name);
    expect(shipped.slice(0, 2)).toEqual(["Sarpa", "Dur"]);

    // CONTROL — the unsorted cap, which is what shipped before v884, and what this exists to stop.
    const oldBehaviour = HIS_CHART.slice(0, 4).map((y) => y.name);
    expect(oldBehaviour).toEqual(["Dharma Karma Adhipati", "Veshi", "Vashi", "Ubhayachari"]);
    expect(shipped.slice(0, 4), "the ranked set is identical to the unsorted one — the sort did nothing")
      .not.toEqual(oldBehaviour);
    // The two-vantage ones must lead, since they are the whole point of the ranking.
    expect(shipped).toContain("Sarpa");
    expect(shipped).toContain("Dur");
  });

  it("still applies the gate — a one-vantage yoga outside the navamsha never ships", () => {
    const withWeak = [...HIS_CHART, { name: "Kemadruma", frames: [1], inNavamsha: false }];
    expect(rankStandingYogas(withWeak).map((y) => y.name)).not.toContain("Kemadruma");
    // ANCHOR: the same yoga DOES ship once it holds from two vantages, so the gate is the
    // strength test here and not the name.
    const strong = [{ name: "Kemadruma", frames: [1, 3], inNavamsha: false }];
    expect(rankStandingYogas(strong).map((y) => y.name)).toEqual(["Kemadruma"]);
  });

  it("an EXCHANGE ships on one vantage — David's ruling, 2026-07-21", () => {
    // A Parivartana is a whole-chart fact, so it can only ever score one vantage and was cut.
    // Gated on the canon TYPE, never the name.
    const pari = { name: "Parivartana", type: "exchange", frames: [1], inNavamsha: false };
    expect(rankStandingYogas([...HIS_CHART, pari]).map((y) => y.name)).toContain("Parivartana");

    // CONTROL 1 — an identically-shaped yoga that is NOT an exchange stays out, so it is the type
    // doing the work and not the extra array entry.
    const notPari = { name: "Kala Sarpa", type: "nodal-affliction", frames: [1], inNavamsha: false };
    expect(rankStandingYogas([...HIS_CHART, notPari]).map((y) => y.name)).not.toContain("Kala Sarpa");

    // CONTROL 2 — the name alone must not admit it. A Parivartana with the type stripped is
    // exactly what a stale research row looks like, and it must fail the gate like anything else.
    const untyped = { name: "Parivartana", frames: [1], inNavamsha: false };
    expect(rankStandingYogas([...HIS_CHART, untyped]).map((y) => y.name)).not.toContain("Parivartana");
  });

  it("ships EVERY yoga that passes the gate — no cap (David's ruling, 2026-07-21)", () => {
    // Six passed the gate on his chart and four shipped; Veshi, Vashi and Ubhayachari were
    // discarded by a hardcoded 4 after the gate had already called them worth naming.
    expect(rankStandingYogas(HIS_CHART)).toHaveLength(6);
    expect(rankStandingYogas(HIS_CHART).map((y) => y.name)).toEqual([
      "Sarpa", "Dur", "Dharma Karma Adhipati", "Veshi", "Vashi", "Ubhayachari",
    ]);
    // With the exchange counted, all seven ship — the trade that used to cost him Veshi is gone.
    const pari = { name: "Parivartana", type: "exchange", frames: [1], inNavamsha: false };
    expect(rankStandingYogas([...HIS_CHART, pari])).toHaveLength(7);
    // An explicit limit is still honoured for a caller that genuinely needs one.
    expect(rankStandingYogas(HIS_CHART, 1).map((y) => y.name)).toEqual(["Sarpa"]);
  });

  it("survives the shapes the research store can actually hand it", () => {
    expect(rankStandingYogas([])).toEqual([]);
    expect(rankStandingYogas(undefined as any)).toEqual([]);
    expect(rankStandingYogas([{ name: "no frames field", inNavamsha: true } as any])).toHaveLength(1);
    expect(rankStandingYogas([null as any, { name: "ok", frames: [1, 2] }])).toHaveLength(1);
  });
});
