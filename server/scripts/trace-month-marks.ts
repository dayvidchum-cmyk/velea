// Throwaway trace: verify monthSkyMarks against the live ephemeris.
import { monthSkyMarks } from "../sky/current-sky.js";
async function main() {
  for (const ym of ["2026-06", "2026-07", "2026-08"]) {
    const m = await monthSkyMarks(ym);
    console.log("==", ym, "==");
    console.log("  stations:", JSON.stringify(m.mercury.stations));
    console.log("  rx:", m.mercury.retroDays.length, "days", m.mercury.retroDays[0] ?? "-", "→", m.mercury.retroDays.at(-1) ?? "-");
    console.log("  windows:", JSON.stringify(m.mercury.windowDays));
    console.log("  preShadow:", m.mercury.preShadowDays.length, "days", m.mercury.preShadowDays[0] ?? "-", "→", m.mercury.preShadowDays.at(-1) ?? "-");
    console.log("  postShadow:", m.mercury.postShadowDays.length, "days", m.mercury.postShadowDays[0] ?? "-", "→", m.mercury.postShadowDays.at(-1) ?? "-");
    console.log("  eclipses:", JSON.stringify(m.eclipses));
  }
}
main();
