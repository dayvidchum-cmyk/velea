/**
 * DAY-FRAME dispatcher — PROTOTYPE ("try it").
 *
 * The day read produced by the TRIED-AND-TRUE method, deterministically, with NO LLM:
 *   time frame = day  →  the system is the Moon (Tārabala + Chandrabala), grain = today's Moon.
 *   matter     = whatever house the day-Moon lights  →  its chart + karaka (Appendix IV routing).
 *   reading    = tilt (disposition to the native) · arena (the lit matter) · condition (its lord/
 *                karaka by live dignity) · chapter (does the running dasha converge on this arena?).
 *
 * This is the STRUCTURED READING the LLM would only VOICE — no synthesis handed to the model.
 * Run on David's real chart (the crown.test chart), real ephemeris, a real date.
 *   npx tsx server/scripts/day-frame-tryit.ts [YYYY-MM-DD]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { dignityLabel } from "../panchang/dignity.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { dayFrameReading } from "../vedic/day-frame.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULER: Record<string, string> = { Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter" };

const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);
const nakIdx  = (lon: number) => Math.floor(norm(lon) / (360 / 27));
const ord = (n: number) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

async function run(dateStr: string) {
  // ── Natal (David's real chart) → the inputs the real dispatcher wants ──
  const natal: any = await calculateBirthChart("1982-04-13", "17:20", 14.6, 120.6, "Asia/Manila", { lagnaBasis: "ascendant" });
  const lagnaSign = natal.lagna.sign as string;
  const lagIdx = ZOD.indexOf(lagnaSign);
  const ascLon = (natal.lagna.longitude as number | undefined) ?? lagIdx * 30;
  const lonOf = (p: string) => natal[p.toLowerCase()]?.longitude as number | undefined;

  const natalLon: Record<string, number> = {};
  const natalByPlanet: Record<string, { sign: string; house: number | null; dignity: string; rulesHouses: number[] }> = {};
  for (const p of PLANETS) {
    const lon = lonOf(p); if (lon == null) continue;
    natalLon[p] = lon;
    const sIdx = signIdx(lon), sign = ZOD[sIdx];
    natalByPlanet[p] = {
      sign, house: ((sIdx - lagIdx + 12) % 12) + 1,
      dignity: dignityLabel(p, sign, norm(lon) % 30),
      rulesHouses: [...Array(12)].map((_, i) => i + 1).filter((h) => SIGN_RULER[ZOD[(lagIdx + h - 1) % 12]] === p),
    };
  }

  // ── Today's sky (noon UTC) + the running dasha ──
  const day: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
  const dt = calculateDashaTimeline("1982-04-13", natal.moon.nakshatra, natal.moon.sign,
    String(norm(natal.moon.longitude) % 30), dateStr, String(natal.moon.longitude));
  const dasha = { mahaDasha: dt.currentMahadasha ? { lord: dt.currentMahadasha } : null, antarDasha: dt.currentAntardasha ? { lord: dt.currentAntardasha } : null };

  // ── THE READING (the real dispatcher) ──
  const r = dayFrameReading({
    natalLon, ascLon, lagnaSign, natalByPlanet,
    birthNakIdx: nakIdx(natal.moon.longitude),
    natalMoonSignIdx: signIdx(natal.moon.longitude),
    dayMoonLon: day.moon.longitude,
    dayNakIdx: nakIdx(day.moon.longitude), // noon Moon (majority-day-star TODO)
    dasha,
  });

  const line = "─".repeat(80);
  console.log(`\n${line}\nDAY READING — deterministic, from the Moon (no LLM)   ·   ${dateStr}\n${line}`);
  console.log(`  chart:     David · ${lagnaSign} lagna · natal Moon ${natal.moon.sign} (${natal.moon.nakshatra}) · dasha ${dt.currentMahadasha}–${dt.currentAntardasha}`);
  console.log(`  timeFrame: ${r.timeFrame}   grain: ${r.grain}`);
  console.log(`  ├─ tilt:      ${r.tilt.toUpperCase()}`);
  console.log(`  ├─ arena:     ${r.arena.area}`);
  console.log(`  │             ← the Moon transits your ${r.arena.house}${ord(r.arena.house)} house today · read in ${r.arena.varga}`);
  console.log(`  ├─ condition: ${r.condition.toUpperCase()}`);
  for (const d of r.conditionDetail) console.log(`  │             · ${d}`);
  console.log(`  ├─ chapter:   ${r.chapter.converges ? "converges — " + r.chapter.via.join("; ") : "stands apart from the running chapter"}`);
  console.log(`  └─ timing:    ${r.timing}`);
  console.log(`\n  EVIDENCE (for the model's honesty, never recited):`);
  for (const e of r.evidence) console.log(`     ${e}`);
  console.log(line + "\n");
}

const dateStr = process.argv[2] ?? "2026-07-13";
run(dateStr).catch((e) => { console.error(e); process.exit(1); });
