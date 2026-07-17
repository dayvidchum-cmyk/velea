import { describe, it, expect } from "vitest";
import { taraCurrent, ganaKuta, yoniKuta, nadiKuta, bhakootKuta, vashyaKuta, maitriKuta, computeMelana, nakIndex } from "./melana";

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

  it("same nakshatra is Janma both ways", () => {
    const t = taraCurrent("Rohini", "Rohini")!;
    expect(t.tara).toBe("Janma");
  });

  it("gana: same class scores full, deva–rakshasa scores 1, manushya–rakshasa 0", () => {
    expect(ganaKuta("Ashwini", "Pushya")!.points).toBe(6);      // deva–deva
    expect(ganaKuta("Ashwini", "Magha")!.points).toBe(1);       // deva–rakshasa
    expect(ganaKuta("Bharani", "Magha")!.points).toBe(0);       // manushya–rakshasa
    expect(ganaKuta("Ashwini", "Bharani")!.points).toBe(5);     // deva–manushya
  });

  it("yoni: same animal 4, sworn enemies 0", () => {
    expect(yoniKuta("Ashwini", "Shatabhisha")!.points).toBe(4); // horse–horse
    expect(yoniKuta("Uttara Phalguni", "Chitra")!.points).toBe(0); // cow–tiger
  });

  it("nadi: same stream is the zero veto, different streams score 8", () => {
    expect(nadiKuta("Ashwini", "Ardra")!.points).toBe(0);   // adi–adi
    expect(nadiKuta("Ashwini", "Bharani")!.points).toBe(8); // adi–madhya
  });

  it("bhakoot: 6/8 axis is dosha, 1/7 is full", () => {
    expect(bhakootKuta("Aries", "Virgo")!.points).toBe(0);   // 6/8
    expect(bhakootKuta("Aries", "Libra")!.points).toBe(7);   // 1/7
    expect(bhakootKuta("Scorpio", "Cancer")!.points).toBe(0); // 5/9
  });

  it("maitri: Mars befriends the Moon but the Moon is neutral back (canon asymmetry) — friend+neutral = 4", () => {
    const m = maitriKuta("Scorpio", "Cancer")!;
    expect(m.lordA).toBe("Mars");
    expect(m.aToB).toBe("friend");
    expect(m.bToA).toBe("neutral");
    expect(m.points).toBe(4);
  });

  it("vashya: mutual pull scores 2, one-way 1", () => {
    expect(vashyaKuta("Virgo", "Gemini")!.points).toBeGreaterThanOrEqual(1);
    expect(vashyaKuta("Aries", "Leo")!.points).toBe(1);
  });

  it("assembles a full melana with directional currents and the varna note", () => {
    const m = computeMelana({ nakA: "Shatabhisha", nakB: "Rohini", moonSignA: "Aquarius", moonSignB: "Taurus", marsHouseA: 1, marsHouseB: 3 });
    expect(m.currents.aToB).not.toBeNull();
    expect(m.currents.bToA).not.toBeNull();
    expect(m.score.max).toBe(32);
    expect(m.kuja.a).toBe(true);
    expect(m.kuja.balanced).toBe(false);
    expect(m.varnaNote).toContain("omitted");
  });
});
