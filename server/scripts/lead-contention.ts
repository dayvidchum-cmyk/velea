/**
 * WHO CLAIMS THE LEAD, AND HOW OFTEN DO THEY CLAIM IT AT ONCE?
 *
 * David, 2026-07-21: "How does the LLM ground itself? Where does it latch onto something and
 * decide this is the beginning?"
 *
 * It doesn't. prompts.ts contains ELEVEN passages asserting primacy, and five different things
 * are called the spine or the engine of the read (the meridian, the relational traversal, the
 * natal Moon, the life-area lens, the retrograde arc). Nothing arbitrates between them, so the
 * model gives each claimant a sentence — an inventory, not a read.
 *
 * Before ranking them, measure them. This counts how often each claimant is PRESENT on a real
 * chart-day, and how many are present simultaneously. A ladder is only worth building if
 * contention is common; if two claimants almost never co-occur, the flat prompt is fine.
 *
 * NO DATABASE. Charts are generated from real birth moments through the same ephemeris the app
 * uses, so every chart is one that can actually exist. This is deliberate: the #4 retraction in
 * DECISIONS_FOR_DAVID happened because I averaged 297 star x sign combinations that cannot occur.
 * Here the longitudes come from real datetimes, so that error is not reachable.
 *
 * WHAT THIS DOES NOT MEASURE, stated so the result is not read as more than it is:
 *   - the knots (buildKnots needs the full research shape; excluded rather than approximated)
 *   - the life-area lens (only present when the reader taps an area)
 *   - the hermit condition
 * So the contention numbers below are a FLOOR. The real figure is higher, never lower.
 *
 * Run: npx tsx server/scripts/lead-contention.ts
 */
import { calculateNatalChart } from "../vedic/natal-chart-engine.js";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine.js";
import { crownDay, tarabala } from "../panchang/crown.js";
import { mercuryRxState } from "../sky/retrograde-phase.js";
import { calculateProfectionYear } from "../profection/calculator.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const norm = (x: number) => ((x % 360) + 360) % 360;
const NAK = 360 / 27;
const nakIdx = (lon: number) => Math.floor(norm(lon) / NAK);
const signIdx = (lon: number) => Math.floor(norm(lon) / 30);

/** A spread of real birth moments — varied year, month, hour and latitude. */
const BIRTHS = (() => {
  const out: { date: string; time: string; lat: number; lon: number; tz: number }[] = [];
  const places = [
    { lat: 42.36, lon: -71.06, tz: -5 },   // Boston
    { lat: 13.08, lon: 80.27, tz: 5.5 },   // Chennai
    { lat: 51.51, lon: -0.13, tz: 0 },     // London
    { lat: -33.87, lon: 151.21, tz: 10 },  // Sydney
  ];
  let i = 0;
  for (const y of [1962, 1971, 1980, 1988, 1993, 1999, 2004, 2011]) {
    for (const m of [1, 4, 7, 10]) {
      const p = places[i % places.length];
      const hh = [2, 8, 14, 20][i % 4];
      out.push({ date: `${y}-${String(m).padStart(2, "0")}-14`, time: `${String(hh).padStart(2, "0")}:20:00`, ...p });
      i++;
    }
  }
  return out;
})();

/** A spread of dates across a year — every 11 days, so no weekday or tithi bias. */
const DATES = (() => {
  const out: string[] = [];
  const d = new Date(Date.UTC(2026, 0, 3));
  while (d.getUTCFullYear() === 2026) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 11);
  }
  return out;
})();

type Claim = "crown" | "starTurn" | "mercuryRx" | "hostileGround" | "nodeOnTimeLord" | "meridianLoaded";
const CLAIMS: Claim[] = ["crown", "starTurn", "mercuryRx", "hostileGround", "nodeOnTimeLord", "meridianLoaded"];

