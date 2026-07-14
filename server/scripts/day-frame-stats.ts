/**
 * DAY-FRAME distribution — cold data on the method's BEHAVIOR over a long span (David's chart).
 * Catches degeneracy: does the tilt collapse to one value? does one arena over-fire? is condition
 * stuck? Runs locally (no prod). npx tsx server/scripts/day-frame-stats.ts [days]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { dignityLabel } from "../panchang/dignity.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { dayFrameReading } from "../vedic/day-frame.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULER: Record<string, string> = { Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter" };
const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (l: number) => Math.floor(norm(l) / 30);
const nakIdx = (l: number) => Math.floor(norm(l) / (360 / 27));
const PLANETS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
const tally = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
const pct = (n: number, t: number) => `${((100 * n) / t).toFixed(0)}%`;

async function main() {
  const days = parseInt(process.argv[2] ?? "180", 10);
  const natal: any = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", { lagnaBasis: "ascendant" });
  const lagnaSign = natal.lagna.sign as string, lagIdx = ZOD.indexOf(lagnaSign);
  const ascLon = (natal.lagna.longitude as number | undefined) ?? lagIdx * 30;
  const lonOf = (p: string) => natal[p.toLowerCase()]?.longitude as number | undefined;
  const natalLon: Record<string, number> = {}, natalByPlanet: any = {};
  for (const p of PLANETS) {
    const lon = lonOf(p); if (lon == null) continue;
    natalLon[p] = lon; const s = signIdx(lon);
    natalByPlanet[p] = { sign: ZOD[s], house: ((s - lagIdx + 12) % 12) + 1, dignity: dignityLabel(p, ZOD[s], norm(lon) % 30),
      rulesHouses: [...Array(12)].map((_, i) => i + 1).filter((h) => SIGN_RULER[ZOD[(lagIdx + h - 1) % 12]] === p) };
  }
  const bnk = nakIdx(natal.moon.longitude), nms = signIdx(natal.moon.longitude);

  const tilt: Record<string, number> = {}, cond: Record<string, number> = {}, house: Record<number, number> = {} as any;
  let converge = 0; const cross: Record<string, number> = {};
  const start = Date.parse("2026-07-13T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const dateStr = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const sky: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
    const dt = calculateDashaTimeline("1982-04-13", natal.moon.nakshatra, natal.moon.sign, String(norm(natal.moon.longitude) % 30), dateStr, String(natal.moon.longitude));
    const r = dayFrameReading({ natalLon, ascLon, lagnaSign, natalByPlanet, birthNakIdx: bnk, natalMoonSignIdx: nms,
      dayMoonLon: sky.moon.longitude, dayNakIdx: nakIdx(sky.moon.longitude),
      dasha: { mahaDasha: dt.currentMahadasha ? { lord: dt.currentMahadasha } : null, antarDasha: dt.currentAntardasha ? { lord: dt.currentAntardasha } : null } });
    tally(tilt, r.tilt); tally(cond, r.condition); tally(house as any, String(r.arena.house));
    tally(cross, `${r.tilt}/${r.condition}`); if (r.chapter.converges) converge++;
  }

  console.log(`\nDAY-FRAME DISTRIBUTION · David · ${days} days from 2026-07-13\n${"─".repeat(56)}`);
  const show = (label: string, m: Record<string, number>, order?: string[]) => {
    console.log(label);
    for (const k of order ?? Object.keys(m).sort()) if (m[k]) console.log(`   ${k.padEnd(12)} ${String(m[k]).padStart(3)}  ${pct(m[k], days)}`);
  };
  show("TILT:", tilt, ["supported", "mixed", "strained"]);
  show("CONDITION:", cond, ["supported", "mixed", "unlit", "strained"]);
  console.log("ARENA (house the Moon lit; expect ~even across 1–12):");
  for (let h = 1; h <= 12; h++) console.log(`   house ${String(h).padStart(2)}   ${String((house as any)[h] ?? 0).padStart(3)}  ${pct((house as any)[h] ?? 0, days)}`);
  console.log(`CHAPTER converges: ${converge}/${days}  ${pct(converge, days)}`);
  console.log(`\nHealth check: no tilt should be ~0% or ~100%; arenas should spread ~8% each (Moon walks all 12).`);
  console.log("─".repeat(56) + "\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
