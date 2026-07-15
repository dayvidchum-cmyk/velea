import { describe, it, expect } from "vitest";
import { shadbala, compoundRelation, sputaDrishti, MIN_RUPAS } from "./shadbala";
import { GRAHAS, type Graha } from "./dignity";

/** Build a full 7-graha longitude map, overriding the ones given; the rest park at 0° Aries. */
function chart(overrides: Partial<Record<Graha, number>>): Record<Graha, number> {
  const base = Object.fromEntries(GRAHAS.map((g) => [g, 0])) as Record<Graha, number>;
  return { ...base, ...overrides };
}

describe("shadbala — honesty contract", () => {
  it("without context: no six-source total, and every missing source is named", () => {
    const r = shadbala(chart({}), 0);
    for (const g of GRAHAS) {
      expect(r[g].sixSourceRupas).toBeNull();
      expect(r[g].pending).toEqual(expect.arrayContaining(["dig", "kala"]));
      // Drik is computable from longitudes alone — never pending.
      expect(r[g].drikBala).not.toBeNull();
    }
    // The taras also lack speed → chesta pending; Sun/Moon take no chesta (0, not pending).
    expect(r.Mars.pending).toContain("chesta");
    expect(r.Sun.chestaBala).toBe(0);
  });

  it("MIN_RUPAS matches the canon (Sun/Mars/Saturn 5, Venus 5.5, Moon 6, Jupiter 6.5, Mercury 7)", () => {
    expect(MIN_RUPAS).toMatchObject({ Sun: 5, Mars: 5, Saturn: 5, Venus: 5.5, Moon: 6, Jupiter: 6.5, Mercury: 7 });
  });
});

describe("naisargika bala — fixed luminosity constants", () => {
  it("Sun 60 (7/7) down to Saturn 8.57 (1/7)", () => {
    const r = shadbala(chart({}), 0);
    expect(r.Sun.naisargikaBala).toBeCloseTo(60, 5);
    expect(r.Moon.naisargikaBala).toBeCloseTo((6 / 7) * 60, 5);
    expect(r.Saturn.naisargikaBala).toBeCloseTo((1 / 7) * 60, 5);
    // strictly descending Sun > Venus > Jupiter > Mercury > Mars > Saturn (Moon second)
    expect(r.Sun.naisargikaBala).toBeGreaterThan(r.Venus.naisargikaBala);
    expect(r.Mars.naisargikaBala).toBeGreaterThan(r.Saturn.naisargikaBala);
  });
});

describe("uchcha bala — 60 at exaltation, 0 at debilitation, 30 at 90°", () => {
  it("Sun: 10° Aries=60, 10° Libra=0, 10° Cancer=30", () => {
    expect(shadbala(chart({ Sun: 10 }), 0).Sun.sthanaBala.uchcha).toBeCloseTo(60, 5);   // deep exalt
    expect(shadbala(chart({ Sun: 190 }), 0).Sun.sthanaBala.uchcha).toBeCloseTo(0, 5);    // deep debil
    expect(shadbala(chart({ Sun: 100 }), 0).Sun.sthanaBala.uchcha).toBeCloseTo(30, 5);   // 90° off
  });
  it("Saturn: deep exalt 20° Libra=60", () => {
    expect(shadbala(chart({ Saturn: 180 + 20 }), 0).Saturn.sthanaBala.uchcha).toBeCloseTo(60, 5);
  });
});

describe("kendra bala — 60 kendra / 30 panapara / 15 apoklima", () => {
  it("counts houses from the lagna", () => {
    const lag = 0; // Aries rising
    expect(shadbala(chart({ Mars: 0 }), lag).Mars.sthanaBala.kendra).toBe(60);   // 1st
    expect(shadbala(chart({ Mars: 30 }), lag).Mars.sthanaBala.kendra).toBe(30);  // 2nd
    expect(shadbala(chart({ Mars: 60 }), lag).Mars.sthanaBala.kendra).toBe(15);  // 3rd
    expect(shadbala(chart({ Mars: 90 }), lag).Mars.sthanaBala.kendra).toBe(60);  // 4th
  });
});

