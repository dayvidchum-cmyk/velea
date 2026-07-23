/**
 * COMBUSTION-SCAN — the tuning surface for the Solar Relationship continuum (David 2026-07-23).
 *
 * Prints, per planet, the distance from the Sun at which each state begins — so David can SEE the
 * curve and move the thresholds (CAZIMI_DEG / HEART_DEG / COMBUST_TIER in server/panchang/
 * affliction.ts) by looking. No DB. Run it, read the boundaries, tune, re-run.
 *
 *   npx tsx server/scripts/combustion-scan.ts
 */
import { solarRelationship, COMBUSTION_ORB } from "../panchang/affliction.js";

const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
const planets = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Moon"];

console.log("\n  THE SOLAR RELATIONSHIP — first curve (tune affliction.ts, re-run)\n");
console.log("  Each cell is the FIRST distance (deg from Sun) at which that state begins, scanning inward.\n");
console.log("  " + pad("planet (orb)", 16) + ["cazimi", "heart", "deep", "strong", "moderate", "mild", "free"].map((s) => pad(s, 10)).join(""));
console.log("  " + "-".repeat(16 + 7 * 10));

for (const p of planets) {
  const limit = COMBUSTION_ORB[p].direct;
  // Walk outward in fine steps; record the outermost distance that still yields each state.
  const firstAt: Record<string, number> = {};
  for (let d = 0; d <= limit + 1; d += 0.01) {
    const s = solarRelationship(d, limit);
    if (!(s in firstAt)) firstAt[s] = d;
  }
  let row = "  " + pad(`${p} (${limit}°)`, 16);
  for (const s of ["cazimi", "heart-of-the-sun", "deep-combustion", "strong-combustion", "moderate-combustion", "mild-combustion", "free"]) {
    const at = firstAt[s];
    row += pad(at == null ? "—" : `${at.toFixed(2)}°`, 10);
  }
  console.log(row);
}

console.log("\n  Read a row left→right as the planet CLIMBS OUT of the Sun: cazimi (the throne) →");
console.log("  the graded combustion tiers → free. The prose speaks the state, never the number.\n");
console.log("  OPEN for David: 'cazimi' and 'heart of the sun' are traditionally the SAME (both the heart).");
console.log("  Here cazimi ≤ 0.28° is the empowered inversion and heart ≤ 1.5° is the deepest immersion —");
console.log("  tell me if you want them merged, or heart-of-the-sun ALSO read as empowered (a wider throne).\n");
