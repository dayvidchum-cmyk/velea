/**
 * RX-STRENGTH-BY-DAY SCAN — models retrograde as a daily strength (0..1) instead of a flat on/off
 * ceiling. Strength = how deep the planet sits inside its own retrograde SHADOW BAND [lonD, lonR]:
 *   0 at the pre-shadow edge  →  ramps up  →  1.0 across the actual retrograde  →  ramps down  →  0
 *   at the post-shadow (retroshade) edge. Parameter-free: strength is literally fractional depth.
 *
 * Then it caps Action by strength instead of all-or-nothing:
 *   strength ≥ HARD   → ceiling at Build (no Action)          — the core + station zone
 *   MID ≤ s < HARD    → Action only if the Moon is strong     — the ramp zones
 *   strength < MID    → no cap                                — the shadow fringes
 *
 * Diagnostic ONLY — proves the shape before anything is wired. Nothing in production is touched.
 * Run: npx tsx server/scripts/rx-strength-scan.ts
 */
import { calculateBirthChart } from "../birthchart/calculator.js";
import { computeBhavaCusps, placeInBhava } from "../vedic/bhava-chalit.js";
import { signOf } from "../vedic/ashtakavarga.js";
import { tarabala, chandrabala } from "../panchang/crown.js";

const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const nakIdx = (name: string) => NAK.findIndex((n) => n.toLowerCase() === String(name).toLowerCase());
const BIRTH = { date: "1982-04-13", time: "17:20", lat: 14.6, lon: 120.6, tz: "Asia/Manila" };
type Mode = "Action" | "Build" | "Selective" | "Restraint" | "Flex";
const HOUSE_MODE: Record<number, Mode> = { 1:"Action",2:"Flex",3:"Selective",4:"Restraint",5:"Build",6:"Build",7:"Selective",8:"Restraint",9:"Action",10:"Action",11:"Action",12:"Restraint" };
const MODE_SCORE: Record<Mode, number> = { Restraint:0, Selective:1, Flex:1.5, Build:2, Action:3 };
const SCORE_MODE = (s: number): Mode => (["Restraint","Selective","Build","Action"] as Mode[])[Math.max(0, Math.min(3, Math.round(s)))];
const wholeSignHouse = (refSignIdx: number, lon: number) => ((signOf(lon) - refSignIdx + 12) % 12) + 1;

const HARD = 0.6, MID = 0.3; // tunables — the two thresholds David can dial

function addDays(iso: string, n: number): string {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
}

async function series(planet: "mercury"|"mars", start: string, days: number) {
  const out: { date: string; lon: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const day: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
    out.push({ date, lon: day[planet].longitude });
  }
  // Unwrap to a continuous cumulative longitude (retrograde daily steps are small, well under 180°).
  let off = 0; const cum: number[] = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0) { const diff = out[i].lon - out[i-1].lon; if (diff < -180) off += 360; else if (diff > 180) off -= 360; }
    cum.push(out[i].lon + off);
  }
  return { dates: out.map(o=>o.date), cum };
}

// strength(date) 0..1 across all retrograde episodes of both planets → take the max.
function buildStrength(dates: string[], cum: number[]): Map<string, number> {
  const speed = cum.map((v,i) => i===0?0:v-cum[i-1]);
  const strength = new Map<string, number>(dates.map(d=>[d,0]));
  for (let i = 1; i < speed.length; i++) {
    if (speed[i-1] >= 0 && speed[i] < 0) {                 // station retrograde at i
      const stationR = i, lonR = cum[i];
      let stationD = -1; for (let j=i+1; j<speed.length; j++) { if (speed[j-1] < 0 && speed[j] >= 0) { stationD = j; break; } }
      if (stationD < 0) continue;
      const lonD = cum[stationD];
      let preStart = stationR; while (preStart > 0 && cum[preStart-1] >= lonD) preStart--;
      let postEnd = stationD; while (postEnd < cum.length-1 && cum[postEnd+1] <= lonR) postEnd++;
      const band = lonR - lonD || 1;
      for (let k = preStart; k <= postEnd; k++) {
        let s: number;
        if (k >= stationR && k <= stationD) s = 1;
        else if (k < stationR) s = (cum[k]-lonD)/band;
        else s = (lonR-cum[k])/band;
        strength.set(dates[k], Math.max(strength.get(dates[k]) ?? 0, Math.max(0, Math.min(1, s))));
      }
    }
  }
  return strength;
}

