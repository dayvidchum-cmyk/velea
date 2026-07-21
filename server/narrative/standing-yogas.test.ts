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

describe("standing yogas — the four that ship are the four the gate calls strongest", () => {
  it("ranks by vantages before capping, not by position in the array", () => {
    const shipped = rankStandingYogas(HIS_CHART).map((y) => y.name);
    expect(shipped).toEqual(["Sarpa", "Dur", "Dharma Karma Adhipati", "Veshi"]);

    // CONTROL — the unsorted cap, which is what shipped before, and what this test exists to stop.
    const oldBehaviour = HIS_CHART.slice(0, 4).map((y) => y.name);
    expect(oldBehaviour).toEqual(["Dharma Karma Adhipati", "Veshi", "Vashi", "Ubhayachari"]);
    expect(shipped, "the ranked set is identical to the unsorted one — the sort did nothing")
      .not.toEqual(oldBehaviour);
    // and the two-vantage ones must BOTH survive, since they are the whole point
    expect(shipped).toContain("Sarpa");
    expect(shipped).toContain("Dur");
  });

  it("still applies the gate — a one-vantage yoga outside the navamsha never ships", () => {
    // Parivartana on his chart is exactly this shape: frames [1], not in the navamsha.
    const withWeak = [...HIS_CHART, { name: "Parivartana", frames: [1], inNavamsha: false }];
    expect(rankStandingYogas(withWeak, 99).map((y) => y.name)).not.toContain("Parivartana");
    // ANCHOR: the same yoga DOES ship once it holds from two vantages, so the gate is the
    // filter here and not the name.
    const strong = [{ name: "Parivartana", frames: [1, 3], inNavamsha: false }];
    expect(rankStandingYogas(strong).map((y) => y.name)).toEqual(["Parivartana"]);
  });

  it("caps at four by default and honours an explicit limit", () => {
    expect(rankStandingYogas(HIS_CHART)).toHaveLength(4);
    expect(rankStandingYogas(HIS_CHART, 6)).toHaveLength(6);
    expect(rankStandingYogas(HIS_CHART, 1).map((y) => y.name)).toEqual(["Sarpa"]);
  });

  it("survives the shapes the research store can actually hand it", () => {
    expect(rankStandingYogas([])).toEqual([]);
    expect(rankStandingYogas(undefined as any)).toEqual([]);
    expect(rankStandingYogas([{ name: "no frames field", inNavamsha: true } as any])).toHaveLength(1);
    expect(rankStandingYogas([null as any, { name: "ok", frames: [1, 2] }])).toHaveLength(1);
  });
});
