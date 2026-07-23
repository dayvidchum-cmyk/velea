/**
 * FIND-VIVID-COMBUSTION — scans forward from a start date for the dates where a planet is in a
 * DRAMATIC solar relationship (cazimi / the coronation / deep combustion), so a before/after has
 * something loud to show. Noon-UTC sampling. Throwaway tooling for picking demo dates.
 *
 *   npx tsx server/scripts/find-vivid-combustion.ts 2026-07-23 160
 */
import { planetLongitudeSpeed } from "../birthchart/calculator.js";
import { combustion } from "../panchang/affliction.js";

const start = process.argv[2] ?? "2026-07-23";
const days = Number(process.argv[3] ?? 160);
const PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn"];
const VIVID = new Set(["cazimi", "heart-of-the-sun", "deep-combustion"]);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log(`\n  Scanning ${days} days from ${start} for vivid solar relationships (noon UTC)\n`);
  const hits: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const sun = (await planetLongitudeSpeed("sun", date)).longitude;
    for (const p of PLANETS) {
      const { longitude, speed } = await planetLongitudeSpeed(p, date);
      const c = combustion(cap(p), longitude, sun, speed < 0);
      if (c && VIVID.has(c.relationship)) {
        hits.push(`  ${date}  ${cap(p).padEnd(8)} ${c.relationship.padEnd(16)} (${c.orbDeg}° from Sun${speed < 0 ? ", retro" : ""})`);
      }
    }
  }
  if (!hits.length) console.log("  (no cazimi / coronation / deep-combustion days in range — widen the window)");
  else console.log(hits.join("\n"));
  console.log("");
}
main();
