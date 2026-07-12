/**
 * Does the Aug 12 2026 solar eclipse HIT anything in David's natal chart? Degree-level.
 *
 * Finds the exact eclipse longitude (the precise Sun–Moon syzygy near the date, in Velea's sidereal
 * frame), then measures every natal point against BOTH ends of the eclipse line — conjunction (the
 * eclipse degree) and opposition (the anti-node / Ketu end) — since an eclipse activates its whole
 * axis. Sorted tightest first.
 *
 * Run: npx tsx server/scripts/eclipse-natal-hits.ts [YYYY-MM-DD near]
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";
import { computeBhavaCusps, placeInBhava } from "../vedic/bhava-chalit.js";

// Sign rulers — the eclipse's dispositor (whose natal condition the eclipse borrows).
const RULER: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DAY = 86400000;
const norm = (x: number) => ((x % 360) + 360) % 360;
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };
const diff180 = (x: number) => { let d = x; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const fmt = (lon: number) => { const s = Math.floor(norm(lon) / 30); return `${(norm(lon) - s * 30).toFixed(2)}° ${ZOD[s]}`; };

async function elong(ms: number) {
  const p = await getSiderealLongitudesWithSpeed(new Date(ms), ["Sun", "Moon", "Rahu"]);
  return { sun: p.Sun?.longitude ?? 0, moon: p.Moon?.longitude ?? 0, rahu: p.Rahu?.longitude ?? 0 };
}

async function main() {
  const near = process.argv[2] || "2026-08-12";
  const type = (process.argv[3] || "solar").toLowerCase(); // solar (new moon) | lunar (full moon)
  const target = type === "lunar" ? 180 : 0; // Moon−Sun elongation at the eclipse
  const start = Date.parse(near + "T00:00:00Z") - 4 * DAY;
  const syz = (e: { moon: number; sun: number }) => diff180(norm(e.moon - e.sun) - target);

  // Bracket the exact syzygy (elongation crosses `target`) within ±4 days, then bisect.
  let a = start, b = start;
  let prev = syz(await elong(start));
  for (let off = 0.25; off <= 8; off += 0.25) {
    const ms = start + off * DAY;
    const cur = syz(await elong(ms));
    if (Math.sign(cur) !== Math.sign(prev) && Math.abs(prev) < 90) { a = start + (off - 0.25) * DAY; b = ms; break; }
    prev = cur;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (a + b) / 2;
    if (Math.sign(syz(await elong(mid))) === Math.sign(syz(await elong(a)))) a = mid; else b = mid;
  }
  const t = (a + b) / 2;
  const at = await elong(t);
  // The eclipse POINT: solar = Sun≈Moon; lunar = the Moon (opposite the Sun).
  const eclLon = type === "lunar" ? at.moon : at.sun;
  const nodeDist = Math.min(sep(at.sun, at.rahu), sep(at.sun, at.rahu + 180));

  console.log(`\n${type.toUpperCase()} eclipse near ${near} — exact: ${new Date(t).toISOString().replace("T", " ").slice(0, 16)} UTC`);
  console.log(`  eclipse point  ${fmt(eclLon)}  (sidereal ${norm(eclLon).toFixed(2)}°)   opposition ${fmt(eclLon + 180)}`);
  console.log(`  from Rahu/Ketu axis: ${nodeDist.toFixed(2)}°  (a ${nodeDist < 5 ? "central, deep" : nodeDist < 12 ? "solid" : "shallow"} eclipse)\n`);

  // Natal chart — every point, sidereal longitude.
  const n: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const pts: { name: string; lon: number }[] = [
    ["Sun","sun"],["Moon","moon"],["Mars","mars"],["Mercury","mercury"],["Jupiter","jupiter"],
    ["Venus","venus"],["Saturn","saturn"],["Rahu","rahu"],["Ketu","ketu"],
  ].map(([name, k]) => ({ name, lon: n[k].longitude as number }));
  // The four angles — as a chart's most sensitive points, ALL of them, both ends of each axis.
  pts.push({ name: "Asc (Lagna)", lon: n.lagna.longitude });
  pts.push({ name: "Dsc", lon: norm(n.lagna.longitude + 180) });
  if (n.mc) { pts.push({ name: "MC", lon: n.mc.longitude }); pts.push({ name: "IC", lon: norm(n.mc.longitude + 180) }); }

  const lagnaIdx = Math.floor(norm(n.lagna.longitude) / 30);
  const houseOf = (lon: number) => ((Math.floor(norm(lon) / 30) - lagnaIdx + 12) % 12) + 1;
  const moonIdx = Math.floor(norm(n.moon.longitude) / 30);
  const houseFromMoon = (lon: number) => ((Math.floor(norm(lon) / 30) - moonIdx + 12) % 12) + 1;

  // Chalit — the eclipse's TRUE house by cusp, not just its sign.
  const cusps = computeBhavaCusps(n.lagna.longitude, n.mc?.longitude ?? null);
  const place = placeInBhava(cusps, eclLon, n.lagna.longitude);
  const eclSign = ZOD[Math.floor(norm(eclLon) / 30)];
  const disp = RULER[eclSign];
  const dispLon = (n as any)[disp.toLowerCase()].longitude as number;

  console.log(`house of the eclipse:  whole-sign ${houseOf(eclLon)}th  ·  chalit ${place.bhava}th${place.shifted ? " (SHIFTED off whole-sign)" : ""}  ·  ${houseFromMoon(eclLon)}th from your natal Moon`);
  console.log(`dispositor: ${eclSign} is ruled by ${disp} — your natal ${disp} sits at ${fmt(dispLon)}, your ${houseOf(dispLon)}th house (the eclipse borrows its condition)\n`);
  console.log("natal point   position          conj orb   opp orb    tightest");
  console.log("-".repeat(70));
  const rows = pts.map((p) => {
    const conj = sep(p.lon, eclLon);
    const opp = sep(p.lon, norm(eclLon + 180));
    return { ...p, conj, opp, tight: Math.min(conj, opp), which: conj <= opp ? "conj" : "opp" };
  }).sort((x, y) => x.tight - y.tight);

  for (const r of rows) {
    const flag = r.tight <= 3 ? "  ◄ TIGHT HIT" : r.tight <= 8 ? "  ◄ in orb" : "";
    console.log(`${r.name.padEnd(13)} ${fmt(r.lon).padEnd(16)}  ${r.conj.toFixed(1).padStart(5)}°   ${r.opp.toFixed(1).padStart(5)}°    ${(r.tight.toFixed(1) + "° " + r.which).padEnd(10)}${flag}`);
  }
  console.log("");
}
main().catch((e) => { console.error(e); process.exit(1); });