describe("drekkana bala — gender must match the third of the sign", () => {
  it("male planet strong in the 1st drekkana only", () => {
    expect(shadbala(chart({ Sun: 5 }), 0).Sun.sthanaBala.drekkana).toBe(15);   // 0–10°
    expect(shadbala(chart({ Sun: 15 }), 0).Sun.sthanaBala.drekkana).toBe(0);   // 10–20°
  });
  it("female planet strong in the middle drekkana only", () => {
    expect(shadbala(chart({ Moon: 15 }), 0).Moon.sthanaBala.drekkana).toBe(15);
    expect(shadbala(chart({ Moon: 5 }), 0).Moon.sthanaBala.drekkana).toBe(0);
  });
  it("neutral planet strong in the last drekkana only", () => {
    expect(shadbala(chart({ Mercury: 25 }), 0).Mercury.sthanaBala.drekkana).toBe(15);
  });
});

describe("ojayugma bala — Moon/Venus want even, the rest want odd", () => {
  it("Sun at 0° Aries: odd sign + odd navamsa → 30", () => {
    expect(shadbala(chart({ Sun: 0 }), 0).Sun.sthanaBala.ojayugma).toBe(30);
  });
  it("Moon at 0° Aries: odd sign+navamsa → Moon (wants even) gets 0", () => {
    expect(shadbala(chart({ Moon: 0 }), 0).Moon.sthanaBala.ojayugma).toBe(0);
  });
});

describe("saptavargaja + compound (panchadha) maitri", () => {
  it("a self-relation is a great friend; totals stay within [0, 7×45]", () => {
    const c = chart({ Sun: 125 });
    expect(compoundRelation("Sun", "Sun", c)).toBe("great friend");
    const s = shadbala(c, 0).Sun.sthanaBala.saptavargaja;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(7 * 45);
  });
  it("compound relation blends natural + temporal (Vol I Ch.5)", () => {
    // Sun→Saturn is a natural ENEMY. Put Saturn 3rd from the Sun (a temporal FRIEND slot) → Neutral.
    const c = chart({ Sun: 0, Saturn: 60 }); // Saturn in the 3rd sign from the Sun
    expect(compoundRelation("Sun", "Saturn", c)).toBe("neutral");
    // Sun→Jupiter natural FRIEND; Jupiter also in a temporal-friend slot (11th) → great friend.
    const c2 = chart({ Sun: 0, Jupiter: 300 }); // 11th sign from the Sun
    expect(compoundRelation("Sun", "Jupiter", c2)).toBe("great friend");
  });
});

describe("chesta — K&F relative speed (p.314): slow/retro high, fast low, Sun/Moon none", () => {
  it("retrograde tara clamps to 60; a fast tara falls to 0; average speed = 30", () => {
    const speed = Object.fromEntries(GRAHAS.map((g) => [g, 1])) as Record<Graha, number>;
    speed.Mars = -0.2;      // retrograde → beyond max → 60
    speed.Jupiter = 0.0831; // exactly its average → 30
    speed.Saturn = 0.1;     // three times its average → low
    const r = shadbala(chart({}), 0, speed);
    expect(r.Mars.chestaBala).toBe(60);
    expect(r.Jupiter.chestaBala).toBeCloseTo(30, 5);
    expect(r.Saturn.chestaBala).toBe(0); // 3× its average speed → raw negative, clamps to 0
    expect(r.Sun.chestaBala).toBe(0);  // K&F: Sun & Moon receive no chesta
    expect(r.Moon.chestaBala).toBe(0);
  });
  it("without speed data, chesta is null (pending) for the taras", () => {
    const r = shadbala(chart({}), 0);
    for (const g of ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as Graha[]) {
      expect(r[g].chestaBala).toBeNull();
      expect(r[g].pending).toContain("chesta");
    }
  });
});

