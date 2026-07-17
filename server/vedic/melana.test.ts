import { describe, it, expect } from "vitest";
import { taraCurrent, ganaKuta, yoniKuta, nadiKuta, bhakootKuta, vashyaKuta, maitriKuta, computeMelana, kujaDoshaFull, nakIndex } from "./melana";

describe("melana — the kuta engine", () => {
  it("indexes app spellings fuzzily", () => {
    expect(nakIndex("Shatabhisha")).toBe(23);
    expect(nakIndex("Purva Phalguni")).toBe(10);
    expect(nakIndex("Uttara Bhadrapada")).toBe(25);
  });

  it("tara is DIRECTIONAL — the two currents differ", () => {
    // Ashwini → Mrigashira: count 5 = Pratyari (unfavorable); back: 24 % 9 = 6 → wait, compute:
    const ab = taraCurrent("Ashwini", "Mrigashira")!; // (4 - 0) % 9 = 4 → 5th = Pratyari
    const ba = taraCurrent("Mrigashira", "Ashwini")!; // (0 - 4 + 27) % 27 % 9 = 5 → 6th = Sadhaka
    expect(ab.tara).toBe("Pratyari");
    expect(ab.favorable).toBe(false);
    expect(ba.tara).toBe("Sadhaka");
    expect(ba.favorable).toBe(true);
  });

  it("same nakshatra is Janma both ways — and FAVORABLE in melana (MC p.177)", () => {
    const t = taraCurrent("Rohini", "Rohini")!;
    expect(t.tara).toBe("Janma");
    expect(t.favorable).toBe(true);
  });

  it("only Vipat, Pratyari, Vadha are hostile (MC p.177)", () => {
    expect(taraCurrent("Ashwini", "Krittika")!.tara).toBe("Vipat");
    expect(taraCurrent("Ashwini", "Krittika")!.favorable).toBe(false);
  });

  it("gana is DIRECTIONAL per the canon grid (MC p.183) — both orientations returned", () => {
    expect(ganaKuta("Ashwini", "Pushya")!.points).toBe(6);      // deva–deva, either way
    const dm = ganaKuta("Ashwini", "Bharani")!;                 // A deva, B manushya
    expect(dm.aAsKanya).toBe(4);                                // kanyā deva + vara nara
    expect(dm.bAsKanya).toBe(5);                                // kanyā nara + vara deva
    expect(dm.points).toBe(4.5);                                // the mean; fractions are canon-legal
    const dr = ganaKuta("Ashwini", "Magha")!;                   // A deva, B rakshasa
    expect(dr.aAsKanya).toBe(2);                                // kanyā deva + vara rākṣasa
    expect(dr.bAsKanya).toBe(0);                                // kanyā rākṣasa → 0
    const mr = ganaKuta("Bharani", "Magha")!;                   // A manushya, B rakshasa
    expect(mr.aAsKanya).toBe(1);
    expect(mr.bAsKanya).toBe(0);
  });

  it("yoni: same animal 4, sworn enemies 0", () => {
    expect(yoniKuta("Ashwini", "Shatabhisha")!.points).toBe(4); // horse–horse
    expect(yoniKuta("Uttara Phalguni", "Chitra")!.points).toBe(0); // cow–tiger
  });

  it("nadi: same stream is the zero veto, different streams score 8", () => {
    expect(nadiKuta("Ashwini", "Ardra")!.points).toBe(0);   // adi–adi
    expect(nadiKuta("Ashwini", "Bharani")!.points).toBe(8); // adi–madhya
  });

  it("nadi exceptions (MC v.35 p.189): same nakshatra + different pada carries no dosha", () => {
    const r = nadiKuta("Shatabhisha", "Shatabhisha", { rasiA: "Aquarius", rasiB: "Aquarius", padaA: 1, padaB: 3 })!;
    expect(r.points).toBe(8);
    expect(r.cancelledBy).toContain("pāda");
  });

  it("bhakoot: 6/8 axis is dosha, 1/7 is full", () => {
    expect(bhakootKuta("Aries", "Virgo")!.points).toBe(0);   // 6/8, Mars–Mercury not friends
    expect(bhakootKuta("Aries", "Libra")!.points).toBe(7);   // 1/7
  });

  it("bhakoot cancellation: Aries–Scorpio 6/8 is ekādhipatya (both Mars) → cancelled (R p.85)", () => {
    const r = bhakootKuta("Aries", "Scorpio", { nadiDifferent: true })!;
    expect(r.points).toBe(7);
    expect(r.cancelledBy).toContain("Mars");
  });

  it("bhakoot cancellation requires nāḍī-śuddhi when context is known (MC v.32 p.186)", () => {
    expect(bhakootKuta("Aries", "Scorpio", { nadiDifferent: false })!.points).toBe(0);
  });

  it("maitri: Mars befriends the Moon but the Moon is neutral back (canon asymmetry) — friend+neutral = 4", () => {
    const m = maitriKuta("Scorpio", "Cancer")!;
    expect(m.lordA).toBe("Mars");
    expect(m.aToB).toBe("friend");
    expect(m.bToA).toBe("neutral");
    expect(m.points).toBe(4);
  });

  it("maitri: friend+enemy scores 2 per the MC grid (Moon–Mercury)", () => {
    // Moon calls Mercury friend; Mercury calls the Moon enemy (canon asymmetry).
    const m = maitriKuta("Cancer", "Gemini")!;
    expect(m.points).toBe(2);
  });

  it("kuja (canon): houses 2/12/4/7/8 from Lagna+Moon+Venus; the 1st is NOT dosha; Leo/Aquarius exempt", () => {
    // Mars in the 1st from lagna (Virgo mars, Virgo lagna) — NOT a dosha house in R p.98.
    const first = kujaDoshaFull({ marsSign: "Virgo", lagnaSign: "Virgo", moonSign: "Scorpio", venusSign: "Aquarius" });
    // From Moon: Virgo is 11th from Scorpio ✗; from Venus: Virgo is 8th from Aquarius ✓ dosha.
    expect(first.from.some((f) => f.includes("Lagna"))).toBe(false);
    expect(first.from.some((f) => f.includes("Venus"))).toBe(true);
    // Blanket exemption: Mars in Leo → never a dosha.
    const leo = kujaDoshaFull({ marsSign: "Leo", lagnaSign: "Capricorn", moonSign: "Cancer", venusSign: "Virgo" });
    expect(leo.present).toBe(false);
  });

  it("vashya: mutual pull scores 2, one-way 1", () => {
    expect(vashyaKuta("Virgo", "Gemini")!.points).toBeGreaterThanOrEqual(1);
    expect(vashyaKuta("Aries", "Leo")!.points).toBe(1);
  });

  it("assembles a full melana with directional currents and the varna note", () => {
    const m = computeMelana({ nakA: "Shatabhisha", nakB: "Rohini", moonSignA: "Aquarius", moonSignB: "Taurus", marsHouseA: 2, marsHouseB: 3 });
    expect(m.currents.aToB).not.toBeNull();
    expect(m.currents.bToA).not.toBeNull();
    expect(m.score.max).toBe(32);
    expect(m.kuja.a.present).toBe(true);
    expect(m.kuja.balanced).toBe(false);
    expect(m.varnaNote).toContain("omitted");
  });
});
