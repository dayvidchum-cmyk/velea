import { describe, it, expect } from "vitest";
import { shadbala, compoundRelation, MIN_RUPAS } from "./shadbala";
import { GRAHAS, type Graha } from "./dignity";

/** Build a full 7-graha longitude map, overriding the ones given; the rest park at 0° Aries. */
function chart(overrides: Partial<Record<Graha, number>>): Record<Graha, number> {
  const base = Object.fromEntries(GRAHAS.map((g) => [g, 0])) as Record<Graha, number>;
  return { ...base, ...overrides };
}

describe("shadbala — honesty contract", () => {
  it("never emits a six-source total, and names every pending source", () => {
    const r = shadbala(chart({}), 0);
    for (const g of GRAHAS) {
      expect(r[g].sixSourceRupas).toBeNull();
      expect(r[g].pending).toEqual(expect.arrayContaining(["dig", "kala", "drik", "chesta-exact"]));
    }
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

describe("chesta (approx) — sign of motion only, and only for the taras", () => {
  it("retrograde tara → high, direct → low; Sun/Moon get none", () => {
    const speed = Object.fromEntries(GRAHAS.map((g) => [g, 1])) as Record<Graha, number>;
    speed.Mars = -0.2; // retrograde
    const r = shadbala(chart({}), 0, speed);
    expect(r.Mars.chestaBalaApprox).toBe(45);
    expect(r.Jupiter.chestaBalaApprox).toBe(15);
    expect(r.Sun.chestaBalaApprox).toBeNull();
    expect(r.Moon.chestaBalaApprox).toBeNull();
  });
  it("without speed data, chesta is null for everyone", () => {
    const r = shadbala(chart({}), 0);
    for (const g of GRAHAS) expect(r[g].chestaBalaApprox).toBeNull();
  });
});
