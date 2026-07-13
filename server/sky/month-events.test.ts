import { describe, it, expect, beforeAll } from "vitest";
import { calculateBirthChart } from "../birthchart/calculator";
import { monthEvents } from "./month-events";

// David's chart (Virgo lagna). Pins the month scanner's big beats for known 2026 months.
describe("monthEvents — the month's big beats, mapped to the chart", () => {
  let natal: Record<string, number>;
  let lagna: string;
  beforeAll(async () => {
    const ch: any = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", { lagnaBasis: "ascendant" });
    natal = {}; for (const p of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]) natal[p[0].toUpperCase() + p.slice(1)] = ch[p].longitude;
    natal["Asc"] = ch.lagna.longitude;
    lagna = ch.lagna.sign;
  });

  it("finds the month's lunations (one New, one Full) in July 2026", async () => {
    const scan = await monthEvents("2026-07-15", natal, lagna);
    expect(scan.month).toBe("2026-07");
    expect(scan.events.some((e) => e.kind === "newmoon")).toBe(true);
    expect(scan.events.some((e) => e.kind === "fullmoon")).toBe(true);
  });

  it("finds a Mercury station in July 2026 (it turns direct on the 24th)", async () => {
    const scan = await monthEvents("2026-07-15", natal, lagna);
    const st = scan.events.find((e) => e.kind === "station" && (e as any).planet === "Mercury");
    expect(st).toBeTruthy();
    expect((st as any).direction).toBe("direct");
  });

  it("finds both August 2026 eclipses, mapped to houses (solar 11th / lunar 6th for Virgo lagna)", async () => {
    const scan = await monthEvents("2026-08-15", natal, lagna);
    const ecl = scan.events.filter((e) => e.kind === "eclipse");
    expect(ecl.length).toBe(2);
    const solar = ecl.find((e) => (e as any).type === "solar");
    const lunar = ecl.find((e) => (e as any).type === "lunar");
    expect(solar!.house).toBe(11);
    expect(lunar!.house).toBe(6);
  });

  it("every event carries a concrete house gloss (never a bare number)", async () => {
    const scan = await monthEvents("2026-07-15", natal, lagna);
    expect(scan.events.length).toBeGreaterThan(0);
    for (const e of scan.events) { expect(e.house).toBeGreaterThanOrEqual(1); expect(e.houseGloss.length).toBeGreaterThan(3); }
  });
});