describe("dig bala — arc from the powerless angle ÷ 3 (p.311)", () => {
  const ctx = { birthUtcMs: Date.UTC(2000, 0, 1, 12), latitude: 0, longitude: 0, mcLon: 270 };
  it("Sun on the MC = 60; Sun on the IC = 0 (asc 0°, mc 270°)", () => {
    expect(shadbala(chart({ Sun: 270 }), 0, undefined, ctx).Sun.digBala).toBeCloseTo(60, 5);
    expect(shadbala(chart({ Sun: 90 }), 0, undefined, ctx).Sun.digBala).toBeCloseTo(0, 5);
  });
  it("Mercury/Jupiter peak on the ascendant; Saturn on the descendant; Moon/Venus on the IC", () => {
    const r = shadbala(chart({ Mercury: 0, Saturn: 180, Moon: 90 }), 0, undefined, ctx);
    expect(r.Mercury.digBala).toBeCloseTo(60, 5);
    expect(r.Saturn.digBala).toBeCloseTo(60, 5);
    expect(r.Moon.digBala).toBeCloseTo(60, 5);
  });
  it("no MC (Chandra chart) → dig pending", () => {
    const r = shadbala(chart({}), 0, undefined, { ...ctx, mcLon: null });
    expect(r.Sun.digBala).toBeNull();
    expect(r.Sun.pending).toContain("dig");
  });
});

describe("kala bala components (pp.312-314)", () => {
  // Equator, Greenwich: LMT = UTC; sunrise/sunset ≈ 6/18 → clean thirds.
  const ctx = { birthUtcMs: Date.UTC(2000, 2, 20, 12, 0), latitude: 0, longitude: 0, mcLon: 270 };
  it("natonnata: noon birth → diurnals 60, nocturnals 0, Mercury always 60", () => {
    const r = shadbala(chart({}), 0, undefined, ctx);
    expect(r.Sun.kalaBala!.natonnata).toBeCloseTo(60, 1);
    expect(r.Saturn.kalaBala!.natonnata).toBeCloseTo(0, 1);
    expect(r.Mercury.kalaBala!.natonnata).toBe(60);
  });
  it("midnight birth → reversed", () => {
    const r = shadbala(chart({}), 0, undefined, { ...ctx, birthUtcMs: Date.UTC(2000, 2, 20, 0, 0) });
    expect(r.Moon.kalaBala!.natonnata).toBeCloseTo(60, 1);
    expect(r.Jupiter.kalaBala!.natonnata).toBeCloseTo(0, 1);
  });
  it("paksha: full-Moon chart → benefics 60, malefics 0, Moon doubled to 120", () => {
    const r = shadbala(chart({ Sun: 0, Moon: 180 }), 0, undefined, ctx);
    expect(r.Jupiter.kalaBala!.paksha).toBeCloseTo(60, 5);
    expect(r.Saturn.kalaBala!.paksha).toBeCloseTo(0, 5);
    expect(r.Moon.kalaBala!.paksha).toBeCloseTo(120, 5); // bright Moon is a benefic, ×2
  });
  it("benefic + malefic paksha always sums to 60 (p.313)", () => {
    const r = shadbala(chart({ Sun: 10, Moon: 100 }), 0, undefined, ctx);
    expect(r.Venus.kalaBala!.paksha + r.Saturn.kalaBala!.paksha).toBeCloseTo(60, 5);
  });
  it("tribhaga: Jupiter always 60; noon (2nd day-third) crowns the Sun", () => {
    const r = shadbala(chart({}), 0, undefined, ctx);
    expect(r.Jupiter.kalaBala!.tribhaga).toBe(60);
    expect(r.Sun.kalaBala!.tribhaga).toBe(60);
    expect(r.Mercury.kalaBala!.tribhaga).toBe(0);
  });
  it("ayana: needs declinations — 30 at the equator, reversed for Saturn/Moon, Sun doubled", () => {
    const declBy = Object.fromEntries(GRAHAS.map((g) => [g, 0])) as Record<Graha, number>;
    const r = shadbala(chart({}), 0, undefined, { ...ctx, declBy });
    expect(r.Mars.kalaBala!.ayana).toBeCloseTo(30, 5);
    expect(r.Sun.kalaBala!.ayana).toBeCloseTo(60, 5); // 30 doubled
    const north = shadbala(chart({}), 0, undefined, { ...ctx, declBy: { ...declBy, Saturn: 12, Jupiter: 12 } });
    expect(north.Jupiter.kalaBala!.ayana).toBeCloseTo(45, 5); // north adds
    expect(north.Saturn.kalaBala!.ayana).toBeCloseTo(15, 5);  // reversed for Saturn
    // without declinations, ayana is pending and the total stays null
    const r2 = shadbala(chart({}), 0, undefined, ctx);
    expect(r2.Sun.kalaBala!.ayana).toBeNull();
    expect(r2.Sun.pending).toContain("ayana");
  });
});

