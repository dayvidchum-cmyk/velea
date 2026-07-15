import { describe, it, expect } from "vitest";
import { computeNatalResearch, type ResearchInput } from "./house-research";
import { GRAHAS } from "./dignity";

/** A deterministic timed chart: Aries lagna 15°, planets spread across signs. */
function input(overrides: Partial<ResearchInput> = {}): ResearchInput {
  return {
    lonBy: {
      Sun: 40, Moon: 190, Mars: 100, Mercury: 70, Jupiter: 95,
      Venus: 20, Saturn: 305, Rahu: 130, Ketu: 310,
    },
    speedBy: { Sun: 0.98, Moon: 13.2, Mars: 0.5, Mercury: 1.2, Jupiter: 0.08, Venus: 1.1, Saturn: 0.03 },
    declBy: { Sun: 10, Moon: -5, Mars: 15, Mercury: 8, Jupiter: 20, Venus: 2, Saturn: -18 },
    lagnaLon: 15,
    mcLon: 280,
    birthUtcMs: Date.UTC(1990, 5, 15, 8, 30),
    latitude: 34.05,
    longitude: -118.24,
    basis: "ascendant",
    isDayBirth: true,
    vedicWeekday: 5, // Friday
    kalavelaLongitudes: { gulika: 200, yamakantaka: 95, kala: 10, paridhi: 40, ardhaprahara: 70, indrachapaK: 130, mrityu: 160 },
    ...overrides,
  };
}

describe("house research — structure and referential integrity", () => {
  const r = computeNatalResearch(input());

  it("emits 12 houses, 7 planets, and the three anchors", () => {
    expect(r.houses).toHaveLength(12);
    expect(Object.keys(r.planets)).toHaveLength(7);
    expect(r.anchors.lagna.sign).toBe("Aries");
    expect(r.anchors.lagna.lord).toBe("Mars");
    expect(r.anchors.moon.sign).toBe("Libra");
  });

  it("whole-sign houses: signs run in order from the lagna", () => {
    expect(r.houses[0].sign).toBe("Aries");
    expect(r.houses[6].sign).toBe("Libra");
    expect(r.houses[11].sign).toBe("Pisces");
  });

  it("every house lord's bhava-yoga key is consistent with its placement", () => {
    for (const h of r.houses) {
      expect(h.lord.bhavaYoga).toBe(`L${h.house}H${h.lord.placedHouse}`);
      expect(r.planets[h.lord.planet].house).toBe(h.lord.placedHouse);
    }
  });

  it("bhavaYogasToHouse is the exact reverse index of lord placements", () => {
    for (const h of r.houses) {
      for (const key of h.bhavaYogasToHouse) {
        const m = key.match(/^L(\d+)H(\d+)$/)!;
        expect(Number(m[2])).toBe(h.house);
        const fromHouse = r.houses[Number(m[1]) - 1];
        expect(fromHouse.lord.placedHouse).toBe(h.house);
      }
    }
  });

  it("occupants place every body exactly once across the 12 houses", () => {
    const all = r.houses.flatMap((h) => h.occupants);
    expect(all.sort()).toEqual([...GRAHAS, "Rahu", "Ketu"].sort());
  });

  it("aspecters carry the houses they rule (the wiring David's directive names)", () => {
    for (const h of r.houses) {
      for (const a of [...h.grahaAspects, ...h.rashiAspects]) {
        expect(a.rules.length).toBeGreaterThanOrEqual(1);
        expect(a.rules.length).toBeLessThanOrEqual(2);
        for (const ruled of a.rules) {
          expect(r.houses[ruled - 1].lord.planet).toBe(a.planet);
        }
      }
    }
  });
});

describe("house research — Appendix IV varga routing", () => {
  const r = computeNatalResearch(input());

  it("each house reads its own varga with its own karakas", () => {
    const byHouse = Object.fromEntries(r.houses.map((h) => [h.house, h.vargaCheck]));
    expect(byHouse[1]).toBeNull(); // the lagna itself — anchors carry it
    expect(byHouse[2]?.varga).toBe("D2");
    expect(byHouse[2]?.karakas.map((k) => k.planet)).toEqual(["Moon"]);
    expect(byHouse[8]?.varga).toBe("D20");
    expect(byHouse[9]?.varga).toBe("D9");
    expect(byHouse[10]?.varga).toBe("D10");
    expect(byHouse[10]?.karakas.map((k) => k.planet)).toEqual(["Saturn", "Sun"]);
    expect(byHouse[12]?.varga).toBe("D12");
    expect(byHouse[12]?.nodes).toBeDefined(); // Rahu/Ketu ancestral placements
  });

  it("varga states carry sign, dignity and jagradaadi", () => {
    const v = r.houses[8].vargaCheck!; // 9th house → D9
    expect(v.lordInVarga.sign).toBeTruthy();
    expect(["jagrat", "svapna", "sushupti"]).toContain(v.lordInVarga.jagradaadi);
  });
});