async function main() {
  const present: Record<Claim, number> = { crown: 0, starTurn: 0, mercuryRx: 0, hostileGround: 0, nodeOnTimeLord: 0, meridianLoaded: 0 };
  const histogram = new Map<number, number>();
  const pairs = new Map<string, number>();
  let cells = 0;

  // Sky is per-DATE, not per-chart — compute once each.
  const sky = new Map<string, { lon: Record<string, number>; lonNext: Record<string, number>; rx: boolean }>();
  for (const dateStr of DATES) {
    const noon = new Date(`${dateStr}T12:00:00Z`);
    const next = new Date(noon.getTime() + 86400000);
    const [lon, lonNext, rxState] = await Promise.all([
      getSiderealLongitudes(noon, ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]),
      getSiderealLongitudes(next, ["Moon"]),
      mercuryRxState(dateStr),
    ]);
    sky.set(dateStr, { lon: lon as any, lonNext: lonNext as any, rx: rxState.retrograde || rxState.phase === "retrograde" });
  }

  // calculateNatalChart keys its planets LOWERCASE and stores {sign, degree, house} with degree
  // being degrees INTO the sign — there is no `longitude` field. Both of those cost a zeroed
  // first run; the control at the bottom exists so a zero can never again be read as a result.
  const lonOf = (chart: any, planet: string): number | null => {
    const p = chart.planets?.[planet.toLowerCase()];
    if (!p || typeof p.degree !== "number") return null;
    const si = ZOD.indexOf(p.sign);
    return si < 0 ? null : si * 30 + p.degree;
  };

  for (const b of BIRTHS) {
    const chart = await calculateNatalChart(b.date, b.time, b.lat, b.lon, b.tz);
    const moonLon = lonOf(chart, "Moon");
    if (moonLon == null) continue;
    const birthNak = nakIdx(moonLon);
    const natalMoonSign = signIdx(moonLon);
    const lagnaSignIdx = ZOD.indexOf(chart.lagna.sign);
    // The 10th cusp is the meridian pole in a whole-sign frame.
    const tenthSign = (lagnaSignIdx + 9) % 12;

    for (const dateStr of DATES) {
      const s = sky.get(dateStr)!;
      const claims = new Set<Claim>();

      // 1. CROWN — the personal apex.
      const transitSignByPlanet: Record<string, number> = {};
      for (const [p, l] of Object.entries(s.lon)) transitSignByPlanet[p] = signIdx(l as number);
      const crown = crownDay({
        birthNakIdx: birthNak, natalMoonSignIdx: natalMoonSign, lagnaSignIdx,
        sunLon: s.lon["Sun"], moonLon: s.lon["Moon"], transitSignByPlanet,
      } as any);
      // CrownDay returns `rating`, NOT an `isCrown` boolean — assuming the latter zeroed this
      // claimant on the first run. The true crown is the TOP TWELVE of a ranked year, which a
      // single-day call cannot know; "crown" here is the day's own top rating, which is the
      // per-day ceiling and a fair proxy for the claimant being loud.
      if ((crown as any)?.rating === "crown") claims.add("crown");

      // 2. STAR TURN — the Moon changes nakshatra inside the day.
      if (nakIdx(s.lon["Moon"]) !== nakIdx(s.lonNext["Moon"])) claims.add("starTurn");

      // 3. MERCURY RETROGRADE — the arc that calls itself the engine of its own read.
      if (s.rx) claims.add("mercuryRx");

      // 4. HOSTILE PERSONAL GROUND — the thin/leaning rungs, the claimant that produced the
      //    contradiction on screen ("LEANING RESTRAINT" against "BOLD MOVES ... GO").
      const tb = tarabala(birthNak, nakIdx(s.lon["Moon"]));
      if (tb.quality !== "good") claims.add("hostileGround");

      // 5. A NODE ON THE YEAR'S TIME LORD — "CENTRAL to the year, not a footnote."
      const pf = calculateProfectionYear(b.date, dateStr, chart.lagna.sign);
      const tlNatal = lonOf(chart, pf.timeLord);
      if (tlNatal != null) {
        for (const node of ["Rahu", "Ketu"]) {
          const nl = lonOf(chart, node);
          if (nl != null && Math.abs(((tlNatal - nl + 540) % 360) - 180) <= 10) claims.add("nodeOnTimeLord");
        }
      }

      // 6. THE MERIDIAN LOADED — a transiting graha standing on the dharma axis.
      for (const [p, l] of Object.entries(s.lon)) {
        const si = signIdx(l as number);
        if (si === tenthSign || si === (tenthSign + 6) % 12) { claims.add("meridianLoaded"); break; }
      }

      cells++;
      for (const c of claims) present[c]++;
      histogram.set(claims.size, (histogram.get(claims.size) ?? 0) + 1);
      const arr = [...claims].sort();
      for (let i = 0; i < arr.length; i++)
        for (let j = i + 1; j < arr.length; j++)
          pairs.set(`${arr[i]} + ${arr[j]}`, (pairs.get(`${arr[i]} + ${arr[j]}`) ?? 0) + 1);
    }
  }

  const pct = (n: number) => `${((n / cells) * 100).toFixed(1)}%`;
  console.log(`\n  ${BIRTHS.length} charts x ${DATES.length} dates = ${cells} chart-days\n`);
  console.log("  HOW OFTEN EACH CLAIMANT IS PRESENT");
  for (const c of [...CLAIMS].sort((a, b) => present[b] - present[a]))
    console.log(`    ${c.padEnd(16)} ${String(present[c]).padStart(5)}   ${pct(present[c]).padStart(6)}`);

  console.log("\n  HOW MANY CLAIM THE LEAD AT ONCE");
  let contended = 0;
  for (const k of [...histogram.keys()].sort((a, b) => a - b)) {
    const v = histogram.get(k)!;
    if (k >= 2) contended += v;
    console.log(`    ${k} claimant${k === 1 ? " " : "s"}    ${String(v).padStart(5)}   ${pct(v).padStart(6)}  ${"#".repeat(Math.round((v / cells) * 60))}`);
  }
  console.log(`\n    TWO OR MORE: ${contended} of ${cells} = ${pct(contended)}  <- the ladder decides these`);

  console.log("\n  THE MOST FREQUENT COLLISIONS");
  for (const [k, v] of [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6))
    console.log(`    ${k.padEnd(34)} ${String(v).padStart(5)}   ${pct(v).padStart(6)}`);

  // ── CONTROLS. A measurement with no control is not evidence (CLAUDE.md).
  console.log("\n  CONTROLS");
  const allNak = new Set<number>(), allTara = new Set<string>();
  for (const dateStr of DATES) allNak.add(nakIdx(sky.get(dateStr)!.lon["Moon"]));
  for (const b of BIRTHS) {
    const c = await calculateNatalChart(b.date, b.time, b.lat, b.lon, b.tz);
    const ml = lonOf(c, "Moon");
    if (ml == null) continue;
    for (const dateStr of DATES)
      allTara.add(tarabala(nakIdx(ml), nakIdx(sky.get(dateStr)!.lon["Moon"])).quality);
  }
  console.log(`    distinct Moon nakshatras across the date spread : ${allNak.size} of 27   ${allNak.size > 12 ? "OK - the dates are not clustered" : "FAIL - dates are clustered"}`);
  console.log(`    distinct tara qualities produced               : ${[...allTara].sort().join(", ")}   ${allTara.size >= 2 ? "OK - both fire" : "FAIL - one-sided"}`);
  console.log(`    a claimant that should NEVER fire (impossible) : ${(() => {
    // Negative control: a tarabala of the birth star against itself is ALWAYS Janma (tara 1),
    // which is never "good" - so hostileGround must fire 100% here and 0% is a broken instrument.
    let hits = 0;
    for (const b of BIRTHS) hits += tarabala(0, 0).quality !== "good" ? 1 : 0;
    return `${hits}/${BIRTHS.length} self-tara are non-good  ${hits === BIRTHS.length ? "OK" : "FAIL"}`;
  })()}`);
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