describe("drik bala — sputa drishti curve (p.315)", () => {
  it("breakpoints: 30→0, 60→15, 90→45, 120→30, 150→0, 180→60, 300→0", () => {
    expect(sputaDrishti(30)).toBe(0);
    expect(sputaDrishti(60)).toBe(15);
    expect(sputaDrishti(90)).toBe(45);
    expect(sputaDrishti(120)).toBe(30);
    expect(sputaDrishti(150)).toBe(0);
    expect(sputaDrishti(180)).toBe(60);
    expect(sputaDrishti(240)).toBe(30);
    expect(sputaDrishti(300)).toBe(0);
    expect(sputaDrishti(10)).toBe(0);
  });
  it("a benefic opposition adds; a malefic opposition subtracts (÷4)", () => {
    // Target Mars at 0°; Jupiter at 180° (benefic, full aspect) and everything else far off-aspect.
    const c = chart({ Mars: 0, Jupiter: 180, Sun: 15, Moon: 15, Mercury: 15, Venus: 15, Saturn: 15 });
    const withJup = shadbala(c, 0).Mars.drikBala!;
    const c2 = chart({ Mars: 0, Saturn: 180, Sun: 15, Moon: 15, Mercury: 15, Venus: 15, Jupiter: 15 });
    const withSat = shadbala(c2, 0).Mars.drikBala!;
    expect(withJup).toBeGreaterThan(withSat);
    expect(withSat).toBeLessThan(0); // a lone malefic full aspect nets negative
  });
});

describe("six-source total — real when every input is real", () => {
  it("timed birth + MC + speeds + declinations → rupas and strength ratio emitted", () => {
    const speed = Object.fromEntries(GRAHAS.map((g) => [g, 0.5])) as Record<Graha, number>;
    const declBy = Object.fromEntries(GRAHAS.map((g) => [g, 5])) as Record<Graha, number>;
    // Spread the taras so no planetary war fires (war → yuddha honestly pending).
    const c = chart({ Sun: 10, Moon: 100, Mars: 40, Mercury: 70, Jupiter: 130, Venus: 200, Saturn: 250 });
    const r = shadbala(c, 0, speed, {
      birthUtcMs: Date.UTC(1995, 5, 15, 9, 30), latitude: 40, longitude: -74, mcLon: 265, declBy,
    });
    for (const g of GRAHAS) {
      expect(r[g].pending).toEqual([]);
      expect(r[g].sixSourceRupas).not.toBeNull();
      expect(r[g].sixSourceRupas!).toBeGreaterThan(0);
      expect(r[g].strengthRatio).toBeCloseTo(r[g].sixSourceRupas! / MIN_RUPAS[g], 5);
    }
  });
  it("a planetary war (two taras within 1°) marks yuddha pending — never faked", () => {
    const c = chart({ Sun: 10, Moon: 100, Mars: 40, Mercury: 40.5, Jupiter: 130, Venus: 200, Saturn: 250 });
    const speed = Object.fromEntries(GRAHAS.map((g) => [g, 0.5])) as Record<Graha, number>;
    const declBy = Object.fromEntries(GRAHAS.map((g) => [g, 5])) as Record<Graha, number>;
    const r = shadbala(c, 0, speed, {
      birthUtcMs: Date.UTC(1995, 5, 15, 9, 30), latitude: 40, longitude: -74, mcLon: 265, declBy,
    });
    expect(r.Mars.pending).toContain("yuddha");
    expect(r.Mars.sixSourceRupas).toBeNull();
    expect(r.Jupiter.pending).toEqual([]); // bystanders unaffected
  });
});
