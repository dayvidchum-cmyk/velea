/**
 * PROOF harness for the karana computation. Run:
 *   npx tsx server/scripts/karana-check.ts
 *
 * Three proofs:
 *  1. Structure — the full 60-karana sequence matches the canonical placement
 *     (Kimstughna @1; 7 chara repeating @2..57; Shakuni/Chatushpada/Naga @58/59/60),
 *     and each chara appears exactly 8×, each fixed exactly 1×.
 *  2. Consistency — for every half-tithi n, karanaN ∈ {2·tithi−1, 2·tithi}. This ties
 *     karana to the already-trusted tithi (same elongation).
 *  3. Reference dates — actual computed karana (from the ephemeris) for a spread of
 *     dates, to eyeball against a trusted panchang (e.g. Drik Panchang).
 */
import "dotenv/config";
import { karanaFromNumber, karanaFromLongitudes, karanaNumber } from "../panchang/karana.js";

let failures = 0;
const assert = (cond: boolean, msg: string) => { if (!cond) { failures++; console.error("  ✗ " + msg); } };

// ── Proof 1: structure ──────────────────────────────────────────────────────
console.log("PROOF 1 — canonical sequence over 60 half-tithis:");
const counts: Record<string, number> = {};
for (let n = 1; n <= 60; n++) counts[karanaFromNumber(n).name] = (counts[karanaFromNumber(n).name] ?? 0) + 1;
assert(karanaFromNumber(1).name === "Kimstughna", "n=1 should be Kimstughna");
assert(karanaFromNumber(2).name === "Bava", "n=2 should be Bava (first chara)");
assert(karanaFromNumber(58).name === "Shakuni", "n=58 should be Shakuni");
assert(karanaFromNumber(59).name === "Chatushpada", "n=59 should be Chatushpada");
assert(karanaFromNumber(60).name === "Naga", "n=60 should be Naga");
for (const c of ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"])
  assert(counts[c] === 8, `${c} should occur 8×, got ${counts[c]}`);
for (const f of ["Kimstughna", "Shakuni", "Chatushpada", "Naga"])
  assert(counts[f] === 1, `${f} should occur 1×, got ${counts[f]}`);
assert(Object.values(counts).reduce((a, b) => a + b, 0) === 60, "total karanas should be 60");
console.log(`  counts: ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join("  ")}`);
console.log(failures === 0 ? "  ✓ structure holds\n" : "");

// ── Proof 2: consistency with tithi across the full month ───────────────────
console.log("PROOF 2 — karanaN ∈ {2·tithi−1, 2·tithi} for all 60 half-tithis:");
let f2 = failures;
for (let elong6 = 0; elong6 < 60; elong6++) {
  const elong = elong6 * 6 + 3;               // mid-point of half-tithi (degrees)
  const kN = karanaNumber(0, elong);          // sun=0, moon=elong
  const tithi = Math.floor(elong / 12) + 1;
  assert(kN === 2 * tithi - 1 || kN === 2 * tithi, `elong ${elong}°: karanaN ${kN} not in {${2 * tithi - 1},${2 * tithi}} for tithi ${tithi}`);
}
console.log(failures === f2 ? "  ✓ consistent with tithi for all 60\n" : "");

// ── Proof 3: real reference dates (noon UTC) for external cross-check ────────
async function proof3() {
  console.log("PROOF 3 — computed karana on reference dates (cross-check vs a trusted panchang):");
  const { calculateBirthChart } = await import("../birthchart/calculator.js");
  const DATES = ["2026-07-03", "2026-07-04", "2026-01-01", "2025-10-21", "2025-03-14"];
  for (const d of DATES) {
    const ch: any = await calculateBirthChart(d, "12:00", 0, 0, "UTC");
    const k = karanaFromLongitudes(ch.sun.longitude, ch.moon.longitude);
    const elong = (((ch.moon.longitude - ch.sun.longitude) % 360) + 360) % 360;
    const tithi = Math.floor(elong / 12) + 1;
    console.log(`  ${d} 12:00 UTC — elong ${elong.toFixed(2)}°  tithi ${tithi}  →  karana #${k.number} ${k.name}${k.altName ? ` (${k.altName})` : ""} [${k.quality}]`);
  }
}

proof3().then(() => {
  console.log(failures === 0 ? "\n✓ ALL PROOFS PASS" : `\n✗ ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
});
