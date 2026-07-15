import { describe, it, expect } from "vitest";
import { dayFilter, NATURE_LABEL } from "./day-filter";

const base = { varaLord: "Jupiter", vishti: false, tara: null };

describe("day filter — the classical tables (David-blessed 2026-07-15)", () => {
  it("classifies every nakshatra into its one nature (spot checks per class)", () => {
    expect(dayFilter({ ...base, nakshatra: "Rohini", tithiNumber: 2 }).nature).toBe("fixed");
    expect(dayFilter({ ...base, nakshatra: "Swati", tithiNumber: 2 }).nature).toBe("movable");
    expect(dayFilter({ ...base, nakshatra: "Pushya", tithiNumber: 2 }).nature).toBe("swift");
    expect(dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 2 }).nature).toBe("tender");
    expect(dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 2 }).nature).toBe("sharp");
    expect(dayFilter({ ...base, nakshatra: "Magha", tithiNumber: 2 }).nature).toBe("fierce");
    expect(dayFilter({ ...base, nakshatra: "Krittika", tithiNumber: 2 }).nature).toBe("mixed");
  });

  it("maps tithis to families in both pakshas (Nanda 1/6/11 · Rikta 4/9/14 · Purna 5/10/15)", () => {
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 1 }).family).toBe("nanda");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 16 }).family).toBe("nanda"); // Krishna 1st
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 9 }).family).toBe("rikta");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 24 }).family).toBe("rikta");
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 30 }).family).toBe("purna"); // Amavasya
    expect(dayFilter({ ...base, nakshatra: "Hasta", tithiNumber: 8 }).family).toBe("jaya");
  });

  it("a tender day in a work tithi supports the soft and the useful, avoids the cut", () => {
    const d = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 7 });
    expect(d.headline).toBe("a tender day in a work tithi");
    expect(d.supports.join(" ")).toMatch(/love|friendship|art/);
    expect(d.supports.join(" ")).toMatch(/work|health|constructive/);
    expect(d.avoid.join(" ")).toMatch(/confrontation|cutting/);
    expect(d.sentence).toMatch(/^A tender day/);
  });

  it("rikta empties every nature except the cutting ones", () => {
    const soft = dayFilter({ ...base, nakshatra: "Revati", tithiNumber: 4 });
    expect(soft.supports).toEqual(["cutting and severing acts only"]);
    expect(soft.vetoes.join(" ")).toMatch(/empty tithi/);
    const sharp = dayFilter({ ...base, nakshatra: "Mula", tithiNumber: 4 });
    expect(sharp.supports.join(" ")).toMatch(/decisive cuts|endings/);
  });

  it("vishti and the Mercury contest strip beginnings without walling the day", () => {
    const v = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 1, vishti: true });
    expect(v.vetoes.join(" ")).toMatch(/initiating is blocked/);
    expect(v.supports.join(" ")).not.toMatch(/beginnings/i);
    const m = dayFilter({ ...base, nakshatra: "Anuradha", tithiNumber: 1, mercuryContest: true });
    expect(m.vetoes.join(" ")).toMatch(/Mercury/);
    expect(m.supports.length).toBeGreaterThan(0); // contest, never a wall
  });

  it("the personal ladder outranks the collective: a full-force loss day is contained", () => {
    const d = dayFilter({
      ...base, nakshatra: "Pushya", tithiNumber: 5, // sweet limbs
      tara: { quality: "bad", taraNum: 7, cycle: 1 },
    });
    expect(d.contained).toBe(true);
    expect(d.sentence).toMatch(/nothing new|keep everything small|let it pass/i);
    // softened rounds do NOT contain
    const soft = dayFilter({ ...base, nakshatra: "Pushya", tithiNumber: 5, tara: { quality: "mixed", taraNum: 7, cycle: 2 } });
    expect(soft.contained).toBe(false);
  });

  it("all seven natures carry labels", () => {
    for (const label of Object.values(NATURE_LABEL)) expect(label).toMatch(/day/);
  });
});
