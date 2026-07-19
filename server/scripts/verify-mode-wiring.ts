import { resolveDaySky } from "../panchang/resolve-day-sky.js";
/**
 * Verify the WIRED path (crown.personalDayForDate → interpreter.interactionBaseMode) reproduces the
 * calibrated scan exactly for David's chart. If these agree, the day card + calendar are correct.
 *
 * Run: npx tsx server/scripts/verify-mode-wiring.ts
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { personalDayForDate, anchorsFromBodies } from "../panchang/crown.js";

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };

// Ground truth from mode-scan.ts (July 2026, med drag) — the calibration David validated.
const EXPECTED: Record<string, string> = {
  "07-01": "Build", "07-02": "Selective", "07-03": "Build", "07-04": "Restraint", "07-05": "Restraint",
  "07-06": "Selective", "07-07": "Selective", "07-08": "Build", "07-09": "Selective", "07-10": "Build",
  "07-11": "Build", "07-12": "Build", "07-13": "Selective", "07-14": "Selective", "07-15": "Build",
  "07-16": "Build", "07-17": "Build", "07-18": "Build", "07-19": "Build", "07-20": "Build",
  "07-21": "Restraint", "07-22": "Restraint", "07-23": "Restraint", "07-24": "Build", "07-25": "Build",
  "07-26": "Restraint", "07-27": "Restraint", "07-28": "Restraint", "07-29": "Selective", "07-30": "Selective", "07-31": "Restraint",
};

async function main() {
  const natal: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const bodies = ["sun","moon","mars","mercury","jupiter","venus","saturn","rahu","ketu"].map((k) => ({
    planet: k[0].toUpperCase() + k.slice(1), sign: natal[k].sign as string, nakshatra: natal[k].nakshatra as string,
  }));
  const anchors = anchorsFromBodies(bodies as any, natal.lagna.sign);
  if (!anchors) throw new Error("anchors null");

  let pass = 0, fail = 0;
  for (let d = 1; d <= 31; d++) {
    const date = `2026-07-${String(d).padStart(2, "0")}`;
    const pd = await personalDayForDate(anchors, date, await resolveDaySky({ dateStr: date }));
    const got = pd?.mode ?? "(null)";
    const want = EXPECTED[date.slice(5)];
    const ok = got === want;
    if (ok) pass++; else { fail++; console.log(`  MISMATCH ${date}: wired=${got}  expected=${want}`); }
  }
  console.log(`\nwired path vs. calibrated scan: ${pass}/31 match${fail ? `  (${fail} MISMATCH)` : "  ✓ ALL MATCH"}\n`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
