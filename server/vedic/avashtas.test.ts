import { describe, it, expect } from "vitest";
import { balaadi, jagradaadiInSign, signDignity, lajjitaadiOf, lajjitaFifthHouse, avashtasOf } from "./avashtas";
import { GRAHAS, type Graha } from "./dignity";

const SIGN = (name: string) =>
  ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"].indexOf(name);

/** Chart builder: park everything far apart in Aries-ish unless overridden. */
function chart(overrides: Record<string, number>): Record<string, number> {
  const base: Record<string, number> = {
    Sun: 5, Moon: 35, Mars: 65, Mercury: 95, Jupiter: 125, Venus: 155, Saturn: 185,
    Rahu: 215, Ketu: 35 + 180 + 30, // spread; individual tests override
  };
  return { ...base, ...overrides };
}

describe("balaadi — 6° bands, reversed in even signs (Ch.3 p.253)", () => {
  it("odd sign runs Bala→Mrita", () => {
    expect(balaadi(3)).toBe("bala");       // 3° Aries
    expect(balaadi(8)).toBe("kumara");     // 8° Aries
    expect(balaadi(15)).toBe("yuva");
    expect(balaadi(20)).toBe("vriddha");
    expect(balaadi(27)).toBe("mrita");
  });
  it("even sign reversed: 0-6° = Mrita, 24-30° = Bala", () => {
    expect(balaadi(33)).toBe("mrita");     // 3° Taurus
    expect(balaadi(57)).toBe("bala");      // 27° Taurus
    expect(balaadi(45)).toBe("yuva");      // adult is the middle either way
  });
});

describe("jagradaadi — awake by own dignity (Ch.10 p.338)", () => {
  it("exaltation/own → jagrat; friend/neutral → svapna; enemy/debilitation → sushupti", () => {
    expect(jagradaadiInSign("Sun", SIGN("Aries"))).toBe("jagrat");    // exalted
    expect(jagradaadiInSign("Sun", SIGN("Leo"))).toBe("jagrat");      // own
    expect(jagradaadiInSign("Sun", SIGN("Cancer"))).toBe("svapna");   // Moon is a friend
    expect(jagradaadiInSign("Sun", SIGN("Libra"))).toBe("sushupti");  // debilitated
    expect(jagradaadiInSign("Sun", SIGN("Aquarius"))).toBe("sushupti"); // Saturn's sign — enemy
    expect(jagradaadiInSign("Moon", SIGN("Capricorn"))).toBe("svapna"); // Moon has no enemies
  });
});

describe("signDignity — sign-level dignity usable in vargas", () => {
  it("distinguishes exalted / own / friend / neutral / enemy / debilitated", () => {
    expect(signDignity("Jupiter", SIGN("Cancer"))).toBe("exalted");
    expect(signDignity("Jupiter", SIGN("Sagittarius"))).toBe("own");
    expect(signDignity("Jupiter", SIGN("Capricorn"))).toBe("debilitated");
    expect(signDignity("Jupiter", SIGN("Leo"))).toBe("friend");     // Sun is Jupiter's friend
    expect(signDignity("Jupiter", SIGN("Taurus"))).toBe("enemy");   // Venus is Jupiter's enemy
  });
});

