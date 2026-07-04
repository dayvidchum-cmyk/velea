/**
 * Proof harness for server/panchang/affliction.ts — combustion, nodal affliction, and
 * real-eclipse proximity. Verified against:
 *   (1) geometry unit cases (orbs applied correctly, retrograde variants),
 *   (2) KNOWN 2026 eclipse dates — the eclipseNear flag must fire near each and stay
 *       null on a control date with no eclipse that fortnight.
 *
 * Run: npx tsx server/scripts/affliction-check.ts
 */
import "dotenv/config";
import { combustion, nodalAffliction, eclipseNear, sep, COMBUSTION_ORB } from "../panchang/affliction.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";

let fails = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fails++;
};

async function main() {
  console.log("=== 1. COMBUSTION geometry (classical orbs) ===");
  // Mercury direct orb 14°: combust at 10°, clear at 16°.
  ok("Mercury 10° from Sun → combust", combustion("Mercury", 10, 0, false)!.combust === true);
  ok("Mercury 16° from Sun → clear", combustion("Mercury", 16, 0, false)!.combust === false);
  // Mercury retrograde orb tightens to 12°: 13° is now clear.
  ok("Mercury 13° retro → clear (12° orb)", combustion("Mercury", 13, 0, true)!.combust === false);
  // Venus direct 10° / retro 8°.
  ok("Venus 9° direct → combust", combustion("Venus", 9, 0, false)!.combust === true);
  ok("Venus 9° retro → clear (8° orb)", combustion("Venus", 9, 0, true)!.combust === false);
  // Mars widest at 17°.
  ok("Mars 16° → combust (17° orb)", combustion("Mars", 16, 0, false)!.combust === true);
  // Wrap-around: 355° vs 2° is 7° apart.
  ok("Jupiter across 0° boundary (355 vs 2 = 7°)", combustion("Jupiter", 355, 2)!.combust === true);
  // Not applicable to Sun / nodes.
  ok("Sun has no combustion", combustion("Sun", 0, 0) === null);
  ok("Rahu has no combustion", combustion("Rahu", 0, 0) === null);

  console.log("\n=== 2. NODAL affliction (same orb table, vs Rahu/Ketu axis) ===");
  // Rahu at 100°, Ketu at 280°. Saturn (orb 15°) at 110° → 10° from Rahu → afflicted.
  ok("Saturn 10° from Rahu → afflicted", nodalAffliction("Saturn", 110, 100)!.afflicted === true, "node=" + nodalAffliction("Saturn", 110, 100)!.node);
  // Mars at 285° → 5° from Ketu(280) → afflicted, node=Ketu.
  const m = nodalAffliction("Mars", 285, 100)!;
  ok("Mars 5° from Ketu → afflicted, Ketu", m.afflicted === true && m.node === "Ketu");
  // Jupiter (orb 11°) 13° from nearest node → clear.
  ok("Jupiter 13° from node → clear", nodalAffliction("Jupiter", 113, 100)!.afflicted === false);

  console.log("\n=== 3. ECLIPSE proximity vs KNOWN 2026 eclipses ===");
  // Source: NASA/known ephemeris — 2026 eclipses:
  //   Feb 17 2026 annular SOLAR, Mar 03 2026 total LUNAR,
  //   Aug 12 2026 total SOLAR,  Aug 28 2026 partial LUNAR.
  const cases: Array<{ date: string; expect: "solar" | "lunar" | null }> = [
    { date: "2026-02-17", expect: "solar" },
    { date: "2026-03-03", expect: "lunar" },
    { date: "2026-08-12", expect: "solar" },
    { date: "2026-08-28", expect: "lunar" },
    { date: "2026-07-03", expect: null },   // control: no eclipse this fortnight
    { date: "2026-05-15", expect: null },   // control
  ];
  for (const c of cases) {
    const noon = new Date(c.date + "T12:00:00Z");
    const lon = await getSiderealLongitudes(noon, ["Sun", "Moon", "Rahu"]);
    const e = eclipseNear(lon["Sun"], lon["Moon"], lon["Rahu"]);
    ok(
      `${c.date} → ${e.type ?? "none"} (expect ${c.expect ?? "none"})`,
      e.type === c.expect,
      `syzygy=${e.syzygy} days=${e.daysToSyzygy} sun–node=${e.sunNodeOrbDeg}° (limit ${e.limitDeg}°)`,
    );
  }

  console.log("\n=== 4. Live sanity — combustion & nodal status right now (2026-07-03) ===");
  const noon = new Date("2026-07-03T12:00:00Z");
  const P = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const L = await getSiderealLongitudes(noon, P);
  for (const p of Object.keys(COMBUSTION_ORB)) {
    const c = combustion(p, L[p], L["Sun"]);
    const n = nodalAffliction(p, L[p], L["Rahu"]);
    console.log(`  ${p.padEnd(8)} sun ${sep(L[p], L["Sun"]).toFixed(1).padStart(5)}° ${c!.combust ? "COMBUST" : "clear  "}   node ${n!.orbDeg.toFixed(1).padStart(5)}° ${n!.afflicted ? "AFFLICTED(" + n!.node + ")" : "clear"}`);
  }

  console.log(`\n${fails === 0 ? "ALL PASS ✓" : fails + " FAILED ✗"}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
