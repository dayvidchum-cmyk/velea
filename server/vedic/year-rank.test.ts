import { describe, it, expect } from "vitest";
import { rankYear } from "./year-rank";

// Jyeshtha birth (idx 17), Scorpio natal Moon (idx 7) — David's frame.
const BIRTH_NAK = 17, NATAL_MOON_SIGN = 7;

function mkDays(n: number, startNak = 0): { date: string; dayNakIdx: number; dayMoonSignIdx: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.UTC(2026, 3, 13) + i * 86400000).toISOString().slice(0, 10),
    dayNakIdx: (startNak + i) % 27,
    dayMoonSignIdx: Math.floor(((startNak + i) % 27) * (12 / 27)),
  }));
}

describe("rankYear — the book's ladder (David-approved composition)", () => {
  const r = rankYear({
    birthNakIdx: BIRTH_NAK, natalMoonSignIdx: NATAL_MOON_SIGN,
    days: mkDays(54), windows: [], chains: [],
  });

  it("ranks every day exactly once, 1..N", () => {
    const ranks = r.days.map((d) => d.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 54 }, (_, i) => i + 1));
  });

  it("every good-class day outranks every mixed, which outranks every first-round bad", () => {
    const worstGood = Math.max(...r.days.filter((d) => d.tara.quality === "good").map((d) => d.rank));
    const bestMixed = Math.min(...r.days.filter((d) => d.tara.quality === "mixed").map((d) => d.rank));
    const bestBad = Math.min(...r.days.filter((d) => d.tara.quality === "bad").map((d) => d.rank));
    expect(worstGood).toBeLessThan(bestMixed);
    expect(bestMixed).toBeLessThan(bestBad);
  });

  it("within the good class, Parama Mitra outranks Sampat", () => {
    const pm = r.days.filter((d) => d.tara.taraNum === 9);
    const sampat = r.days.filter((d) => d.tara.taraNum === 2 && d.tara.quality === "good");
    expect(Math.max(...pm.map((d) => d.rank))).toBeLessThan(Math.min(...sampat.map((d) => d.rank)));
  });

  it("windows mark context and break ties, never lift a day across classes", () => {
    const days = mkDays(54);
    const withWin = rankYear({
      birthNakIdx: BIRTH_NAK, natalMoonSignIdx: NATAL_MOON_SIGN, days,
      windows: [{ theme: "identity", startMs: Date.UTC(2026, 3, 13), endMs: Date.UTC(2027, 3, 13) }],
      chains: [],
    });
    // hostile days still bottom even though the window covers the whole span
    const bads = withWin.days.filter((d) => d.tara.quality === "bad");
    for (const b of bads) expect(b.windows).toContain("identity");
    const worstGood = Math.max(...withWin.days.filter((d) => d.tara.quality === "good").map((d) => d.rank));
    expect(Math.min(...bads.map((d) => d.rank))).toBeGreaterThan(worstGood);
  });

  it("summary counts + quiet days = first-round Naidhana only", () => {
    expect(r.summary.favorable + r.summary.softened + r.summary.hostile).toBe(54);
    for (const q of r.summary.quietDates) {
      const d = r.days.find((x) => x.date === q)!;
      expect(d.tara.taraNum).toBe(7);
      expect(d.tara.cycle).toBe(1);
    }
    expect(r.summary.topDates).toHaveLength(12);
  });
});

// REAL SKY, Boston, 2026-07-19 → 2027-07-18: "<majority nakshatra idx>|<moon sign idx at sunrise>"
// per day, captured from calcPanchang. Real data because the two are NOT locked together the
// way an idealised generator makes them — and that slip is exactly where this bug lived.
const REAL_SKY_365 = (
  "12|5,13|5,14|6,15|6,16|6,16|7,17|7,18|8,19|8,20|8,21|9,22|9,23|10,24|10,25|10,26|11,0|11,1|0,2|0" +
  ",3|1,4|1,5|2,6|2,7|3,8|3,9|4,10|4,11|5,12|5,13|5,14|6,15|6,16|7,17|7,18|8,19|8,20|8,21|9,22|9,23" +
  "|10,24|10,24|10,25|11,0|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,8|3,9|4,10|4,11|4,12|5,13|5,14|6,15|6,16|" +
  "7,17|7,18|7,19|8,19|8,20|9,21|9,22|9,23|10,24|10,25|11,26|11,0|0,1|0,2|1,3|1,5|2,6|2,7|2,8|3,9|3" +
  ",10|4,11|4,12|5,13|5,14|6,15|6,16|6,17|7,17|7,18|8,19|8,20|8,21|9,22|9,23|10,24|10,25|11,26|11,0" +
  "|11,1|0,2|0,3|1,4|1,5|2,6|2,8|3,9|3,10|4,11|4,12|5,13|5,13|5,14|6,15|6,16|7,17|7,18|8,19|8,20|8," +
  "21|9,22|9,23|10,23|10,24|10,25|11,26|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,8|3,9|4,10|4,11|5,12|5,13|5," +
  "14|6,15|6,16|7,17|7,18|7,19|8,20|8,20|9,21|9,22|9,23|10,24|10,25|11,26|11,0|0,1|0,2|0,3|1,5|1,6|" +
  "2,7|3,8|3,9|3,10|4,11|4,12|5,13|5,14|6,15|6,16|7,17|7,18|7,18|8,19|8,20|9,21|9,22|9,23|10,24|10," +
  "25|11,26|11,0|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,9|3,10|4,11|4,12|5,13|5,14|6,15|6,16|6,16|7,17|7,18" +
  "|8,19|8,20|8,21|9,22|9,23|10,24|10,25|10,26|11,26|11,0|0,1|0,3|1,4|1,5|2,6|2,7|3,8|3,9|4,10|4,11" +
  "|4,12|5,13|5,14|6,15|6,16|7,17|7,18|8,19|8,20|8,21|9,22|9,22|9,23|10,24|10,25|11,26|11,0|0,1|0,2" +
  "|0,3|1,4|1,5|2,6|2,8|3,9|3,10|4,11|4,12|5,13|5,14|6,15|6,16|7,17|7,18|7,19|8,19|8,20|9,21|9,22|9" +
  ",23|10,24|10,25|11,26|11,0|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,8|3,9|4,10|4,11|5,12|5,13|5,14|6,15|6," +
  "16|7,17|7,18|8,19|8,20|8,21|9,22|9,23|10,24|10,25|10,25|11,26|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,8|3" +
  ",9|4,10|4,11|4,12|5,13|5,14|6,15|6,16|7,17|7,18|7,19|8,20|8,21|9,21|9,22|9,23|10,24|10,25|11,26|" +
  "11,0|0,1|0,2|0,3|1,4|1,6|2,7|2,8|3,9|3,10|4,11|4,12|5,13|5,14|6,15|6,16|7,17|7,18|7,19|8,19|8,20" +
  "|9,21|9,22|9,23|10,24|10,25|11,26|11,0|11,1|0,2|0,3|1,4|1,5|2,6|2,7|3,8|3,10|4,11|4,12|5,13|5,14" +
  "|6,15|6,16|6,16|7,17|7,18|8,19|8,20|8"
).split(",").map((s) => { const [n, m] = s.split("|").map(Number); return { dayNakIdx: n, dayMoonSignIdx: m }; });

