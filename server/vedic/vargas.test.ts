import { describe, it, expect } from "vitest";
import {
  signIndexOf, horaSign, drekkanaSign, chaturthamsaSign, saptamsaSign,
  navamsaSign, dasamsaSign, dwadasamsaSign, trimsamsaSign, vargaSignOf, signName,
  shodasamsaSign, vimsamsaSign, siddhamsaSign, bhamshaSign, khavedamsaSign, akshavedamsaSign, shashtiamsaSign,
} from "./vargas";

// Every value below is hand-computed from the BPHS rule in the function's comment, then checked
// against the code. Divisional math is unforgiving — a single off-by-one in a "start sign"
// silently corrupts the whole chart — so these are the guardrail (David's "double-check").
// Signs are 0-indexed: 0=Aries … 3=Cancer, 4=Leo, 6=Libra, 8=Sagittarius, 9=Capricorn, 11=Pisces.

const ARIES_0 = 0;        // 0°00' Aries (odd sign, part 0)
const ARIES_END = 29.999; // 29°59' Aries (odd sign, last part)
const TAURUS_15 = 45;     // 15°00' Taurus (even sign, mid)

describe("signIndexOf / signName", () => {
  it("maps longitude to sign", () => {
    expect(signIndexOf(0)).toBe(0);
    expect(signIndexOf(45)).toBe(1);
    expect(signIndexOf(359.9)).toBe(11);
    expect(signIndexOf(-30)).toBe(11); // wraps
    expect(signName(0)).toBe("Aries");
    expect(signName(7)).toBe("Scorpio");
  });
});

describe("D2 · Hora (only Leo=4 / Cancer=3)", () => {
  it("odd sign: 1st half → Leo, 2nd half → Cancer", () => {
    expect(horaSign(ARIES_0)).toBe(4);    // Aries 0° → Leo
    expect(horaSign(ARIES_END)).toBe(3);  // Aries 29° → Cancer
  });
  it("even sign: 1st half → Cancer, 2nd half → Leo", () => {
    expect(horaSign(30)).toBe(3);         // Taurus 0° → Cancer
    expect(horaSign(TAURUS_15)).toBe(4);  // Taurus 15° → Leo
  });
});

describe("D3 · Drekkana (same / 5th / 9th)", () => {
  it("steps same, +4, +8 across the three 10° parts", () => {
    expect(drekkanaSign(ARIES_0)).toBe(0);    // Aries → Aries
    expect(drekkanaSign(15)).toBe(4);         // Aries 15° → Leo (5th)
    expect(drekkanaSign(ARIES_END)).toBe(8);  // Aries 29° → Sagittarius (9th)
    expect(drekkanaSign(TAURUS_15)).toBe(5);  // Taurus 15° → Virgo (5th from Taurus)
  });
});

describe("D4 · Chaturthamsa (same / 4th / 7th / 10th)", () => {
  it("steps +3 per 7.5° part", () => {
    expect(chaturthamsaSign(ARIES_0)).toBe(0);   // Aries → Aries
    expect(chaturthamsaSign(10)).toBe(3);        // Aries 10° → Cancer (4th)
    expect(chaturthamsaSign(20)).toBe(6);        // Aries 20° → Libra (7th)
    expect(chaturthamsaSign(ARIES_END)).toBe(9); // Aries 29° → Capricorn (10th)
  });
});

describe("D7 · Saptamsa (odd: from self; even: from 7th)", () => {
  it("odd sign starts from itself", () => {
    expect(saptamsaSign(ARIES_0)).toBe(0);       // Aries part 0 → Aries
    expect(saptamsaSign(ARIES_END)).toBe(6);     // Aries part 6 → Libra
  });
  it("even sign starts from the 7th", () => {
    expect(saptamsaSign(30)).toBe(7);            // Taurus part 0 → Scorpio (7th)
    expect(saptamsaSign(TAURUS_15)).toBe(10);    // Taurus 15° (part 3) → Aquarius
  });
});

describe("D9 · Navamsa (continuous scheme)", () => {
  it("continuous 3°20' numbering from Aries", () => {
    expect(navamsaSign(ARIES_0)).toBe(0);        // Aries 0° → Aries
    expect(navamsaSign(ARIES_END)).toBe(8);      // Aries 29° → Sagittarius
    expect(navamsaSign(TAURUS_15)).toBe(1);      // Taurus 15° → Taurus
  });
  // The continuous scheme must equal the classical movable/fixed/dual "start sign" rule.
  it("equals the element rule for movable/fixed/dual starts", () => {
    expect(navamsaSign(0)).toBe(0);              // Aries (movable) → starts Aries ✓
    expect(navamsaSign(120)).toBe(0);            // Leo (fixed) → starts Aries (9th) ✓
    expect(navamsaSign(60)).toBe(6);             // Gemini (dual) → starts Libra (5th) ✓
    expect(navamsaSign(90)).toBe(3);             // Cancer (movable) → starts Cancer ✓
  });
});

describe("D10 · Dasamsa (odd: from self; even: from 9th)", () => {
  it("odd sign starts from itself", () => {
    expect(dasamsaSign(ARIES_0)).toBe(0);        // Aries part 0 → Aries
    expect(dasamsaSign(ARIES_END)).toBe(9);      // Aries part 9 → Capricorn
  });
  it("even sign starts from the 9th", () => {
    expect(dasamsaSign(30)).toBe(9);             // Taurus part 0 → Capricorn (9th)
    expect(dasamsaSign(TAURUS_15)).toBe(2);      // Taurus 15° (part 5) → Gemini
  });
});

