import "dotenv/config";
import SwissEph from "swisseph-wasm";

async function main() {
  const se = new SwissEph();
  await se.initSwissEph();
  se.set_sid_mode(se.SE_SIDM_LAHIRI, 0, 0);
  const jd = se.julday(1982, 4, 13, 9 + 20/60);

  // Try with SEFLG_SPEED
  const speedFlag = se.SEFLG_SPEED ?? 256;
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL | speedFlag;
  console.log("flags:", flags, "SEFLG_SPEED:", speedFlag);

  const sat = se.calc_ut(jd, se.SE_SATURN, flags);
  const mars = se.calc_ut(jd, se.SE_MARS, flags);
  console.log("Saturn:", JSON.stringify(sat));
  console.log("Mars:  ", JSON.stringify(mars));

  // Also try tropical speed as a sanity check
  const tropFlags = se.SEFLG_SWIEPH | speedFlag;
  const satTrop = se.calc_ut(jd, se.SE_SATURN, tropFlags);
  console.log("Saturn tropical:", JSON.stringify(satTrop));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
