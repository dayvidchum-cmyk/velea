// Throwaway trace: verify monthSkyMarks (all retrograde planets) against the live ephemeris.
import { monthSkyMarks } from "../sky/current-sky.js";
async function main() {
  for (const ym of ["2026-06", "2026-07", "2026-08", "2026-10", "2026-11"]) {
    const m = await monthSkyMarks(ym);
    console.log("==", ym, "==");
    for (const p of m.retro) {
      const span = (a: string[]) => a.length ? `${a[0]}→${a[a.length - 1]} (${a.length})` : "-";
      console.log(`  ${p.planet.padEnd(8)} rx ${span(p.retroDays).padEnd(26)} stations ${JSON.stringify(p.stations)}`);
      console.log(`  ${" ".padEnd(8)}    window ${JSON.stringify(p.windowDays)}`);
      console.log(`  ${" ".padEnd(8)}    pre ${span(p.preShadowDays).padEnd(24)} post ${span(p.postShadowDays).padEnd(24)} enter ${JSON.stringify(p.shadowEnterDays)} exit ${JSON.stringify(p.shadowExitDays)}`);
    }
    if (m.eclipses.length) console.log("  eclipses:", JSON.stringify(m.eclipses));
  }
}
main();
