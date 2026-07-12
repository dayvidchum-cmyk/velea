import { describe, it, expect } from "vitest";
import { crownDay, anchorsFromBodies } from "./crown";
import type { Ashtakavarga } from "../vedic/ashtakavarga";
import { calculateBirthChart } from "../birthchart/calculator";

// Minimal AV stub — crownDay only reads sarva[dayMoonSignIdx]; set one sign, baseline the rest.
const avSarva = (sign: number, bindu: number): Ashtakavarga => {
  const sarva = new Array(12).fill(28);
  sarva[sign] = bindu;
  return { bhinna: {} as any, sarva };
};

// Moon in sign 0 (Aries), native Moon also sign 0, birth star Ashwini (0). dayNakIdxOverride sets tara.
const base = { birthNakIdx: 0, natalMoonSignIdx: 0, lagnaSignIdx: 0, sunLon: 100, moonLon: 5 };

describe("crownDay — the Ashtakavarga interaction matrix", () => {
  it("BOOST: rich ground lifts the score (+2 well above baseline, +1 moderately) and is never a penalty", () => {
    const no = crownDay({ ...base, dayNakIdxOverride: 1 });                                   // Sampat (favorable)
    const strong = crownDay({ ...base, dayNakIdxOverride: 1, ashtakavarga: avSarva(0, 36) });
    const moderate = crownDay({ ...base, dayNakIdxOverride: 1, ashtakavarga: avSarva(0, 31) });
    expect(strong.ashtakavarga?.support).toBe("high");
    expect(strong.score - no.score).toBe(2);
    expect(moderate.score - no.score).toBe(1);
  });

  it("UNBACKED: a favorable tara on a THIN sign is fragile but NEVER docked (delta 0, no veto)", () => {
    const no = crownDay({ ...base, dayNakIdxOverride: 1 });                                    // favorable tara
    const thin = crownDay({ ...base, dayNakIdxOverride: 1, ashtakavarga: avSarva(0, 22) });
    expect(thin.ashtakavarga?.support).toBe("low");
    expect(thin.score - no.score).toBe(0);
  });

  it("VETO (HARD FLOOR): an ADVERSE tara on a thin sign IS caution, full stop — and sinks the score", () => {
    const no = crownDay({ ...base, dayNakIdxOverride: 2 });                                    // Vipat (bad, cycle 1)
    const thin = crownDay({ ...base, dayNakIdxOverride: 2, ashtakavarga: avSarva(0, 22) });
    expect(no.tarabala.quality).toBe("bad");
    expect(thin.rating).toBe("caution"); // the floor forces the verdict regardless of the score
    expect(thin.score - no.score).toBe(-2);
  });

  it("the floor does NOT fire without both axes: adverse tara alone (no AV) isn't forced to caution", () => {
    const adverseNoAv = crownDay({ ...base, dayNakIdxOverride: 2 });                            // bad tara, no AV
    const adverseRich = crownDay({ ...base, dayNakIdxOverride: 2, ashtakavarga: avSarva(0, 36) }); // bad tara, rich ground
    // Neither is force-floored (the pair never converges down), so caution can only come the normal way.
    expect(adverseRich.rating).not.toBe("caution"); // rich ground cushions it out of the floor
    expect(adverseRich.score).toBeGreaterThan(adverseNoAv.score);
  });

  it("CUSHION: an adverse tara on RICH ground is lifted, not vetoed (bindus absorb it)", () => {
    const no = crownDay({ ...base, dayNakIdxOverride: 2 });                                    // adverse tara
    const rich = crownDay({ ...base, dayNakIdxOverride: 2, ashtakavarga: avSarva(0, 36) });
    expect(rich.score - no.score).toBe(2); // boost applies; the −2 veto does NOT fire
  });

  it("omitting AV reproduces the pre-AV score exactly (backward compatible)", () => {
    const without = crownDay({ ...base, dayNakIdxOverride: 1 });
    const neutralAv = crownDay({ ...base, dayNakIdxOverride: 1, ashtakavarga: avSarva(0, 28) });
    expect(neutralAv.score).toBe(without.score); // baseline bindus → no boost, no veto
    expect(without.ashtakavarga).toBeUndefined();
  });
});

describe("crownDay — the apex gate on the real primary chart (1982-04-13)", () => {
  it("computes natal AV from the bodies and never crowns a day without HIGH support", async () => {
    const chart = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", { lagnaBasis: "ascendant" });
    const bodies = ["sun","moon","mars","mercury","jupiter","venus","saturn"].map((k) => ({
      planet: k[0].toUpperCase() + k.slice(1),
      sign: (chart as any)[k].sign as string,
      nakshatra: (chart as any)[k].nakshatra as string,
    }));
    const anchors = anchorsFromBodies(bodies, chart.lagna.sign);
    expect(anchors).not.toBeNull();
    expect(anchors!.ashtakavarga).not.toBeNull(); // all seven grahas present → AV computed

    const si = (l: number) => Math.floor((((l % 360) + 360) % 360) / 30);
    let crowns = 0, checked = 0;
    for (let d = 0; d < 120; d++) {
      const dt = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      const ch: any = await calculateBirthChart(dt, "12:00", 0, 0, "UTC");
      const T: Record<string, number> = { Sun: si(ch.sun.longitude), Moon: si(ch.moon.longitude), Mars: si(ch.mars.longitude), Mercury: si(ch.mercury.longitude), Jupiter: si(ch.jupiter.longitude), Venus: si(ch.venus.longitude), Saturn: si(ch.saturn.longitude) };
      const cd = crownDay({ ...anchors!, sunLon: ch.sun.longitude, moonLon: ch.moon.longitude, transitSignByPlanet: T });
      checked++;
      if (cd.rating === "crown") { crowns++; expect(cd.ashtakavarga?.support).toBe("high"); }
    }
    expect(checked).toBe(120);
    console.log(`Real-chart 120-day scan: ${crowns} crown day(s), all on high-AV ground.`);
  });
});