describe("house research — honesty gates", () => {
  it("a timed chart with full inputs has no pending sources", () => {
    const r = computeNatalResearch(input());
    expect(r.pending).toEqual([]);
    for (const g of GRAHAS) expect(r.planets[g].shadbala.rupas).not.toBeNull();
  });

  it("a Chandra (no-time) chart stays partial: dig/kala pending, no fake rupas", () => {
    const r = computeNatalResearch(input({
      basis: "chandra", mcLon: null, birthUtcMs: null,
      lagnaLon: 190, // Moon-as-1st
      isDayBirth: null, vedicWeekday: null, kalavelaLongitudes: null,
    }));
    expect(r.basis).toBe("chandra");
    expect(r.pending).toEqual(expect.arrayContaining(["dig", "kala"]));
    for (const g of GRAHAS) expect(r.planets[g].shadbala.rupas).toBeNull();
    // The research itself still computes: houses, lords, avashtas, aspects all present.
    expect(r.houses).toHaveLength(12);
    expect(r.houses[0].sign).toBe("Libra");
  });

  it("atmakaraka is the planet with the highest degrees in its sign (K&F Appendix IV)", () => {
    const r = computeNatalResearch(input());
    // degInSign: Sun 10, Moon 10, Mars 10, Mercury 10, Jupiter 5, Venus 20, Saturn 5 → Venus
    expect(r.anchors.atmakaraka.planet).toBe("Venus");
  });
});

describe("house research v2 — the both-volumes layers", () => {
  const r = computeNatalResearch(input());

  it("every planet carries Vimshopak (all four groups ≤ 20) and Deepthaadi states", () => {
    for (const g of GRAHAS) {
      const p = r.planets[g];
      for (const grp of ["shad", "sapta", "dasha", "shodasha"] as const) {
        expect(p.vimshopak.points[grp]).toBeGreaterThan(0);
        expect(p.vimshopak.points[grp]).toBeLessThanOrEqual(20);
      }
      expect(p.vimshopak.classification).toBeTruthy();
      expect(p.deepthaadi.length).toBeGreaterThan(0);
    }
  });

  it("chara karakas rank the seven by degrees-in-sign; karakamsha is the AK's D9 sign", () => {
    const ck = r.charaKarakas;
    // degInSign: Venus 20 is highest → Atma; Jupiter 5 / Saturn 5 lowest pair.
    expect(ck.karakas.atma).toBe("Venus");
    expect(new Set(Object.values(ck.karakas)).size).toBe(7); // all distinct
    expect(ck.karakamsha).toBeTruthy();
  });

  it("birth panchang: tithi/paksha/yoga/karana from Sun+Moon, vara from the weekday", () => {
    const bp = r.birthPanchang!;
    // Sun 40, Moon 190 → elongation 150° → tithi 13 (Trayodashi), Shukla.
    expect(bp.tithi.number).toBe(13);
    expect(bp.tithi.paksha).toBe("Shukla");
    expect(bp.vara).toBe("Venus"); // Friday
    expect(bp.yoga.number).toBe(Math.floor(((40 + 190) % 360) / (360 / 27)) + 1);
    expect(bp.karana.name).toBeTruthy();
  });

  it("upagrahas: the Dhooma five close their cycle back to the Sun; kalavelas placed", () => {
    const d = r.upagrahas.dhooma;
    expect(d.dhooma.longitude).toBeCloseTo((40 + 133 + 20 / 60) % 360, 3);
    expect((d.upaketu.longitude + 30) % 360).toBeCloseTo(40, 3); // Upaketu + 30° = Sun
    expect(r.upagrahas.kalavelas!.gulika.house).toBe(7); // 200° = Libra = 7th from Aries lagna
  });

  it("yogas: detected with frames and navamsha flags; Buddhaditya absent (Sun/Mercury apart)", () => {
    expect(Array.isArray(r.yogas)).toBe(true);
    for (const y of r.yogas) {
      expect(y.frames.length).toBeGreaterThan(0);
      expect(typeof y.inNavamsha).toBe("boolean");
    }
    expect(r.yogas.find((y) => y.name === "Buddhaditya")).toBeUndefined(); // Sun 40, Mercury 70
  });

  it("bhava chalit present on timed charts (sripati), absent on chandra", () => {
    expect(r.bhavaChalit?.method).toBe("sripati");
    expect(Object.keys(r.bhavaChalit!.placements)).toContain("Sun");
    const chandra = computeNatalResearch(input({
      basis: "chandra", mcLon: null, birthUtcMs: null, lagnaLon: 190,
      isDayBirth: null, vedicWeekday: null, kalavelaLongitudes: null,
    }));
    expect(chandra.bhavaChalit).toBeNull();
    expect(chandra.pending).toEqual(expect.arrayContaining(["kalavelas", "bhava-chalit", "birth-panchang"]));
  });
});
