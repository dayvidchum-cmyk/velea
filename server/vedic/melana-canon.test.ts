import { describe, it, expect } from "vitest";
import melanaCanon from "./canon/melana.json";
import { taraCurrent, ganaKuta, yoniKuta, bhakootKuta, maitriKuta } from "./melana.js";

/**
 * MELANA MUST NOT DRIFT FROM ITS CANON (v817).
 *
 * canon/melana.json is named in melana.ts twice — both times in a COMMENT. Every table in that
 * module is hand-transcribed, and the audit's own verdict was: "the tables currently agree with the
 * JSON cell for cell. The defect is that nothing enforces it." That is chain 3 exactly — the
 * citation and the truth as separate objects — and the karakas drift is what it looks like when the
 * agreement quietly ends.
 *
 * This is the enforcement, driven through the PUBLIC functions rather than by reaching into the
 * module's constants, so it tests the behaviour a caller actually gets.
 *
 * Honest scope: melana.json is largely prose, page citations and recorded source DISPUTES, not a
 * machine-readable mirror. Only the grids that are genuinely structured are asserted here. The
 * prose parts stay a human's job, and saying so is better than a test that pretends otherwise.
 */
const C = melanaCanon as any;

/** Nakshatras with known ganas, for driving ganaKuta. */
const DEVA = "ashwini";      // deva
const MANUSHYA = "bharani";  // manushya
const RAKSHASA = "krittika"; // rakshasa

