/**
 * Does the Time Lord calculator emit a RETROGRADE segment for Venus this fall?
 * David reports the ribbon says "Direct" during Venus Rx (fall 2026). This runs the
 * exact production calculator for a Venus Time Lord year spanning the fall and prints
 * every segment with its stored isRetrograde — so we know if the bug is the calculator
 * or stale stored rows. Run:  npx tsx server/scripts/venus-rx-check.ts
 */
import { calculateTimeLordTransits } from "../profection/transit-calculator.js";

async function main() {
  // A full year window that brackets fall 2026. Lagna is irrelevant to sign/retrograde
  // (only the house column depends on it), so any lagna exercises the Rx segmentation.
  const timeline = await calculateTimeLordTransits("Venus", "2026-06-01", "2027-05-31", 0, "UTC", "Virgo");
  console.log(`Venus segments: ${timeline.transits.length}`);
  for (const t of timeline.transits) {
    console.log(
      `${t.startDate} → ${t.endDate}  ${t.sign.padEnd(11)} ${t.isRetrograde ? "℞ RETROGRADE" : "  direct"}`,
    );
  }
  const rx = timeline.transits.filter((t) => t.isRetrograde);
  console.log(`\nRetrograde segments found: ${rx.length}`);
  rx.forEach((t) => console.log(`  ${t.startDate} → ${t.endDate} in ${t.sign}`));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
