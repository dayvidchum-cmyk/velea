/**
 * DAY-MODE MATH SCAN — old rules vs. the agreed changes, on David's chart, for a month.
 *
 * Isolates the BASE MODE (the house → mode step). The nakshatra/tithi qualifiers downstream are
 * unchanged, so this is exactly the surface we're editing. Nothing in production is touched; this
 * computes both models directly so the effect is visible before wiring.
 *
 * Run: npx tsx server/scripts/mode-scan.ts [YYYY-MM]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { computeBhavaCusps, placeInBhava } from "../vedic/bhava-chalit.js";
import { signOf } from "../vedic/ashtakavarga.js";
import { tarabala, chandrabala } from "../panchang/crown.js";

import { NAK27 as NAK } from "@shared/nakshatra-names";
const nakIdx = (name: string) => NAK.findIndex((n) => n.toLowerCase() === String(name).toLowerCase());

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// David's primary chart.
const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };

type Mode = "Action" | "Build" | "Selective" | "Restraint" | "Flex";

// CURRENT production table (interpreter.ts HOUSE_MODE).
const OLD_HOUSE_MODE: Record<number, Mode> = {
  1: "Action", 2: "Flex", 3: "Build", 4: "Restraint", 5: "Selective", 6: "Build",
  7: "Selective", 8: "Restraint", 9: "Flex", 10: "Action", 11: "Action", 12: "Restraint",
};

// AGREED changes: 3rd Build→Selective, 5th Selective→Build, 9th Flex→Action.
const NEW_HOUSE_MODE: Record<number, Mode> = {
  1: "Action", 2: "Flex", 3: "Selective", 4: "Restraint", 5: "Build", 6: "Build",
  7: "Selective", 8: "Restraint", 9: "Action", 10: "Action", 11: "Action", 12: "Restraint",
};

const wholeSignHouse = (refSignIdx: number, lon: number) => ((signOf(lon) - refSignIdx + 12) % 12) + 1;
const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);

// Openness score for combining the two reference lenses. Flex sits mid.
const MODE_SCORE: Record<Mode, number> = { Restraint: 0, Selective: 1, Flex: 1.5, Build: 2, Action: 3 };
const SCORE_MODE = (s: number): Mode => (["Restraint", "Selective", "Build", "Action"] as Mode[])[Math.max(0, Math.min(3, Math.round(s)))];

async function main() {
  const ym = process.argv[2] || "2026-07";
  const [Y, M] = ym.split("-").map(Number);

  const natal: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const ascLon = natal.lagna.longitude as number;
  const mcLon = natal.mc?.longitude ?? null;
  const cusps = computeBhavaCusps(ascLon, mcLon);
  const lagnaSignIdx = signOf(ascLon);
  const natalMoonSignIdx = signOf(natal.moon.longitude);
  const natalMoonNak = nakIdx(natal.moon.nakshatra);

  console.log(`\nMODE SCAN (interaction model) — ${ym}   lagna ${ZOD[lagnaSignIdx]} (chalit ${cusps.method})   natal Moon ${ZOD[natalMoonSignIdx]} / ${natal.moon.nakshatra}\n`);
  console.log("base = blend(lagna-lens, moon-lens);  live sky:  Mercury/Mars rx → ceiling at Build (no new Action);  Moon strong → floor-raise to Build;  Moon weak → drag −1\n");
  console.log(pad("date", 6) + pad("moon", 9) + pad("nak", 13)
    + " | " + pad("lagna", 11) + pad("moon", 11) + pad("blend", 10)
    + " | " + pad("rx", 4) + pad("moonStr", 9)
    + " | " + pad("FINAL", 10) + "OLD");
  console.log("-".repeat(120));

  const daysInMonth = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const tally: Record<string, number> = { Action: 0, Build: 0, Selective: 0, Restraint: 0 };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const day: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
    const moonLon = day.moon.longitude as number;
    const moonSignIdx = signOf(moonLon);

    // OLD (whole-sign lagna + old table) for the before/after column.
    const oldMode = OLD_HOUSE_MODE[wholeSignHouse(lagnaSignIdx, moonLon)];

    // The two lenses, on the NEW table.
    const place = placeInBhava(cusps, moonLon, ascLon);
    const lagnaMode = NEW_HOUSE_MODE[place.bhava];                                 // chalit house from Lagna
    const chandraMode = NEW_HOUSE_MODE[wholeSignHouse(natalMoonSignIdx, moonLon)]; // whole-sign from natal Moon

    // Structural base: blend the two depths of self.
    const blendScore = (MODE_SCORE[lagnaMode] + MODE_SCORE[chandraMode]) / 2;
    const blendMode = SCORE_MODE(blendScore);

    // Live sky.
    // Only the FAST personal movers cap the daily mode — Mercury (messages/commerce/launches) and
    // Mars (drive/initiative). Venus rx is relational-only; Jupiter/Saturn rx are era-length and
    // belong to the story/arc layer, not the daily posture.
    const outwardRx = (!!day.mercury.isRetrograde && "Me") || (!!day.mars.isRetrograde && "Ma") || null;
    const tb = tarabala(natalMoonNak, nakIdx(day.moon.nakshatra));
    const cb = chandrabala(natalMoonSignIdx, moonSignIdx);
    const moonStrong = tb.favorable && cb.favorable;
    // DRAG strength (argv[3]): strict = both bad; med = adverse tara OR weak Chandra; loose = either bad-ish.
    const dragMode = process.argv[3] || "med";
    const moonWeak =
      dragMode === "strict" ? (tb.quality === "bad" && !cb.favorable)
      : dragMode === "loose" ? (tb.quality !== "good" || !cb.favorable)
      : (tb.quality === "bad" || !cb.favorable); // med
    // A strong Moon RESCUES a contained day (floor-raiser, capped at Build) — never manufactures
    // outward Action. A weak Moon drags. An outward rx takes NEW ACTION off the plate but leaves
    // Build/Selective intact (rx is prime container-work time).
    let s = Math.round(blendScore);
    if (moonStrong && s < 2) s = Math.min(2, s + 1);
    else if (moonWeak) s = s - 1;
    if (outwardRx) s = Math.min(s, 2); // ceiling at Build — no new Action under rx
    const finalMode = SCORE_MODE(s);
    tally[finalMode]++;

    const moonStr = moonStrong ? "▲lift" : moonWeak ? "▼drag" : "·";
    console.log(
      pad(date.slice(5), 6) + pad(ZOD[moonSignIdx].slice(0, 8), 9) + pad(String(day.moon.nakshatra).slice(0, 12), 13)
      + " | " + pad(lagnaMode, 11) + pad(chandraMode, 11) + pad(blendMode, 10)
      + " | " + pad(outwardRx || "·", 4) + pad(moonStr, 9)
      + " | " + pad(finalMode, 10) + oldMode
    );
  }

  console.log("-".repeat(120));
  console.log(`FINAL mode distribution: Action ${tally.Action}  Build ${tally.Build}  Selective ${tally.Selective}  Restraint ${tally.Restraint}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