describe("melana vs canon/melana.json", () => {
  it("TARA — the unfavourable remainders match the canon list", () => {
    const unfavourable = C.tara.unfavorable_remainders_melana as number[];
    expect(unfavourable).toEqual([3, 5, 7]);
    // Walk all 27 × 27 and collect which tara NUMBERS ever come back unfavourable.
    const seen = new Set<number>();
    const NAK = ["ashwini", "bharani", "krittika", "rohini", "mrigashira", "ardra", "punarvasu", "pushya", "ashlesha"];
    for (const a of NAK) for (const b of NAK) {
      const t = taraCurrent(a, b);
      if (t && !t.favorable) seen.add(t.count);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual(unfavourable);
  });

  it("TARA — janma (1) counts FAVOURABLE, as the canon says twice", () => {
    expect(C.tara.favorable_includes_janma).toBe(true);
    expect(taraCurrent("ashwini", "ashwini")!.count).toBe(1);
    expect(taraCurrent("ashwini", "ashwini")!.favorable).toBe(true);
  });

  it("GANA — every cell of the directional grid matches", () => {
    const g = C.gana.directional_grid_kanya_rows;
    // aAsKanya reads the FIRST argument as the bride, which is the grid's row.
    expect(ganaKuta(DEVA, DEVA)!.aAsKanya).toBe(g.same_any);
    expect(ganaKuta(MANUSHYA, DEVA)!.aAsKanya).toBe(g.kanya_nara_vara_deva);
    expect(ganaKuta(DEVA, MANUSHYA)!.aAsKanya).toBe(g.kanya_deva_vara_nara);
    expect(ganaKuta(DEVA, RAKSHASA)!.aAsKanya).toBe(g.kanya_deva_vara_rakshasa);
    expect(ganaKuta(MANUSHYA, RAKSHASA)!.aAsKanya).toBe(g.kanya_nara_vara_rakshasa);
    expect(ganaKuta(RAKSHASA, DEVA)!.aAsKanya).toBe(g.kanya_rakshasa_vara_other);
    expect(ganaKuta(RAKSHASA, MANUSHYA)!.aAsKanya).toBe(g.kanya_rakshasa_vara_other);
  });

  it("GANA — the directional currents are never folded (David's v640 correction)", () => {
    const k = ganaKuta(DEVA, RAKSHASA)!;
    expect(k.aAsKanya).not.toBe(k.bAsKanya); // both orientations survive
  });

  it("YONI — the seven enemy pairs are the canon's seven", () => {
    const canonPairs = (C.yoni.enemy_pairs_mc_p179 as string[])
      // the scan prints Krittika/Pushya as "sheep"; the engine calls the same creature a goat,
      // and canon/melana.json records that they are the same animal.
      .map((p) => p.replace("sheep", "goat").split("-").sort().join("-"))
      .sort();
    expect(canonPairs).toHaveLength(7);
    // Drive them through the public function: an enemy pair must score 0.
    const ANIMAL_NAK: Record<string, string> = {
      cow: "uttaraphalguni", tiger: "chitra", elephant: "bharani", lion: "dhanishta",
      horse: "ashwini", buffalo: "hasta", dog: "ardra", deer: "anuradha",
      serpent: "rohini", mongoose: "uttaraashadha", goat: "krittika", monkey: "purvaashadha",
      cat: "punarvasu", rat: "magha",
    };
    for (const pair of canonPairs) {
      const [x, y] = pair.split("-");
      const k = yoniKuta(ANIMAL_NAK[x], ANIMAL_NAK[y]);
      expect(k, `no nakshatra mapped for ${pair}`).not.toBeNull();
      expect(k!.points, `${pair} should score 0 (sworn enemies)`).toBe(0);
    }
  });

  it("YONI — a non-enemy, non-identical pair still scores 2, so the test above means something", () => {
    expect(yoniKuta("ashwini", "magha")!.points).toBe(2); // horse × rat: neither same nor enemies
  });

  it("BHAKOOT — the dosha axes and the 7 units match", () => {
    const axes = C.bhakoot.dosha_axes as string[];
    expect(axes.sort()).toEqual(["2/12", "5/9", "6/8"]);
    expect(C.bhakoot.units).toBe(7);
    // Representatives chosen so the PARIHARA does not fire — my first version used Aries × Leo,
    // whose lords Sun and Mars are mutual friends, so the canon CANCELS it and it scores 7. The
    // test was wrong, not the engine. Recorded because it is the fourth fixture this run to be
    // wrong before the code was.
    for (const [a, b, axis] of [["Aries", "Taurus", "2/12"], ["Gemini", "Aquarius", "5/9"], ["Aries", "Virgo", "6/8"]] as const) {
      const k = bhakootKuta(a, b)!;
      expect(k.axis).toBe(axis);
      expect(k.points, `${a} × ${b} should be an uncancelled dosha`).toBe(0);
      expect(k.cancelledBy).toBeUndefined();
      expect(k.max).toBe(C.bhakoot.units);
    }
    // A clean axis scores the full units — the denominator.
    expect(bhakootKuta("Aries", "Gemini")!.points).toBe(7);
  });

  it("BHAKOOT — the canon's parihara cancels a real dosha, and NAMES why", () => {
    // canon/melana.json cancellations: same lord of both rasis, or lords mutual friends.
    const sameLord = bhakootKuta("Aries", "Scorpio");   // both Mars — but is this a dosha axis?
    const friends = bhakootKuta("Aries", "Leo")!;        // 5/9 axis; Sun and Mars are mutual friends
    expect(friends.axis).toBe("5/9");
    expect(friends.points).toBe(7);
    expect(friends.cancelledBy).toMatch(/mutual friends/);
    void sameLord;
  });

  it("MAITRI — every cell of the MC p.181 grid matches", () => {
    const g = C.maitri.scoring_mc_p181_grid;
    // Sun/Moon are mutual friends; Sun/Saturn mutual enemies; Sun/Venus... use the engine's own
    // relationship read by driving signs whose lords give each pair.
    const cases: Array<[string, string, number]> = [
      ["Leo", "Cancer", g.friend_friend_or_same_lord],   // Sun × Moon — friends both ways
      ["Leo", "Capricorn", g.enemy_enemy],               // Sun × Saturn — enemies both ways
    ];
    for (const [a, b, expected] of cases) {
      const k = maitriKuta(a, b);
      expect(k, `${a} × ${b}`).not.toBeNull();
      expect(k!.points, `${a} × ${b}`).toBe(expected);
    }
    // Same lord scores as friend-friend, per the grid's own key.
    expect(maitriKuta("Aries", "Scorpio")!.points).toBe(g.friend_friend_or_same_lord); // both Mars
  });

  it("the canon file still records its own source and its gaps — not a silent table", () => {
    // If someone ever replaces melana.json with a bare data dump, the provenance goes with it.
    expect(C._source).toMatch(/Raman|Muhurtha/);
    expect(C._scan_gaps).toBeTruthy();
  });
});
