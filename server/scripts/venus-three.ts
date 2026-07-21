/**
 * THE VENUS-YEAR AUDIT — David's discriminability test (2026-07-21).
 *
 * "If all three users have Venus as the Time Lord, the readings should feel like they're living
 * in the same chapter, but not the same story... If the readings all sound interchangeable, the
 * engine isn't using enough of the chart."
 *
 * Three testers hold Venus this year. Two of them (David, Lisa) are BOTH 44, BOTH Virgo lagna,
 * BOTH in a 9th-house Taurus profection — so if anything is interchangeable, it is these two.
 * That makes them the sharpest possible control, not a coincidence to be smoothed over.
 *
 * Run: npx tsx server/scripts/venus-three.ts
 */
import { calculateNatalChart, getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { dashaTree } from "../vedic/dasha-tree.js";
import { computeStage, STAGE_BODIES, type StageInput } from "../sky/stage.js";
import { calculateProfectionYear } from "../profection/calculator.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const VARA = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
const DATE = "2026-07-21";

const PEOPLE = [
  { n: "DAVID", d: "1982-04-13", t: "17:20:00", lat: 14.6781, lon: 120.2660, tz: 8 },   // Morong, Bataan
  // Real birth data, read from the profiles table — NOT assumed. Lisa is West Islip NY, not
  // Boston; the first run of this audit used Boston for her and is superseded by this one.
  { n: "LISA",  d: "1982-02-20", t: "20:39:00", lat: 40.706210, lon: -73.306230, tz: -5 },
  { n: "LANG",  d: "1989-11-18", t: "17:32:00", lat: 42.355508, lon: -71.056536, tz: -5 },
];

const lonOf = (chart: any, p: string): number | null => {
  const x = chart.planets?.[p.toLowerCase()];
  if (!x || typeof x.degree !== "number") return null;
  const si = ZOD.indexOf(x.sign);
  return si < 0 ? null : si * 30 + x.degree;
};

async function main() {
  const bodies = [...STAGE_BODIES, "Moon"];
  const noon = new Date(`${DATE}T12:00:00Z`);
  const next = new Date(noon.getTime() + 86400000);
  const lon = (await getSiderealLongitudes(noon, bodies as any)) as Record<string, number>;
  const lonNext = (await getSiderealLongitudes(next, bodies as any)) as Record<string, number>;
  const retrograde: Record<string, boolean> = {};
  for (const b of bodies) retrograde[b] = b === "Rahu" || b === "Ketu" ? true : (((lonNext[b] - lon[b] + 540) % 360) - 180) < 0;
  const combust: Record<string, boolean> = {};
  for (const b of bodies) if (b !== "Sun" && b !== "Rahu" && b !== "Ketu")
    combust[b] = Math.abs(((lon[b] - lon["Sun"] + 540) % 360) - 180) > 172;
  const nowMs = Date.parse(`${DATE}T12:00:00Z`);

  for (const p of PEOPLE) {
    const chart = await calculateNatalChart(p.d, p.t, p.lat, p.lon, p.tz);
    const lagna = chart.lagna.sign;
    const moonNatal = lonOf(chart, "Moon")!;
    const venusNatal = lonOf(chart, "Venus")!;
    const [y, m, d] = p.d.split("-").map(Number);
    const [hh, mm] = p.t.split(":").map(Number);
    const birthMs = Date.UTC(y, m - 1, d, hh - p.tz, mm);
    const spans = dashaTree(birthMs, moonNatal, 3);
    const cur = spans.filter((s) => s.level === 3 && nowMs >= s.startMs && nowMs < s.endMs)[0]
      ?? spans.filter((s) => nowMs >= s.startMs && nowMs < s.endMs).pop();
    const pf = calculateProfectionYear(p.d, DATE, lagna);
    const lagnaIdx = ZOD.indexOf(lagna);

    const input: StageInput = {
      transitLon: lon, lagnaSignIdx: lagnaIdx, retrograde, combust,
      dasha: { maha: cur?.lords[0], antar: cur?.lords[1], pratyantar: cur?.lords[2] },
      annualTimeLord: pf.timeLord,
      dayLord: VARA[noon.getUTCDay()],
    };
    const s = computeStage(input);

    const vSign = ZOD[Math.floor(venusNatal / 30)];
    const vHouse = ((Math.floor(venusNatal / 30) - lagnaIdx + 12) % 12) + 1;

    console.log(`\n${"=".repeat(76)}\n  ${p.n} — ${lagna} lagna, age ${pf.age}`);
    console.log(`${"=".repeat(76)}`);
    console.log(`  CHAPTER    house ${pf.activatedHouse} (${pf.activatedSign}) · TL ${pf.timeLord}`);
    console.log(`             ${pf.houseThemes}`);
    console.log(`  BOOK       ${cur?.lords.join(" / ") ?? "—"}`);
    console.log(`  NATAL VENUS  ${vSign} · house ${vHouse}   <- NOT YET IN THE CAST SHEET`);
    console.log(`  CAMERA     ${s.camera.location.sign} · house ${s.camera.location.house} · ${s.camera.location.nakshatra}`);
    console.log(`             lights: ${s.camera.illuminates.specifics.slice(0, 8).join(", ")}`);
    console.log(`             in frame: ${s.camera.inFocus.join(", ")}`);
    console.log(`  CAST SHEET state=${s.narrative.narrativeState} chapterLead=${s.narrative.chapterLead} sceneLead=${s.narrative.sceneLead}`);
    console.log(`  TENSION    ${s.tension ? s.tension.name : "none"}`);
    console.log(`  PRIMARY    ${s.characters[0].character} (${s.characters[0].currentRole ?? "—"}) · house ${s.characters[0].location.house} · ${s.characters[0].condition.join(" · ") || "—"}`);
    for (const c of s.characters.slice(1, 4))
      console.log(`  ${c.narrativeWeight.padEnd(10)} ${c.character.padEnd(8)} h${String(c.location.house).padStart(2)} ${c.condition.join(" · ") || "—"}`);
  }
  console.log();
}
main().catch((e) => { console.error(e); process.exit(1); });
