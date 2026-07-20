/** If the day were NAMED by the sunrise star, how much changes? (David's question, 2026-07-20) */
import { calcPanchang } from "../panchang/astronomy.js";
import { NAKSHATRA_MODIFIERS } from "../panchang/modifier-config.js";

async function main() {
  const lat = 42.36, lon = -71.06, off = -5;
  let total = 0, nameChanged = 0, modifierChanged = 0;
  const deltas: Record<string, number> = {};
  for (let d = 0; d < 365; d++) {
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10);
    try {
      const a: any = await calcPanchang(dt, lat, lon, off);
      if (!a?.nakshatra || !a?.nakshatraAtSunrise) continue;
      total++;
      if (a.nakshatra === a.nakshatraAtSunrise) continue;
      nameChanged++;
      // getNakshatraModifier returns a PROSE object with no score field — my first version read
      // `?? 0` off it and reported 0% change, which was my instrument, not the answer. The SCORE
      // lives in NAKSHATRA_MODIFIERS (modifier-config.ts), the table corrected at v852.
      const mj = NAKSHATRA_MODIFIERS[a.nakshatra]?.score;
      const sn = NAKSHATRA_MODIFIERS[a.nakshatraAtSunrise]?.score;
      if (mj === undefined || sn === undefined) throw new Error('unmapped star: ' + a.nakshatra + ' / ' + a.nakshatraAtSunrise);
      if (mj !== sn) { modifierChanged++; deltas[`${mj} → ${sn}`] = (deltas[`${mj} → ${sn}`] ?? 0) + 1; }
    } catch { /* skip */ }
  }
  const pct = (n: number) => ((n / total) * 100).toFixed(1) + "%";
  console.log(`days measured                 : ${total}`);
  console.log(`the day's NAME would change   : ${nameChanged}  (${pct(nameChanged)})`);
  console.log(`its mode SCORE would change   : ${modifierChanged}  (${pct(modifierChanged)})`);
  console.log(`  by how much:`, JSON.stringify(deltas));
  console.log(`\nname changes but score holds  : ${nameChanged - modifierChanged}  (${pct(nameChanged - modifierChanged)})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
