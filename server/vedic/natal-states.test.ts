import { describe, it, expect } from "vitest";
import { deepthaadiOf, charaKarakas, birthPanchang, dhoomaGroup, kalavelaStarts } from "./natal-states";
import { GRAHAS, type Graha } from "./dignity";

const chart = (o: Record<string, number>): Record<string, number> => ({
  Sun: 0, Moon: 124, Mars: 65, Mercury: 95, Jupiter: 155, Venus: 185, Saturn: 245,
  Rahu: 275, Ketu: 95, ...o,
});

describe("deepthaadi — the nine quick states (Ch.3 p.252)", () => {
  it("combustion needs the VERDICT, not the report: a Moon 124° from the Sun is strong, not combust", () => {
    const s = deepthaadiOf("Moon", chart({}), undefined, false);
    expect(s).toContain("sakta");
    expect(s).not.toContain("vikala");
  });
  it("a planet inside its orb IS combust (Mercury 5° from the Sun)", () => {
    const s = deepthaadiOf("Mercury", chart({ Mercury: 5 }), undefined, false);
    expect(s).toContain("vikala");
    expect(s).not.toContain("sakta");
  });
  it("exalted → radiant; own → confident; fall → alarmed", () => {
    expect(deepthaadiOf("Sun", chart({ Sun: 10 }), undefined, false)).toContain("deeptha");
    expect(deepthaadiOf("Moon", chart({ Moon: 100 }), undefined, false)).toContain("swasta");
    expect(deepthaadiOf("Moon", chart({ Moon: 215 }), undefined, false)).toContain("bhita");
  });
  it("war marks both taras harmed (within 1°)", () => {
    const c = chart({ Mars: 65, Mercury: 65.5 });
    expect(deepthaadiOf("Mars", c, undefined, false)).toContain("nipeedita");
    expect(deepthaadiOf("Mercury", c, undefined, false)).toContain("nipeedita");
  });
});

describe("chara karakas — ranked by degrees-in-sign (Ch.4 pp.256-257)", () => {
  it("assigns all seven distinctly, highest = Atma", () => {
    const lonBy = Object.fromEntries(GRAHAS.map((g, i) => [g, i * 30 + i * 2])) as Record<Graha, number>;
    const ck = charaKarakas(lonBy);
    expect(new Set(Object.values(ck.karakas)).size).toBe(7);
    expect(ck.karakas.atma).toBe("Saturn"); // i=6 → 12° in sign, highest
    expect(ck.karakas.dara).toBe("Sun");    // 0° in sign, lowest
  });
});

describe("birth panchang — the five limbs", () => {
  it("full-Moon chart: Purnima, Shukla; new-Moon: Amavasya, Krishna side", () => {
    expect(birthPanchang(0, 179, 0).tithi.name).toBe("Purnima");
    expect(birthPanchang(0, 359, 0).tithi.name).toBe("Amavasya");
    expect(birthPanchang(0, 100, 4).vara).toBe("Jupiter"); // weekday 4 = Thursday
  });
});

describe("upagrahas", () => {
  it("dhooma group closes its cycle: Upaketu + 30° = the Sun (p.265)", () => {
    const d = dhoomaGroup(275.67); // the book's own example: Sun 5°40' Capricorn
    expect((d.upaketu + 30) % 360).toBeCloseTo(275.67, 3);
    expect(d.dhooma).toBeCloseTo((275.67 + 133 + 20 / 60) % 360, 3);
  });
  it("kalavela: Sunday day-birth puts Gulika's part 7th (book example p.264)", () => {
    const sunrise = 0, sunset = 8 * 3600e3 * 1.43375; // ~11h28m day, scaled
    const starts = kalavelaStarts({
      birthUtcMs: 3600e3, sunriseMs: sunrise, sunsetMs: sunset,
      nextSunriseMs: sunset + 12 * 3600e3, vedicWeekday: 0,
    });
    const part = (sunset - sunrise) / 8;
    expect(starts.gulika).toBeCloseTo(6 * part, 5);      // Saturn = 7th part on Sunday
    expect(starts.kala).toBeCloseTo(0, 5);               // Sun = 1st part
  });
});