async function main() {
  const natal: any = await calculateBirthChart(BIRTH.date, BIRTH.time, BIRTH.lat, BIRTH.lon, BIRTH.tz, { lagnaBasis: "ascendant" });
  const ascLon = natal.lagna.longitude as number;
  const cusps = computeBhavaCusps(ascLon, natal.mc?.longitude ?? null);
  const natalMoonSignIdx = signOf(natal.moon.longitude);
  const natalMoonNak = nakIdx(natal.moon.nakshatra);

  const START = "2026-06-01", SPAN = 430; // wide enough to catch shadow edges around the year
  const me = await series("mercury", START, SPAN);
  const ma = await series("mars", START, SPAN);
  const sMe = buildStrength(me.dates, me.cum);
  const sMa = buildStrength(ma.dates, ma.cum);
  const rxStrength = (date: string) => Math.max(sMe.get(date) ?? 0, sMa.get(date) ?? 0);

  // 1) Show Mercury's live retrograde episode day-by-day (the one covering mid-2026).
  console.log(`\nMERCURY retrograde shadow — daily strength (bar = strength; the ramp is the pre-shadow / retroshade)\n`);
  const bar = (s: number) => "█".repeat(Math.round(s*20)).padEnd(20);
  for (let i = 0; i < me.dates.length; i++) {
    const d = me.dates[i]; const s = sMe.get(d) ?? 0;
    if (s > 0 && d >= "2026-06-15" && d <= "2026-08-15") {
      const speed = i>0 ? me.cum[i]-me.cum[i-1] : 0;
      const phase = s >= 0.999 ? (speed<0?"RETROGRADE":"station") : (speed<0?"":"shadow");
      console.log(`  ${d}  ${bar(s)} ${s.toFixed(2)}  ${phase}`);
    }
  }

  // 2) OPTION B (David): only TRUE Mercury retrograde caps (Mars dropped; shadow → prose only). A
  //    strong Moon punches through the retrograde EXCEPT the station CORE (planet near-stationary,
  //    classically the most intense). Station core detected by |speed| near 0.
  const meSpeed = new Map<string, number>();
  for (let i = 0; i < me.dates.length; i++) meSpeed.set(me.dates[i], i>0 ? me.cum[i]-me.cum[i-1] : 0);
  const STATION_EPS = 0.15; // deg/day — within this of stationary = the core (no Moon punch)
  const merStrength = (date: string) => sMe.get(date) ?? 0;
  const months: string[] = [];
  for (let i=0;i<12;i++){ const mo=7+i; const y=2026+Math.floor((mo-1)/12); const m=((mo-1)%12)+1; months.push(`${y}-${String(m).padStart(2,"0")}`); }
  console.log(`\nACTION-DAY COUNT — current (flat Me+Ma) vs OPTION B (true Me rx only, Mars dropped, Moon punches non-core)\n`);
  console.log("month     current(flat)           option-B                   recovered days");
  console.log("-".repeat(90));
  let yF=0, yS=0;
  for (const ym of months) {
    const [Y,M] = ym.split("-").map(Number); const dim = new Date(Date.UTC(Y,M,0)).getUTCDate();
    let mF=0, mS=0; const recovered: string[] = [];
    for (let d=1; d<=dim; d++) {
      const date = `${ym}-${String(d).padStart(2,"0")}`;
      const day: any = await calculateBirthChart(date, "12:00", 0, 0, "UTC");
      const moonLon = day.moon.longitude as number;
      const blendScore = (MODE_SCORE[HOUSE_MODE[placeInBhava(cusps,moonLon,ascLon).bhava]] + MODE_SCORE[HOUSE_MODE[wholeSignHouse(natalMoonSignIdx,moonLon)]]) / 2;
      const tb = tarabala(natalMoonNak, nakIdx(day.moon.nakshatra));
      const cb = chandrabala(natalMoonSignIdx, signOf(moonLon));
      const moonStrong = tb.favorable && cb.favorable;
      const moonWeak = tb.quality === "bad" || !cb.favorable;

      // base score after Moon modifiers (unchanged)
      let base = Math.round(blendScore);
      if (moonStrong && base < 2) base = Math.min(2, base+1); else if (moonWeak) base = base-1;

      // current: flat ceiling, Mercury OR Mars
      let sc = base; if (!!day.mercury.isRetrograde || !!day.mars.isRetrograde) sc = Math.min(sc, 2);
      const flatMode = SCORE_MODE(sc); if (flatMode === "Action") mF++, yF++;

      // option B: cap only when Mercury is TRULY retrograde; strong Moon punches EXCEPT the station core.
      const merRetro = !!day.mercury.isRetrograde;
      const nearStation = Math.abs(meSpeed.get(date) ?? 99) < STATION_EPS;
      let sp = base;
      if (merRetro) { const punch = moonStrong && !nearStation; if (!punch) sp = Math.min(sp, 2); }
      const bMode = SCORE_MODE(sp); if (bMode === "Action") mS++, yS++;

      if (bMode === "Action" && flatMode !== "Action") {
        const why = merRetro ? `punch@${merStrength(date).toFixed(2)}` : "Ma-drop";
        recovered.push(date.slice(5) + `(${why})`);
      }
    }
    console.log(ym.padEnd(10) + String(mF).padEnd(24) + String(mS).padEnd(27) + recovered.join(" "));
  }
  console.log("-".repeat(90));
  console.log("YEAR".padEnd(10) + String(yF).padEnd(24) + String(yS));
  console.log();
}
main().catch((e)=>{ console.error(e); process.exit(1); });
