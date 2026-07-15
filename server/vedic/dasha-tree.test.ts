import { describe, it, expect } from "vitest";
import { dashaTree, dashaChainAt, DASHA_SEQUENCE, type DashaPeriod } from "./dasha-tree";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const BIRTH = Date.UTC(1990, 5, 15, 8, 30);

describe("dasha tree — structure", () => {
  it("0° Ashwini birth: full Ketu maha first, 120 years total, exact tiling", () => {
    const t = dashaTree(BIRTH, 0, 1);
    expect(t).toHaveLength(9);
    expect(t[0].lords).toEqual(["Ketu"]);
    expect(t[0].startMs).toBe(BIRTH);
    expect(t[0].endMs - t[0].startMs).toBeCloseTo(7 * MS_PER_YEAR, -4);
    const total = t[t.length - 1].endMs - BIRTH;
    expect(total).toBeCloseTo(120 * MS_PER_YEAR, -4);
    // Sequence order from Ketu
    expect(t.map((p) => p.lords[0])).toEqual(DASHA_SEQUENCE.map((d) => d.planet));
  });

  it("levels tile their parents exactly — no drift at any depth", () => {
    const t = dashaTree(BIRTH, 0, 3);
    const mahas = t.filter((p) => p.level === 1);
    for (const maha of mahas) {
      const antars = t.filter((p) => p.level === 2 && p.lords[0] === maha.lords[0]);
      expect(antars).toHaveLength(9);
      expect(antars[0].startMs).toBe(maha.startMs);
      expect(antars[antars.length - 1].endMs).toBe(maha.endMs); // last child snaps
      for (let i = 1; i < antars.length; i++) {
        expect(antars[i].startMs).toBe(antars[i - 1].endMs); // gapless
      }
    }
  });

  it("each level starts from its own lord (antar sequence begins with the maha lord)", () => {
    const t = dashaTree(BIRTH, 0, 2);
    const venusAntars = t.filter((p) => p.level === 2 && p.lords[0] === "Venus");
    expect(venusAntars[0].lords).toEqual(["Venus", "Venus"]);
    expect(venusAntars[1].lords).toEqual(["Venus", "Sun"]);
  });

  it("full 5-level tree emits the classical counts (9/81/729/6561/59049 minus pre-birth)", () => {
    // Born at 0° Ashwini nothing precedes birth → exact counts.
    const t = dashaTree(BIRTH, 0, 5);
    const byLevel = [1, 2, 3, 4, 5].map((l) => t.filter((p) => p.level === l).length);
    expect(byLevel).toEqual([9, 81, 729, 6561, 59049]);
  });
});

describe("dasha tree — mid-nakshatra birth (elapsed fraction)", () => {
  // Moon at half of Ashwini: half the Ketu maha (3.5y) remains at birth.
  const t = dashaTree(BIRTH, 360 / 27 / 2, 2);

  it("the birth maha is clipped to the birth instant with the remaining span", () => {
    const ketu = t.find((p) => p.level === 1 && p.lords[0] === "Ketu")!;
    expect(ketu.startMs).toBe(BIRTH);
    expect(ketu.endMs - ketu.startMs).toBeCloseTo(3.5 * MS_PER_YEAR, -5);
  });

  it("pre-birth antars are pruned; the straddling antar is clipped", () => {
    // Scope to the FIRST Ketu maha — the second cycle repeats Ketu near age 116.
    const firstMahaEnd = t.find((p) => p.level === 1 && p.lords[0] === "Ketu")!.endMs;
    const ketuAntars = t.filter((p) => p.level === 2 && p.lords[0] === "Ketu" && p.startMs < firstMahaEnd);
    // Half of a 7y maha elapsed = 3.5y = Ketu(0.4083y)+Venus(1.1667y)+Sun(0.35y)+Moon(0.5833y)
    // +Mars(0.4083y) = 2.9167y, then 0.5833y into Rahu → Rahu straddles birth.
    expect(ketuAntars[0].lords[1]).toBe("Rahu");
    expect(ketuAntars[0].startMs).toBe(BIRTH);
    // and the timeline still runs gapless to the maha end
    for (let i = 1; i < ketuAntars.length; i++) {
      expect(ketuAntars[i].startMs).toBe(ketuAntars[i - 1].endMs);
    }
  });

  it("coverage reaches age 120 by continuing into the second cycle (directive #2)", () => {
    const mahas = t.filter((p) => p.level === 1);
    const total = mahas[mahas.length - 1].endMs - BIRTH;
    // One cycle alone would stop at 116.5y (3.5y elapsed pre-birth). The second cycle's
    // Ketu maha (7y) carries coverage past the 120th birthday.
    expect(total).toBeGreaterThanOrEqual(120 * MS_PER_YEAR);
    expect(mahas).toHaveLength(10);
    expect(mahas[9].lords).toEqual(["Ketu"]); // the cycle restarts with the same sequence
    // and the second-cycle maha still tiles gaplessly against the first cycle's end
    expect(mahas[9].startMs).toBe(mahas[8].endMs);
  });
});

describe("dashaChainAt — spot lookup", () => {
  it("returns one period per level, nested consistently", () => {
    const t = dashaTree(BIRTH, 100, 5); // arbitrary Moon longitude
    const at = BIRTH + 25 * MS_PER_YEAR;
    const chain = dashaChainAt(t, at);
    expect(chain).toHaveLength(5);
    for (let l = 0; l < 5; l++) {
      expect(chain[l].level).toBe(l + 1);
      // each deeper period's lords extend the shallower chain
      if (l > 0) expect(chain[l].lords.slice(0, l)).toEqual(chain[l - 1].lords);
      expect(at).toBeGreaterThanOrEqual(chain[l].startMs);
      expect(at).toBeLessThan(chain[l].endMs);
    }
  });

  it("agrees with the legacy day-grain calculator on the maha/antar lords", async () => {
    // Cross-check against dasha-calculator.ts for a real chart: Moon 234.511128 (Jyeshtha).
    const { calculateDashaTimeline } = await import("../dasha-calculator");
    const birthDate = "1990-06-15";
    const legacy = calculateDashaTimeline(birthDate, "Jyeshtha", "Scorpio", "24.51", "2026-07-14", "234.511128");
    const cur = legacy.entries.find((e) => e.isCurrent)!;
    const t = dashaTree(Date.UTC(1990, 5, 15, 0, 0), 234.511128, 2);
    const chain = dashaChainAt(t, Date.UTC(2026, 6, 14, 12));
    expect(chain[0].lords[0]).toBe(cur.mahadasha);
    expect(chain[1].lords[1]).toBe(cur.antardasha);
  });
});
