/**
 * Upcoming eclipses in Velea's own sidereal frame — date, type, and the SIGN + degree the
 * eclipse falls in (solar = Sun/Moon conjunct; lunar = Moon opposite Sun). Grounds the
 * "eclipse window" conversation in real engine data instead of recited ephemeris.
 *
 * Run: npx tsx server/scripts/upcoming-eclipses.ts [YYYY-MM-DD start] [daysAhead]
 */
import { getSiderealLongitudesWithSpeed } from "../vedic/natal-chart-engine.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DAY = 86400000;
const norm = (x: number) => ((x % 360) + 360) % 360;
const diffTo = (x: number, t: number) => { let d = norm(x) - t; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const sep = (a: number, b: number) => { const d = norm(a - b); return Math.min(d, 360 - d); };
const fmtDeg = (lon: number) => { const s = Math.floor(norm(lon) / 30); const d = norm(lon) - s * 30; return `${d.toFixed(1)}° ${ZOD[s]}`; };

async function sample(ms: number) {
  const p = await getSiderealLongitudesWithSpeed(new Date(ms), ["Sun", "Moon", "Rahu"]);
  return { sun: p.Sun?.longitude ?? 0, moon: p.Moon?.longitude ?? 0, rahu: p.Rahu?.longitude ?? 0 };
}
async function bisect(lo: number, hi: number, target: number) {
  let a = lo, b = hi, da = diffTo(norm((await sample(a)).moon - (await sample(a)).sun), target);
  for (let i = 0; i < 20; i++) {
    const mid = (a + b) / 2; const s = await sample(mid);
    const dm = diffTo(norm(s.moon - s.sun), target);
    if (Math.sign(dm) === Math.sign(da)) { a = mid; da = dm; } else b = mid;
  }
  return (a + b) / 2;
}

async function main() {
  const startStr = process.argv[2] || new Date().toISOString().slice(0, 10);
  const daysAhead = Number(process.argv[3] || 500);
  const start = Date.parse(startStr + "T00:00:00Z");

  console.log(`\nUpcoming eclipses (sidereal) from ${startStr}, next ${daysAhead} days:\n`);
  const targets = [{ t: 0, type: "SOLAR", limit: 18 }, { t: 180, type: "LUNAR", limit: 12 }] as const;
  let prevMs = start, prev = await sample(start);
  const found: { date: string; type: string; where: string; nodeDist: number }[] = [];

  for (let off = 2; off <= daysAhead; off += 2) {
    const ms = start + off * DAY;
    const cur = await sample(ms);
    for (const tg of targets) {
      const dPrev = diffTo(norm(prev.moon - prev.sun), tg.t);
      const dCur = diffTo(norm(cur.moon - cur.sun), tg.t);
      if (Math.sign(dPrev) !== Math.sign(dCur) && Math.abs(dPrev) < 90) {
        const exact = await bisect(prevMs, ms, tg.t);
        const at = await sample(exact);
        const nodeDist = Math.min(sep(at.sun, at.rahu), sep(at.sun, at.rahu + 180));
        if (nodeDist <= tg.limit) {
          // solar: Sun & Moon conjunct → the Sun's sign. lunar: the Moon's sign (opposite the Sun).
          const point = tg.type === "SOLAR" ? at.sun : at.moon;
          found.push({ date: new Date(exact).toISOString().slice(0, 10), type: tg.type, where: fmtDeg(point), nodeDist: +nodeDist.toFixed(1) });
        }
      }
    }
    prevMs = ms; prev = cur;
  }

  found.sort((a, b) => a.date.localeCompare(b.date));
  for (const e of found) console.log(`  ${e.date}  ${e.type.padEnd(6)} at ${e.where.padEnd(14)}  (node ${e.nodeDist}°)`);
  console.log("");
}
main().catch((e) => { console.error(e); process.exit(1); });
