import { describe, it, expect } from "vitest";
import {
  grahaAspectsSign, rashiAspectsSign, signsAway, isMoonBright, beneficMap,
} from "./aspects";

const S = (name: string) =>
  ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"].indexOf(name);

describe("graha drishti — whole-sign Parashari aspects", () => {
  it("everyone aspects the 7th; specials for Mars 4/8, Jupiter 5/9, Saturn 3/10", () => {
    expect(grahaAspectsSign("Sun", S("Aries"), S("Libra"))).toBe(true);   // 7th
    expect(grahaAspectsSign("Sun", S("Aries"), S("Leo"))).toBe(false);   // 5th — Sun has no special
    expect(grahaAspectsSign("Mars", S("Aries"), S("Cancer"))).toBe(true);  // 4th
    expect(grahaAspectsSign("Mars", S("Aries"), S("Scorpio"))).toBe(true); // 8th
    expect(grahaAspectsSign("Jupiter", S("Aries"), S("Leo"))).toBe(true);       // 5th
    expect(grahaAspectsSign("Jupiter", S("Aries"), S("Sagittarius"))).toBe(true); // 9th
    expect(grahaAspectsSign("Saturn", S("Aries"), S("Gemini"))).toBe(true);     // 3rd
    expect(grahaAspectsSign("Saturn", S("Aries"), S("Capricorn"))).toBe(true);  // 10th
    expect(grahaAspectsSign("Saturn", S("Aries"), S("Leo"))).toBe(false);
  });
  it("signsAway is 1-based from the occupied sign", () => {
    expect(signsAway(S("Aries"), S("Aries"))).toBe(1);
    expect(signsAway(S("Pisces"), S("Aries"))).toBe(2);
  });
});

describe("rashi drishti — Jaimini sign aspects (Vol I p.90)", () => {
  it("movable aspects fixed except the adjacent one", () => {
    // Aries (movable) → fixed: Leo ✓, Scorpio ✓, Aquarius ✓, Taurus ✗ (adjacent)
    expect(rashiAspectsSign(S("Aries"), S("Leo"))).toBe(true);
    expect(rashiAspectsSign(S("Aries"), S("Scorpio"))).toBe(true);
    expect(rashiAspectsSign(S("Aries"), S("Aquarius"))).toBe(true);
    expect(rashiAspectsSign(S("Aries"), S("Taurus"))).toBe(false);
  });
  it("fixed aspects movable except the adjacent one", () => {
    // Taurus (fixed) → movable: Cancer ✓, Libra ✓, Capricorn ✓, Aries ✗ (adjacent)
    expect(rashiAspectsSign(S("Taurus"), S("Cancer"))).toBe(true);
    expect(rashiAspectsSign(S("Taurus"), S("Libra"))).toBe(true);
    expect(rashiAspectsSign(S("Taurus"), S("Capricorn"))).toBe(true);
    expect(rashiAspectsSign(S("Taurus"), S("Aries"))).toBe(false);
  });
  it("dual signs aspect each other and nothing else", () => {
    expect(rashiAspectsSign(S("Gemini"), S("Virgo"))).toBe(true);
    expect(rashiAspectsSign(S("Gemini"), S("Sagittarius"))).toBe(true);
    expect(rashiAspectsSign(S("Gemini"), S("Pisces"))).toBe(true);
    expect(rashiAspectsSign(S("Gemini"), S("Leo"))).toBe(false);
    expect(rashiAspectsSign(S("Gemini"), S("Aries"))).toBe(false);
    expect(rashiAspectsSign(S("Gemini"), S("Gemini"))).toBe(false);
  });
});

describe("benefic map — chart-specific (Ch.8 p.312)", () => {
  it("Moon bright from 8th bright tithi to 8th dark (elongation 90°–270°)", () => {
    expect(isMoonBright(0, 180)).toBe(true);   // full
    expect(isMoonBright(0, 90)).toBe(true);    // 8th tithi bright — boundary in
    expect(isMoonBright(0, 89)).toBe(false);
    expect(isMoonBright(0, 270)).toBe(false);  // 8th dark — boundary out
    expect(isMoonBright(0, 10)).toBe(false);   // new
  });
  it("Mercury afflicted when conjunct a malefic; clean otherwise", () => {
    const clean = beneficMap({ Sun: 0, Moon: 180, Mars: 60, Mercury: 100, Jupiter: 130, Venus: 160, Saturn: 200, Rahu: 240, Ketu: 60 + 180 });
    expect(clean.benefic.Mercury).toBe(true);
    const afflicted = beneficMap({ Sun: 0, Moon: 180, Mars: 100, Mercury: 100, Jupiter: 130, Venus: 160, Saturn: 200, Rahu: 240, Ketu: 60 });
    expect(afflicted.benefic.Mercury).toBe(false);
  });
  it("Jupiter/Venus always benefic; Sun/Mars/Saturn always malefic", () => {
    const m = beneficMap({ Sun: 0, Moon: 10, Mars: 60, Mercury: 100, Jupiter: 130, Venus: 160, Saturn: 200, Rahu: 240, Ketu: 60 });
    expect(m.benefic.Jupiter).toBe(true);
    expect(m.benefic.Venus).toBe(true);
    expect(m.benefic.Sun).toBe(false);
    expect(m.benefic.Mars).toBe(false);
    expect(m.benefic.Saturn).toBe(false);
    expect(m.benefic.Moon).toBe(false); // dark Moon here
  });
});
