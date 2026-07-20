/** How many days does the cited-canon correction touch? (David's ruling, 2026-07-20) */
import { calcPanchang } from "../panchang/astronomy.js";
const CHANGED = new Set(["Magha", "Purva Phalguni", "Purva Ashadha", "Vishakha"]);
async function main() {
  const lat = 42.36, lon = -71.06, off = -5;
  let total = 0; const hits: Record<string, number> = {};
  for (let d = 0; d < 365; d++) {
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10);
    try {
      const a: any = await calcPanchang(dt, lat, lon, off);
      if (!a?.nakshatra) continue;
      total++;
      if (CHANGED.has(a.nakshatra)) hits[a.nakshatra] = (hits[a.nakshatra] ?? 0) + 1;
    } catch {}
  }
  const n = Object.values(hits).reduce((a, b) => a + b, 0);
  console.log(`days measured: ${total}`);
  console.log(`days whose ruling star is one of the four: ${n} (${((n / total) * 100).toFixed(1)}%)`);
  for (const [k, v] of Object.entries(hits).sort()) console.log(`  ${k.padEnd(17)} ${v}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