describe("D12 · Dwadasamsa (from self, +1 per 2.5°)", () => {
  it("steps one sign per part", () => {
    expect(dwadasamsaSign(ARIES_0)).toBe(0);     // Aries → Aries
    expect(dwadasamsaSign(ARIES_END)).toBe(11);  // Aries 29° (part 11) → Pisces
  });
});

describe("D30 · Trimsamsa (unequal, planet-ruled)", () => {
  it("odd sign boundaries: 5/5/8/7/5", () => {
    expect(trimsamsaSign(0 + 2)).toBe(0);    // Aries 2° → Aries (Mars)
    expect(trimsamsaSign(0 + 7)).toBe(10);   // Aries 7° → Aquarius (Saturn)
    expect(trimsamsaSign(0 + 14)).toBe(8);   // Aries 14° → Sagittarius (Jupiter)
    expect(trimsamsaSign(0 + 22)).toBe(2);   // Aries 22° → Gemini (Mercury)
    expect(trimsamsaSign(0 + 27)).toBe(6);   // Aries 27° → Libra (Venus)
  });
  it("even sign boundaries mirror: 5/7/8/5/5", () => {
    expect(trimsamsaSign(30 + 3)).toBe(1);   // Taurus 3° → Taurus (Venus)
    expect(trimsamsaSign(30 + 8)).toBe(5);   // Taurus 8° → Virgo (Mercury)
    expect(trimsamsaSign(30 + 15)).toBe(11); // Taurus 15° → Pisces (Jupiter)
    expect(trimsamsaSign(30 + 22)).toBe(9);  // Taurus 22° → Capricorn (Saturn)
    expect(trimsamsaSign(30 + 27)).toBe(7);  // Taurus 27° → Scorpio (Mars)
  });
});

describe("vargaSignOf dispatcher", () => {
  it("routes to the right divisional function", () => {
    expect(vargaSignOf(TAURUS_15, "D1")).toBe(1);
    expect(vargaSignOf(TAURUS_15, "D9")).toBe(navamsaSign(TAURUS_15));
    expect(vargaSignOf(TAURUS_15, "D10")).toBe(dasamsaSign(TAURUS_15));
    expect(vargaSignOf(TAURUS_15, "D30")).toBe(trimsamsaSign(TAURUS_15));
  });
});

describe("subtle vargas (Vol II Ch.6, pp.290-291) — hand-computed", () => {
  it("D16 Shodasamsha: movable→Aries, fixed→Leo, dual→Sagittarius; 1°52'30\" parts", () => {
    expect(shodasamsaSign(10)).toBe(5);        // 10° Aries: part 5 → Aries+5 = Virgo
    expect(shodasamsaSign(30 + 3)).toBe(5);    // 3° Taurus (fixed→Leo): part 1 → Virgo
    expect(shodasamsaSign(60 + 29)).toBe(11);  // 29° Gemini (dual→Sag): part 15 → Pisces
  });
  it("D20 Vimsamsha: movable→Aries, fixed→Sagittarius, dual→Leo; 1°30' parts", () => {
    expect(vimsamsaSign(10)).toBe(6);          // 10° Aries: part 6 → Libra
    expect(vimsamsaSign(30 + 3)).toBe(10);     // 3° Taurus (fixed→Sag): part 2 → Aquarius
    expect(vimsamsaSign(60 + 29)).toBe(11);    // 29° Gemini (dual→Leo): part 19 → Pisces
  });
  it("D24 Siddhamsa: odd→Leo, even→Cancer; 1°15' parts", () => {
    expect(siddhamsaSign(10)).toBe(0);         // 10° Aries: part 8 → Leo+8 = Aries
    expect(siddhamsaSign(30 + 3)).toBe(5);     // 3° Taurus: part 2 → Cancer+2 = Virgo
  });
  it("D27 Bhamsha: fire→Aries, earth→Cancer, air→Libra, water→Capricorn; 1°06'40\" parts", () => {
    expect(bhamshaSign(10)).toBe(9);           // 10° Aries (fire): part 9 → Capricorn
    expect(bhamshaSign(30 + 3)).toBe(5);       // 3° Taurus (earth): part 2 → Virgo
    expect(bhamshaSign(90 + 0.5)).toBe(9);     // 0.5° Cancer (water): part 0 → Capricorn
    expect(bhamshaSign(180 + 15)).toBe(6 + 13 - 12); // 15° Libra (air): part 13 → Libra+13 = Scorpio(7)
  });
});

describe("final vargas (Vol II Ch.6, pp.292-293) — hand-computed", () => {
  it("D40 Khavedamsa: odd→Aries, even→Libra; 45' parts", () => {
    expect(khavedamsaSign(10)).toBe(1);       // 10° Aries: part 13 → Aries+13 = Taurus
    expect(khavedamsaSign(30 + 3)).toBe(10);  // 3° Taurus (even→Libra): part 4 → Aquarius
  });
  it("D45 Akshavedamsa: movable→Aries, fixed→Leo, dual→Sagittarius; 40' parts", () => {
    expect(akshavedamsaSign(10)).toBe(3);     // 10° Aries: part 15 → Aries+15 = Cancer
    expect(akshavedamsaSign(30 + 3)).toBe(8); // 3° Taurus (fixed→Leo): part 4 → Sagittarius
  });
  it("D60 Shashtiamsa: the book's own example — Mars 23°35' Cancer → Gemini (p.293)", () => {
    expect(shashtiamsaSign(90 + 23 + 35 / 60)).toBe(2); // 47 ÷ 12 rem 11 → 12th from Cancer = Gemini
    expect(shashtiamsaSign(0)).toBe(0);                 // 0° Aries → remainder 0 → Aries itself
    expect(shashtiamsaSign(0.5)).toBe(1);               // each 30' advances one sign
  });
});
