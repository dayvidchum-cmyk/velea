/**
 * ACTION-LEVER SCAN — how many Action days each candidate tuning yields, full year.
 *
 * Diagnostic ONLY. Mirrors interpreter.ts's blend+modifier math exactly, then re-runs the SAME
 * days under alternative policies so David can choose a lever with real numbers. Nothing in
 * production is touched.
 *
 * Run: npx tsx server/scripts/action-lever-scan.ts
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { computeBhavaCusps, placeInBhava } from "../vedic/bhava-chalit.js";
import { signOf } from "../vedic/ashtakavarga.js";
import { tarabala, chandrabala } from "../panchang/crown.js";

const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const nakIdx = (name: string) => NAK.findIndex((n) => n.toLowerCase() === String(name).toLowerCase());

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
type Mode = "Action" | "Build" | "Selective" | "Restraint" | "Flex";

// Production HOUSE_MODE (interpreter.ts).
const HOUSE_MODE: Record<number, Mode> = {
  1: "Action", 2: "Flex", 3: "Selective", 4: "Restraint", 5: "Build", 6: "Build",
  7: "Selective", 8: "Restraint", 9: "Action", 10: "Action", 11: "Action", 12: "Restraint",
};
const MODE_SCORE: Record<Mode, number> = { Restraint: 0, Selective: 1, Flex: 1.5, Build: 2, Action: 3 };
const SCORE_MODE = (s: number): Mode => (["Restraint","Selective","Build","Action"] as Mode[])[Math.max(0, Math.min(3, Math.round(s)))];
const wholeSignHouse = (refSignIdx: number, lon: number) => ((signOf(lon) - refSignIdx + 12) % 12) + 1;

// The policies to compare. Each returns the final score from the pieces.
type Ctx = { blendScore: number; moonStrong: boolean; moonWeak: boolean; merRx: boolean; marsRx: boolean };
const POLICIES: Record<string, (c: Ctx) => Mode> = {
  // P0 — exactly production.
  current: (c) => {
    let s = Math.round(c.blendScore);
    if (c.moonStrong && s < 2) s = Math.min(2, s + 1); else if (c.moonWeak) s = s - 1;
    if (c.merRx || c.marsRx) s = Math.min(s, 2);
    return SCORE_MODE(s);
  },
  // P1 — drop the retrograde ceiling entirely.
  noCeiling: (c) => {
    let s = Math.round(c.blendScore);
    if (c.moonStrong && s < 2) s = Math.min(2, s + 1); else if (c.moonWeak) s = s - 1;
    return SCORE_MODE(s);
  },
  // P2 — Mercury-only ceiling (Mars no longer suppresses Action).
  mercuryOnly: (c) => {
    let s = Math.round(c.blendScore);
    if (c.moonStrong && s < 2) s = Math.min(2, s + 1); else if (c.moonWeak) s = s - 1;
    if (c.merRx) s = Math.min(s, 2);
    return SCORE_MODE(s);
  },
  // P3 — keep both rules, but an Action-blend day survives the weak-Moon drag at Build-floor
  //      instead of falling to Selective (drag never pushes an Action base below Build).
  actionBlendFloorBuild: (c) => {
    let s = Math.round(c.blendScore);
    if (c.moonStrong && s < 2) s = Math.min(2, s + 1);
    else if (c.moonWeak) s = Math.round(c.blendScore) >= 3 ? Math.max(2, s - 1) : s - 1;
    if (c.merRx || c.marsRx) s = Math.min(s, 2);
    return SCORE_MODE(s);
  },
  // P4 — ceiling only when the Moon is NOT strong; a genuinely strong Moon on an Action-blend day
  //      keeps Action even under rx (the "the sky still says go" exception).
  ceilingUnlessMoonStrong: (c) => {
    let s = Math.round(c.blendScore);
    if (c.moonStrong && s < 2) s = Math.min(2, s + 1); else if (c.moonWeak) s = s - 1;
    if ((c.merRx || c.marsRx) && !c.moonStrong) s = Math.min(s, 2);
    return SCORE_MODE(s);
  },
};

async function main() {
  const natal: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const ascLon = natal.lagna.longitude as number;
  const cusps = computeBhavaCusps(ascLon, natal.mc?.longitude ?? null);
  const lagnaSignIdx = signOf(ascLon);
  const natalMoonSignIdx = signOf(natal.moon.longitude);
  const natalMoonNak = nakIdx(natal.moon.nakshatra);

  const months: string[] = [];
  for (let i = 0; i < 12; i++) { const mo = 7 + i; const y = 2026 + Math.floor((mo - 1) / 12); const m = ((mo - 1) % 12) + 1; months.push(`${y}-${String(m).padStart(2, "0")}`); }

  const keys = Object.keys(POLICIES);
  const year: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  console.log(`\nACTION-DAY COUNT by policy — David's chart, Jul 2026 → Jun 2027\n`);
  console.log("month     " + keys.map((k) => k.padEnd(24)).join(""));
  console.log("-".repeat(10 + keys.length * 24));

  for (const ym of months) {
    const [Y, M] = ym.split("-").map(Number);
    const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const row: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    for (let d = 1; d <= days; d++) {
      const date = `${ym}-${String(d).padStart(2, "0")}`;
      const day: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
      const moonLon = day.moon.longitude as number;
      const lagnaMode = HOUSE_MODE[placeInBhava(cusps, moonLon, ascLon).bhava];
      const chandraMode = HOUSE_MODE[wholeSignHouse(natalMoonSignIdx, moonLon)];
      const blendScore = (MODE_SCORE[lagnaMode] + MODE_SCORE[chandraMode]) / 2;
      const tb = tarabala(natalMoonNak, nakIdx(day.moon.nakshatra));
      const cb = chandrabala(natalMoonSignIdx, signOf(moonLon));
      const ctx: Ctx = {
        blendScore,
        moonStrong: tb.favorable && cb.favorable,
        moonWeak: tb.quality === "bad" || !cb.favorable,
        merRx: !!day.mercury.isRetrograde,
        marsRx: !!day.mars.isRetrograde,
      };
      for (const k of keys) if (POLICIES[k](ctx) === "Action") { row[k]++; year[k]++; }
    }
    console.log(ym.padEnd(10) + keys.map((k) => String(row[k]).padEnd(24)).join(""));
  }
  console.log("-".repeat(10 + keys.length * 24));
  console.log("YEAR".padEnd(10) + keys.map((k) => String(year[k]).padEnd(24)).join(""));
  console.log();
}
main().catch((e) => { console.error(e); process.exit(1); });
