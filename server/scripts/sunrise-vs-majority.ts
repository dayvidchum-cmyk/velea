/**
 * How often does the star at SUNRISE differ from the star holding the MAJORITY of the vedic day?
 * David asked to confirm the "roughly a third of days" figure before ruling on it (2026-07-20).
 * Both values are already computed by calcPanchang, so this compares them rather than re-deriving.
 * Run: npx tsx server/scripts/sunrise-vs-majority.ts
 */
import { calcPanchang } from "../panchang/astronomy.js";

async function main() {
  const lat = 42.36, lon = -71.06, off = -5; // Boston, the reference used by the other scans
  let total = 0, differ = 0;
  for (let d = 0; d < 365; d++) {
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10);
    try {
      const a: any = await calcPanchang(dt, lat, lon, off);
      if (!a?.nakshatra || !a?.nakshatraAtSunrise) continue;
      total++;
      if (a.nakshatra !== a.nakshatraAtSunrise) differ++;
    } catch { /* skip */ }
  }
  const pct = (n: number) => ((n / total) * 100).toFixed(1) + "%";
  console.log(`days measured            : ${total}`);
  console.log(`sunrise star == majority : ${total - differ}  (${pct(total - differ)})`);
  console.log(`sunrise star != majority : ${differ}  (${pct(differ)})   <-- the disagreement rate`);
}
main().catch((e) => { console.error(e); process.exit(1); });
