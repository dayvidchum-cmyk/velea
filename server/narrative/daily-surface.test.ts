import { describe, expect, it } from "vitest";
import { DAILY_SURFACES, PINNED_SURFACES, pickDailyRows, readingProse } from "./daily-surface";

// CONTROLS for the retired-surface bug: every assertion below FAILS against the old code
// (which asked for "glance" alone and pulled prose out of a `narrative` field only). The
// denominator is asserted in each case so a structurally blind pass is impossible.

const GLANCE = { narrative: "The tide is going out.  Let it." };
const DAY_READ = { scene: "A low grey morning.", story: "You have been carrying it alone.", tilt: "Ask.", closeLine: "x", question: "y" };

describe("readingProse", () => {
  it("reads the day_read shape — the OLD extractor found no `narrative` and emitted raw JSON", () => {
    const prose = readingProse(DAY_READ);
    expect(prose).toContain("A low grey morning.");
    expect(prose).toContain("You have been carrying it alone.");
    expect(prose).not.toContain("{"); // the old fallback: String(content) — a JSON blob in the archive
    // control: the old path's only source field is genuinely absent here
    expect((DAY_READ as Record<string, unknown>).narrative).toBeUndefined();
  });

  it("still reads the legacy glance shape, whitespace-collapsed", () => {
    expect(readingProse(GLANCE)).toBe("The tide is going out. Let it.");
  });

  it("returns empty (never a blob) when there is no prose", () => {
    expect(readingProse({ question: "only a question" })).toBe("");
    expect(readingProse(null)).toBe("");
    expect(readingProse({ story: 42 })).toBe("");
  });
});

describe("pickDailyRows", () => {
  const rows = [
    { surface: "glance", cacheDate: "2026-07-18", tag: "old" },
    { surface: "day_read", cacheDate: "2026-07-18", tag: "live" },
    { surface: "day_read", cacheDate: "2026-07-19", tag: "live" },
    { surface: "glance", cacheDate: "2026-07-01", tag: "old" },
  ];

  it("keeps ONE row per date, day_read winning regardless of input order", () => {
    const picked = pickDailyRows(rows, 120);
    expect(picked).toHaveLength(3); // denominator: 4 rows in, 3 distinct dates out
    expect(picked.map((r) => r.cacheDate)).toEqual(["2026-07-19", "2026-07-18", "2026-07-01"]); // newest first
    expect(picked.find((r) => r.cacheDate === "2026-07-18")?.tag).toBe("live"); // glance came FIRST in the list
    // reversed input must give the identical result — the winner is the surface, not the order
    expect(pickDailyRows([...rows].reverse(), 120).find((r) => r.cacheDate === "2026-07-18")?.tag).toBe("live");
  });

  it("keeps a legacy glance date the day_read never covered — pre-switch archive survives", () => {
    expect(pickDailyRows(rows, 120).find((r) => r.cacheDate === "2026-07-01")?.tag).toBe("old");
  });

  it("honors the limit AFTER dedupe (the query over-fetches both surfaces)", () => {
    expect(pickDailyRows(rows, 2).map((r) => r.cacheDate)).toEqual(["2026-07-19", "2026-07-18"]);
  });
});

describe("the surface lists themselves", () => {
  it("day_read — the read actually on screen — is the canonical daily surface and is pinnable", () => {
    expect(DAILY_SURFACES[0]).toBe("day_read");
    expect(PINNED_SURFACES).toContain("day_read"); // the whole bug: the pin wrote glance + deep only
    expect(PINNED_SURFACES).toContain("deep");
    expect(PINNED_SURFACES).toContain("glance"); // legacy pins must still UNPIN
  });
});
