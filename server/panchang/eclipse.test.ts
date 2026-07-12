import { describe, it, expect } from "vitest";
import { eclipseSeason } from "./affliction";

// eclipseSeason reads WHERE in the ~5-week season a date sits, from the Sun's angle off the nodal
// axis. "approaching" = Sun still before the node (the build); "leaving" = Sun past it (aftermath).
// Rahu at 100° → Ketu at 280°. Hand-computed, then checked against the code — this drives whether
// an eclipse reads as caution (building/peak) or as the forward-opening aftermath.

describe("eclipseSeason — phase side + in-season detection", () => {
  it("Sun before Rahu → approaching (building)", () => {
    const s = eclipseSeason(90, 100);
    expect(s).toMatchObject({ inSeason: true, node: "Rahu", side: "approaching", sunAxisOrbDeg: 10 });
  });
  it("Sun past Rahu → leaving (aftermath)", () => {
    const s = eclipseSeason(110, 100);
    expect(s).toMatchObject({ inSeason: true, node: "Rahu", side: "leaving", sunAxisOrbDeg: 10 });
  });
  it("Sun near Ketu (opposite node) picks Ketu", () => {
    expect(eclipseSeason(270, 100)).toMatchObject({ node: "Ketu", side: "approaching", inSeason: true });
    expect(eclipseSeason(285, 100)).toMatchObject({ node: "Ketu", side: "leaving", inSeason: true, sunAxisOrbDeg: 5 });
  });
  it("season boundary is the solar ecliptic limit (~18.5°)", () => {
    expect(eclipseSeason(118, 100).inSeason).toBe(true);   // 18° in
    expect(eclipseSeason(119.5, 100).inSeason).toBe(false); // 19.5° out
  });
  it("well clear of the axis → not in season", () => {
    expect(eclipseSeason(160, 100).inSeason).toBe(false);
  });
  it("handles wrap around 0°/360°", () => {
    // Rahu at 5°, Sun at 355° → 10° before the node (approaching).
    const s = eclipseSeason(355, 5);
    expect(s).toMatchObject({ node: "Rahu", side: "approaching", inSeason: true, sunAxisOrbDeg: 10 });
  });
});
