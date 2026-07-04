/**
 * PROOF harness for the hora computation. Run:
 *   npx tsx server/scripts/hora-check.ts
 *
 * Proofs:
 *  1. First hora = weekday lord, for all 7 weekdays.
 *  2. Weekday continuity — the hora AFTER the 24th (i.e. next sunrise's first) is
 *     the next weekday's lord (24 ≡ 3 mod 7 reproduces Sun→Mon→Tue…).
 *  3. Chaldean order — each hora's lord follows Saturn→Jupiter→Mars→Sun→Venus→Mercury→Moon.
 *  4. Tiling — 24 contiguous horas, no gaps/overlaps, covering sunrise→next sunrise;
 *     12 day + 12 night.
 *  5. Reference — Boston, Jul 2 2026 (Thursday; yama-validated sunrise 5:11 / sunset 8:24):
 *     first hora must be Jupiter; print the daytime timeline in local time.
 */
import { computeHoras, horaAt, CHALDEAN, WEEKDAY_LORD, type Planet } from "../panchang/hora.js";

let failures = 0;
const assert = (cond: boolean, msg: string) => { if (!cond) { failures++; console.error("  ✗ " + msg); } };

const BOSTON = { lat: 42.3601, lon: -71.0589 };
const TZ_OFFSET_H = -4; // Boston is UTC-4 in July (EDT); for display only

// ── Proof 1 + 2: weekday lord + continuity, across a full week ──────────────
console.log("PROOF 1+2 — first hora = weekday lord, and continuity to the next day:");
// A known anchor: 2026-07-02 is a Thursday. Walk 8 consecutive days.
const startY = 2026, startM = 7, startD = 2;
const EXPECT_FIRST: Planet[] = ["Jupiter", "Venus", "Saturn", "Sun", "Moon", "Mars", "Mercury", "Jupiter"]; // Thu,Fri,Sat,Sun,Mon,Tue,Wed,Thu
for (let i = 0; i < 8; i++) {
  const dt = new Date(Date.UTC(startY, startM - 1, startD + i));
  const horas = computeHoras(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), BOSTON.lat, BOSTON.lon);
  const first = horas[0].lord;
  const wd = dt.getUTCDay();
  assert(first === WEEKDAY_LORD[wd], `${dt.toISOString().slice(0,10)}: first hora ${first} ≠ weekday lord ${WEEKDAY_LORD[wd]}`);
  assert(first === EXPECT_FIRST[i], `${dt.toISOString().slice(0,10)}: first hora ${first} ≠ expected ${EXPECT_FIRST[i]}`);
}
console.log(`  first-hora lords over Thu→Thu: ${EXPECT_FIRST.join(" → ")}`);

// ── Proof 3: Chaldean order within the day ──────────────────────────────────
console.log("PROOF 3 — Chaldean order within a day:");
const h = computeHoras(2026, 7, 2, BOSTON.lat, BOSTON.lon);
for (let k = 1; k < 24; k++) {
  const prev = CHALDEAN.indexOf(h[k - 1].lord);
  assert(h[k].lord === CHALDEAN[(prev + 1) % 7], `hora ${k}: ${h[k].lord} does not follow ${h[k-1].lord} in Chaldean order`);
}

// ── Proof 4: tiling ─────────────────────────────────────────────────────────
console.log("PROOF 4 — 24 horas tile sunrise→next sunrise, contiguous:");
assert(h.length === 24, `expected 24 horas, got ${h.length}`);
assert(h.filter((x) => x.phase === "day").length === 12, "expected 12 day horas");
assert(h.filter((x) => x.phase === "night").length === 12, "expected 12 night horas");
for (let k = 1; k < 24; k++) assert(Math.abs(h[k].startMs - h[k - 1].endMs) < 1, `gap/overlap between hora ${k-1} and ${k}`);

// ── Proof 5: reference timeline ─────────────────────────────────────────────
const fmt = (ms: number) => {
  const d = new Date(ms + TZ_OFFSET_H * 3600000);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
};
console.log("\nPROOF 5 — Boston, Thu 2026-07-02 (local time; sunrise should be ~05:11):");
console.log(`  sunrise (hora 0 start) = ${fmt(h[0].startMs)}  ·  first lord = ${h[0].lord} ${h[0].lord === "Jupiter" ? "✓ (Thursday)" : "✗"}`);
console.log(`  sunset  (hora 12 start) = ${fmt(h[12].startMs)}`);
console.log("  daytime horas:");
for (let k = 0; k < 12; k++) console.log(`    ${String(k).padStart(2)} ${fmt(h[k].startMs)}–${fmt(h[k].endMs)}  ${h[k].lord} [${h[k].tone}]`);

console.log(failures === 0 ? "\n✓ ALL PROOFS PASS" : `\n✗ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
