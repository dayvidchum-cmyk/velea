/**
 * DAY-FRAME spread — one line per day, David's real chart, so the method can be checked against a
 * lived week. Run: npx tsx server/scripts/day-frame-spread.ts [startYYYY-MM-DD] [days]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { dignityLabel } from "../panchang/dignity.js";
import { calculateDashaTimeline } from "../dasha-calculator.js";
import { dayFrameReading } from "../vedic/day-frame.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_RULER: Record<string, string> = { Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter" };
const norm = (x: number) => ((x % 360) + 360) % 360;
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);
const nakIdx = (lon: number) => Math.floor(norm(lon) / (360 / 27));
const PLANETS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));

async function main() {
  const start = process.argv[2] ?? "2026-07-08";
  const days = parseInt(process.argv[3] ?? "10", 10);

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
    natalByPlanet[p] = { sign, house: ((sIdx - lagIdx + 12) % 12) + 1, dignity: dignityLabel(p, sign, norm(lon) % 30),
      rulesHouses: [...Array(12)].map((_, i) => i + 1).filter((h) => SIGN_RULER[ZOD[(lagIdx + h - 1) % 12]] === p) };
  }

  console.log(`\nDAY-FRAME SPREAD · David · ${lagnaSign} lagna · natal Moon ${natal.moon.sign} (${natal.moon.nakshatra})`);
  console.log("─".repeat(96));
  console.log(`${pad("date", 12)}${pad("tilt", 10)}${pad("arena (what the Moon lights)", 34)}${pad("condition", 11)}chapter`);
  console.log("─".repeat(96));
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.parse(start + "T00:00:00Z") + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const sky: any = await calculateBirthChart(dateStr, "12:00", 0, 0, "UTC");
    const dt = calculateDashaTimeline("1982-04-13", natal.moon.nakshatra, natal.moon.sign, String(norm(natal.moon.longitude) % 30), dateStr, String(natal.moon.longitude));
    const dasha = { mahaDasha: dt.currentMahadasha ? { lord: dt.currentMahadasha } : null, antarDasha: dt.currentAntardasha ? { lord: dt.currentAntardasha } : null };
    const r = dayFrameReading({ natalLon, ascLon, lagnaSign, natalByPlanet,
      birthNakIdx: nakIdx(natal.moon.longitude), natalMoonSignIdx: signIdx(natal.moon.longitude),
      dayMoonLon: sky.moon.longitude, dayNakIdx: nakIdx(sky.moon.longitude), dasha });
    const arenaShort = r.arena.area.split(",")[0].split("&")[0].trim();
    const chapter = r.chapter.converges ? r.chapter.via[0]?.split("—")[0].trim() : "—";
    const mark = dateStr === "2026-07-13" ? " ← today" : "";
    console.log(`${pad(dateStr, 12)}${pad(r.tilt, 10)}${pad(arenaShort + " (" + r.arena.varga + ")", 34)}${pad(r.condition, 11)}${chapter}${mark}`);
  }
  console.log("─".repeat(96) + "\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
