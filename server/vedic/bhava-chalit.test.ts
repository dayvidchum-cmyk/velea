import { describe, it, expect } from "vitest";
import { computeBhavaCusps, bhavaOf, placeInBhava, bhavaChalitForChart } from "./bhava-chalit";
import { calculateBirthChart } from "../birthchart/calculator";

// Helper: the arc lengths between successive madhyas (house widths), for structural checks.
const widths = (madhya: number[]) =>
  madhya.map((m, i) => ((madhya[(i + 1) % 12] - m + 360) % 360));

describe("bhava-chalit — cusps", () => {
  it("equal fallback (no MC): asc is the CENTRE of house 1, houses a clean 30°", () => {
    const c = computeBhavaCusps(5, null); // 5° Aries rising
    expect(c.method).toBe("equal");
    expect(c.madhya[0]).toBeCloseTo(5, 6);    // house 1 centred on the ascendant degree
    expect(c.madhya[9]).toBeCloseTo(275, 6);  // house 10 centre 270° along
    expect(c.start[0]).toBeCloseTo(350, 6);   // house 1 opens 15° before the asc (5 − 15 → 350)
    for (const w of widths(c.madhya)) expect(w).toBeCloseTo(30, 6);
  });

  it("sripati with symmetric angles (MC = asc − 90) reduces to equal houses", () => {
    const c = computeBhavaCusps(0, 270); // 0° Aries asc, 0° Capricorn MC
    expect(c.method).toBe("sripati");
    for (let i = 0; i < 12; i++) expect(c.madhya[i]).toBeCloseTo(i * 30, 6);
    for (const w of widths(c.madhya)) expect(w).toBeCloseTo(30, 6);
  });

  it("sripati with asymmetric angles trisects each quadrant into UNEQUAL houses", () => {
    const c = computeBhavaCusps(0, 250); // asc 0° Aries, MC at 250° → quadrants 70/110/70/110
    // angles land exactly
    expect(c.madhya[0]).toBeCloseTo(0, 6);    // asc
    expect(c.madhya[3]).toBeCloseTo(70, 6);   // IC = MC+180 = 70
    expect(c.madhya[6]).toBeCloseTo(180, 6);  // dsc
    expect(c.madhya[9]).toBeCloseTo(250, 6);  // MC
    // quadrant asc→ic (70°) trisects to ~23.33 / 46.67
    expect(c.madhya[1]).toBeCloseTo(70 / 3, 5);
    expect(c.madhya[2]).toBeCloseTo((2 * 70) / 3, 5);
    // the two quadrants differ, so house widths are unequal
    const w = widths(c.madhya);
    expect(w[1]).toBeCloseTo(70 / 3, 5);   // house 2 width
    expect(w[4]).toBeCloseTo(110 / 3, 5);  // house 5 width
    expect(w[1]).not.toBeCloseTo(w[4], 2);
    // whatever the split, all 12 widths still sum to a full circle
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(360, 4);
  });
});

describe("bhava-chalit — assignment & the cusp shift", () => {
  it("David's threshold case: a late-Pisces planet the 12th buries, Bhava Chalit lifts to the 1st", () => {
    // 0° Aries rising (symmetric MC). A planet at 28° Pisces (lon 358) is one sign 'behind' the
    // lagna → whole-sign 12th; but it's only 2° below the horizon, so its bhava is the 1st.
    const c = computeBhavaCusps(0, 270);
    const p = placeInBhava(c, 358, 0);
    expect(p.wholeSignHouse).toBe(12);
    expect(p.bhava).toBe(1);
    expect(p.shifted).toBe(true);
  });

  it("a planet early in the ascendant sign but well before the asc degree drops to the 12th", () => {
    // 25° Aries rising, equal bhava. A planet at 8° Aries is 17° before the lagna (> 15°) → 12th.
    const c = computeBhavaCusps(25, null);
    const p = placeInBhava(c, 8, 25);
    expect(p.wholeSignHouse).toBe(1); // same sign as lagna
    expect(p.bhava).toBe(12);         // but below the house-1 span
    expect(p.shifted).toBe(true);
  });

  it("a planet sitting on the ascendant is dead-centre of house 1 and not shifted", () => {
    const c = computeBhavaCusps(0, 270);
    const p = placeInBhava(c, 0, 0);
    expect(p.bhava).toBe(1);
    expect(p.shifted).toBe(false);
    expect(Math.abs(p.degFromMadhya)).toBeCloseTo(0, 6);
  });

  it("assigns cleanly across the 12/1 wrap and every longitude lands in exactly one house", () => {
    const c = computeBhavaCusps(0, 250); // asymmetric
    const counts = new Array(13).fill(0);
    for (let lon = 0; lon < 360; lon += 0.5) counts[bhavaOf(c, lon)]++;
    for (let h = 1; h <= 12; h++) expect(counts[h]).toBeGreaterThan(0);
    expect(counts.slice(1).reduce((a, b) => a + b, 0)).toBe(720); // all sampled points placed
  });

  it("flags a bhava sandhi (junction) as weak", () => {
    const c = computeBhavaCusps(0, 270); // equal → house 1 opens at 345
    const onJunction = placeInBhava(c, 345.5, 0);
    expect(onJunction.nearSandhi).toBe(true);
    const midHouse = placeInBhava(c, 0, 0); // dead centre
    expect(midHouse.nearSandhi).toBe(false);
  });
});

describe("bhava-chalit — on the real primary chart (1982-04-13 17:20 Bataan)", () => {
  it("produces valid 1–12 houses for every planet and reports any cusp shifts", async () => {
    const chart = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", {
      lagnaBasis: "ascendant",
    });
    const lons: Record<string, number> = {
      Sun: chart.sun.longitude, Moon: chart.moon.longitude, Mercury: chart.mercury.longitude,
      Venus: chart.venus.longitude, Mars: chart.mars.longitude, Jupiter: chart.jupiter.longitude,
      Saturn: chart.saturn.longitude, Rahu: chart.rahu.longitude, Ketu: chart.ketu.longitude,
    };
    const { cusps, placements } = bhavaChalitForChart(chart.lagna.longitude, chart.mc.longitude, lons);
    expect(cusps.method).toBe("sripati");

    const shifts: string[] = [];
    for (const [name, pl] of Object.entries(placements)) {
      expect(pl.bhava).toBeGreaterThanOrEqual(1);
      expect(pl.bhava).toBeLessThanOrEqual(12);
      // whole-sign house must match birthchart/calculator's own whole-sign assignment
      expect(pl.wholeSignHouse).toBe((chart as any)[name.toLowerCase()].house);
      if (pl.shifted) shifts.push(`${name}: whole-sign ${pl.wholeSignHouse} → chalit ${pl.bhava}`);
    }
    // Not an assertion about a specific outcome — just surface the shifts so the effect is visible.
    console.log(`Bhava Chalit shifts on the primary chart:\n  ${shifts.length ? shifts.join("\n  ") : "(none — no planet crossed a cusp)"}`);
  });
});
