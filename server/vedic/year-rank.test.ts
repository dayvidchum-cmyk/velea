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
