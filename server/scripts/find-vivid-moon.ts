/**
 * FIND-VIVID-MOON — prints the Moon-trigger strength dial (states doctrine #5) across a window, so
 * the wired day read has loud demo dates: new (dark, seeding) vs full (brimming, exposed). Calls the
 * SAME moonBrightness the input-builder calls, on the SAME noon Sun/Moon longitudes, so a value here
 * is exactly what reaches the prompt. Flags the extremes (new / full). Throwaway tooling.
 *
 *   npx tsx server/scripts/find-vivid-moon.ts 2026-07-23 40
 */
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { moonBrightness } from "../panchang/moon-brightness.js";

const start = process.argv[2] ?? "2026-07-23";
const days = Number(process.argv[3] ?? 40);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log(`\n  Moon-trigger strength dial, ${days} days from ${start} (noon UTC)\n`);
  console.log(`  date        phase             illum  pakshaBala  ${""}`);
  let newDay = "", fullDay = "", newMin = 2, fullMax = -1;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const a = await getSiderealLongitudes(new Date(date + "T12:00:00Z"), ["Sun", "Moon"]);
    const mb = moonBrightness(a["Sun"], a["Moon"]);
    if (mb.illumination < newMin) { newMin = mb.illumination; newDay = date; }
    if (mb.illumination > fullMax) { fullMax = mb.illumination; fullDay = date; }
    const star = mb.phase === "new" ? " ← NEW (seed)" : mb.phase === "full" ? " ← FULL (brim)" : "";
    if (i === 0 || mb.phase === "new" || mb.phase === "full" || i % 3 === 0)
      console.log(`  ${date}  ${mb.phase.padEnd(16)}  ${mb.illumination.toFixed(2)}   ${mb.pakshaBala.toFixed(2)}${star}`);
  }
  console.log(`\n  Darkest (seed) in window:   ${newDay}  illum ${newMin.toFixed(2)}`);
  console.log(`  Brightest (brim) in window: ${fullDay}  illum ${fullMax.toFixed(2)}\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
