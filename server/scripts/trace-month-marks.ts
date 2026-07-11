// Throwaway trace: verify monthSkyMarks against the live ephemeris.
import { monthSkyMarks } from "../sky/current-sky.js";
async function main() {
  for (const ym of ["2026-07", "2026-08"]) {
    const m = await monthSkyMarks(ym);
    console.log(ym, "stations:", JSON.stringify(m.mercury.stations));
    console.log(ym, "rx:", m.mercury.retroDays.length, "days", m.mercury.retroDays[0] ?? "-", "→", m.mercury.retroDays.at(-1) ?? "-");
    console.log(ym, "windows:", JSON.stringify(m.mercury.windowDays));
    console.log(ym, "eclipses:", JSON.stringify(m.eclipses));
  }
}
main();