const REAL_DAYS = REAL_SKY_365.map((d, i) => ({
  date: new Date(Date.UTC(2026, 6, 19) + i * 86400000).toISOString().slice(0, 10),
  ...d,
}));

// THE CROWN IS THE CONVERGENCE — both Moon strengths together, never the best star alone.
// These fail against the pre-2026-07-20 ranking, which took the top 12 off the tara ladder and
// let chandra be decided for it: measured over three real charts × a full year of sky, EVERY
// Parama Mitra day of the year carried BAD chandrabala (43/43, 41/41, 40/40), so all twelve
// "crowning days" landed on houses 4/8/12 from the native's own Moon — and the reading's own
// crown gate agreed with 0 of them.
// WHY THIS SURVIVED SO LONG: it does not misfire on David's own chart. Whether the best tara rung
// lands on a good or an adverse chandra house depends on where the birth star sits inside its
// sign, so the old ranking looked correct on the one profile the app is tested from (17/Scorpio)
// and was 12-for-12 WRONG on others. Both are asserted below; the second is the one that failed.
const ANCHORS = [
  { label: "David's frame (Jyeshtha / Scorpio Moon) — the old code looked fine here", birthNakIdx: 17, natalMoonSignIdx: 7 },
  { label: "Uttara Ashadha / Capricorn Moon — every tara-9 day of this year is chandra-BAD", birthNakIdx: 20, natalMoonSignIdx: 9 },
];

describe("rankYear — a crown day is never a day the native's Moon is weak", () => {
  const r = rankYear({
    birthNakIdx: BIRTH_NAK, natalMoonSignIdx: NATAL_MOON_SIGN,
    days: REAL_DAYS, windows: [], chains: [],
  });

  it.each(ANCHORS)("every crowned day has BOTH a favorable tara and a favorable chandra — $label", ({ birthNakIdx, natalMoonSignIdx }) => {
    const y = rankYear({ birthNakIdx, natalMoonSignIdx, days: REAL_DAYS, windows: [], chains: [] });
    expect(y.summary.topDates.length).toBeGreaterThan(0); // denominator: there are crowns to check
    for (const date of y.summary.topDates) {
      const d = y.days.find((x) => x.date === date)!;
      expect(d.tara.favorable, `${date} tara ${d.tara.name}`).toBe(true);
      expect(d.chandra.favorable, `${date} chandra house ${d.chandra.house}`).toBe(true);
    }
  });

  it("the crowns are the BEST of the convergent days, not merely twelve of them", () => {
    const convergent = r.days.filter((d) => d.tara.favorable && d.chandra.favorable);
    expect(r.summary.convergent).toBe(convergent.length);
    expect(convergent.length).toBeGreaterThan(12); // else the cap isn't being exercised
    const worstCrown = Math.max(...r.summary.topDates.map((date) => r.days.find((x) => x.date === date)!.rank));
    const bestUncrowned = Math.min(
      ...convergent.filter((d) => !r.summary.topDates.includes(d.date)).map((d) => d.rank));
    expect(worstCrown).toBeLessThan(bestUncrowned);
  });

  it("a year with fewer than 12 convergent days gets fewer crowns, not padding", () => {
    // 20 days only — far too few for twelve convergences.
    const thin = rankYear({
      birthNakIdx: BIRTH_NAK, natalMoonSignIdx: NATAL_MOON_SIGN,
      days: REAL_DAYS.slice(0, 20), windows: [], chains: [],
    });
    expect(thin.summary.topDates.length).toBe(thin.summary.convergent);
    expect(thin.summary.topDates.length).toBeLessThan(12);
    for (const date of thin.summary.topDates) {
      const d = thin.days.find((x) => x.date === date)!;
      expect(d.tara.favorable && d.chandra.favorable).toBe(true);
    }
  });
});
