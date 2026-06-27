import "dotenv/config";
import SwissEph from "swisseph-wasm";

async function main() {
  const se = new SwissEph();
  await se.initSwissEph();
  se.set_sid_mode(se.SE_SIDM_LAHIRI, 0, 0);
  const flags = se.SEFLG_SWIEPH | se.SEFLG_SIDEREAL;

  // David: 1982-04-13 09:20 UTC (17:20 Manila = UTC+8 → 09:20 UTC)
  const jd = se.julday(1982, 4, 13, 9 + 20/60);
  console.log("JD:", jd);

  const sat = se.calc_ut(jd, se.SE_SATURN, flags);
  const mars = se.calc_ut(jd, se.SE_MARS, flags);
  console.log("Saturn full result:", JSON.stringify(sat));
  console.log("Mars full result:  ", JSON.stringify(mars));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
