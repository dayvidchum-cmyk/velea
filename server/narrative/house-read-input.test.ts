import { describe, expect, it } from "vitest";
import { buildHouseReadInput } from "./service";

// CONTROLS for the House Reader's missing condition data. Every assertion below fails against the
// pre-2026-07-20 input, which passed only `data` — where the lord is {planet, placedHouse,
// placedSign, bhavaYoga}: where the keeper LIVES, never how he IS.

/** A research object with the same shape the engine stores, for two very different Venuses. */
function research(venus: "exalted" | "fallen") {
  return {
    engineVersion: "test",
    anchors: { lagna: { sign: "Sagittarius" } },
    planets: {
      Venus: venus === "exalted"
        ? { sign: "Pisces", house: 4, dignity: { state: "exalted" }, shadbala: { ratio: 1.4 },
            vimshopak: { points: { shodasha: 14 } }, avashtas: { jagradaadi: "jagrat", lajjitaadi: [] }, deepthaadi: [] }
        : { sign: "Virgo", house: 10, dignity: { state: "debilitated", neechaBhanga: { cancelled: true } }, shadbala: { ratio: 0.6 },
            vimshopak: { points: { shodasha: 6 } }, avashtas: { jagradaadi: "sushupti", lajjitaadi: [] }, deepthaadi: ["vikala"] },
      Saturn: { sign: "Aquarius", house: 3, dignity: { state: "own sign" }, shadbala: { ratio: 1.2 },
        vimshopak: { points: { shodasha: 13 } }, avashtas: { jagradaadi: "jagrat", lajjitaadi: [] }, deepthaadi: [] },
    },
    houses: [
      // house 1 — the free flagship room, and the ONLY house with no varga route
      { house: 1, sign: "Sagittarius", occupants: ["Saturn"], grahaAspects: [], rashiAspects: [],
        lord: { planet: "Venus", placedHouse: 4, placedSign: "Pisces", bhavaYoga: "L1-in-4" },
        bhavaYogasToHouse: [], vargaCheck: null },
    ],
  };
}

describe("buildHouseReadInput — the room's keeper reaches the model IN CONDITION", () => {
  it("carries the lord's real dignity, strength and states, not just where he lives", () => {
    const input = buildHouseReadInput(research("exalted"), 1)!;
    expect(input.lordCondition).toBeDefined();
    expect(input.lordCondition!.planet).toBe("Venus");
    expect(input.lordCondition!.dignity).toContain("exalted");
    expect(input.lordCondition!.strength).toContain("strong");
    expect(input.lordCondition!.states).toContain("awake (full capacity)");
  });

  it("an exalted keeper and a fallen one produce DIFFERENT data — the whole point", () => {
    const up = buildHouseReadInput(research("exalted"), 1)!.lordCondition!;
    const down = buildHouseReadInput(research("fallen"), 1)!.lordCondition!;
    expect(down).not.toEqual(up); // denominator: both exist and are comparable
    expect(down.dignity).toContain("debilitated");
    expect(down.dignity).toContain("CANCELLED"); // hard-won strength, never read as weakness
    expect(down.strength).toContain("thin");
    expect(down.states).toContain("asleep (needs its friends to act)");
    expect(down.states.join(" ")).toContain("combust");
  });

  it("occupants arrive in condition too, not as bare names", () => {
    const input = buildHouseReadInput(research("exalted"), 1)!;
    expect(input.occupantConditions).toHaveLength(1); // denominator: the room has one occupant
    expect(input.occupantConditions![0].planet).toBe("Saturn");
    expect(input.occupantConditions![0].dignity).toContain("own sign");
  });

  it("house 1 — no varga route — still hands the model a keeper it can describe", () => {
    const input = buildHouseReadInput(research("fallen"), 1)!;
    expect(input.data.vargaCheck).toBeNull(); // this is what left the old read with nothing
    expect(input.lordCondition).toBeTruthy();
  });

  it("a house the research does not have returns null rather than a half-built input", () => {
    expect(buildHouseReadInput(research("exalted"), 7)).toBeNull();
    expect(buildHouseReadInput(null, 1)).toBeNull();
  });
});