describe("lajjitaadi formulas (Ch.10 pp.336-338)", () => {
  it("garvita: exaltation or moolatrikona", () => {
    const hits = lajjitaadiOf("Sun", chart({ Sun: 10 }), true); // 10° Aries — deep exaltation
    expect(hits.some((h) => h.state === "garvita")).toBe(true);
  });

  it("kshudita: conjunct Saturn starves anyone — even a friend of Saturn", () => {
    // Venus is Saturn's friend, but the rule is unconditional: conjunct Saturn = starved.
    const hits = lajjitaadiOf("Venus", chart({ Venus: 187, Saturn: 185 }), true);
    expect(hits.some((h) => h.state === "kshudita" && h.by.includes("Saturn"))).toBe(true);
  });

  it("kshudita: an enemy's sign starves by sign alone", () => {
    // Jupiter in Taurus (Venus's sign; Venus is Jupiter's enemy).
    const hits = lajjitaadiOf("Jupiter", chart({ Jupiter: 40 }), true);
    expect(hits.some((h) => h.state === "kshudita")).toBe(true);
  });

  it("mudita: conjunct Jupiter delights anyone; a friend's sign delights by sign", () => {
    const withJup = lajjitaadiOf("Saturn", chart({ Saturn: 126, Jupiter: 125 }), true);
    expect(withJup.some((h) => h.state === "mudita" && h.by.includes("Jupiter"))).toBe(true);
    // Sun in Sagittarius (Jupiter's sign; Jupiter is the Sun's friend).
    const bySign = lajjitaadiOf("Sun", chart({ Sun: 245 }), true);
    expect(bySign.some((h) => h.state === "mudita")).toBe(true);
  });

  it("kshobhita: joined by the Sun agitates; a cruel enemy's aspect agitates", () => {
    const conj = lajjitaadiOf("Venus", chart({ Venus: 6, Sun: 5 }), true);
    expect(conj.some((h) => h.state === "kshobhita" && h.by.includes("Sun"))).toBe(true);
    // Mars (cruel) full 7th aspect on Mercury (Mercury's enemy is... Mars's enemy is Mercury;
    // Mercury's enemies list has Moon only — use Saturn→Sun instead: Sun is Saturn's enemy? No:
    // Saturn's enemies are Sun/Moon/Mars — so Saturn aspected by Mars (cruel + enemy of Saturn).
    const asp = lajjitaadiOf("Saturn", chart({ Saturn: 185, Mars: 5 }), true); // Mars 7th-aspects 185
    expect(asp.some((h) => h.state === "kshobhita" && h.by.includes("Mars"))).toBe(true);
  });

  it("trishita: water sign + enemy aspect + no benefic influence", () => {
    // Saturn in Scorpio (water), aspected by Mars (enemy) from the 7th, benefics far away.
    const c = chart({ Saturn: 215, Mars: 35, Jupiter: 65, Venus: 95, Sun: 155, Moon: 100, Mercury: 130 });
    const hits = lajjitaadiOf("Saturn", c, true);
    expect(hits.some((h) => h.state === "trishita")).toBe(true);
    // Add Jupiter's aspect (5th from Cancer 95 → Scorpio) — quenched, no trishita.
    const helped = lajjitaadiOf("Saturn", { ...c, Jupiter: 95 }, true);
    expect(helped.some((h) => h.state === "trishita")).toBe(false);
  });

  it("lajjita: node + Sun/Saturn/Mars conjunction (any house), or the 5th-house arm", () => {
    const nodal = lajjitaadiOf("Mercury", chart({ Mercury: 216, Rahu: 215, Saturn: 218 }), true);
    expect(nodal.some((h) => h.state === "lajjita")).toBe(true);
    const fifth = lajjitaFifthHouse("Mercury", 5, chart({ Mercury: 126, Mars: 125 }));
    expect(fifth?.state).toBe("lajjita");
    expect(lajjitaFifthHouse("Mercury", 4, chart({ Mercury: 126, Mars: 125 }))).toBeNull();
  });

  it("actor jagradaadi is graded: an exalted starver bites at full force", () => {
    // Saturn exalted in Libra starving the Sun (Sun in Libra = debilitated + conjunct enemy Saturn).
    const hits = lajjitaadiOf("Sun", chart({ Sun: 190, Saturn: 200 }), true);
    const k = hits.find((h) => h.state === "kshudita" && h.by.includes("Saturn"));
    expect(k?.actorJagradaadi).toBe("jagrat");
  });
});

describe("avashtasOf — the assembled per-planet read", () => {
  it("returns balaadi + jagradaadi + lajjitaadi together for every graha", () => {
    const c = chart({});
    const houseOf = Object.fromEntries([...GRAHAS, "Rahu", "Ketu"].map((g) => [g, 1]));
    for (const g of GRAHAS) {
      const a = avashtasOf(g, c, houseOf as Record<string, number>, true);
      expect(a.planet).toBe(g);
      expect(["bala", "kumara", "yuva", "vriddha", "mrita"]).toContain(a.balaadi);
      expect(["jagrat", "svapna", "sushupti"]).toContain(a.jagradaadi);
      expect(Array.isArray(a.lajjitaadi)).toBe(true);
    }
  });
});
