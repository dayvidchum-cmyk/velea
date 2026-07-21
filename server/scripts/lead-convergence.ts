/**
 * DOES THE STEP-15 ENGINE VELEA ALREADY HAS PICK A SINGLE SUBJECT?
 *
 * LEAD_SPEC.md §4 proposed building a NEW house-level convergence to answer "what is this read
 * about". Before writing it, ask whether the answer already exists: convergence.ts is Appendix IV
 * Step 15, it converges over knot THEMES rather than houses, its tie law is Simone-validated
 * (v430) and its result is already stored per profile.
 *
 * So the real question is not "what should we build" but "how many themes does the existing
 * engine light at once?"
 *
 *   exactly 1 lit  -> the lead already exists; the build is a SELECTION over stored data
 *   0 lit          -> the null case of §4.4, and it must be measured, not assumed rare
 *   2+ lit         -> contention survives Step 15 and a tiebreak is genuinely needed
 *
 * SAME COHORT AS lead-contention.ts — the same 32 real birth moments x the same 33 dates across
 * 2026 — so the two results are directly comparable. No database.
 *
 * mcLon IS PASSED AS NULL, and that is safe for exactly one reason, verified in source rather
 * than assumed: the heavy-lord law feeds `weight` only (knots.ts:295), while `convergence` is
 * `activeLords.size` (knots.ts:291) and `lit` gates on convergence (knots.ts:305 / convergence.ts).
 * An absent meridian therefore cannot change a single `lit` in this run. It WOULD change `weight`,
 * so this script never reports weight.
 *
 * Run: npx tsx server/scripts/lead-convergence.ts
 */
import { calculateNatalChart } from "../vedic/natal-chart-engine.js";
import { computeConvergenceTimeline, type ConvergenceSpan } from "../vedic/convergence.js";

const ZOD = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const BODIES = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Rahu","Ketu"];

/** Identical cohort to lead-contention.ts — copied deliberately so the two runs are comparable. */
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

const DATES = (() => {
  const out: string[] = [];
  const d = new Date(Date.UTC(2026, 0, 3));
  while (d.getUTCFullYear() === 2026) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 11);
  }
  return out;
})();

/** calculateNatalChart keys planets LOWERCASE and stores degrees INTO the sign, not longitude. */
const lonOf = (chart: any, planet: string): number | null => {
  const p = chart.planets?.[planet.toLowerCase()];
  if (!p || typeof p.degree !== "number") return null;
  const si = ZOD.indexOf(p.sign);
  return si < 0 ? null : si * 30 + p.degree;
};

const birthUtcMsOf = (b: { date: string; time: string; tz: number }) => {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm, ss] = b.time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh - b.tz, mm, ss);
};

async function main() {
  const litHistogram = new Map<number, number>();
  const themeLit = new Map<string, number>();
  const mahaTiedCount = new Map<number, number>();     // how many themes are maha-tied but NOT lit
  let cells = 0, chartsUsed = 0;
  // Controls
  let spansTotal = 0, spansWithNoThemes = 0;
  const distinctLitSets = new Set<string>();

  for (const b of BIRTHS) {
    const chart = await calculateNatalChart(b.date, b.time, b.lat, b.lon, b.tz);
    const lonBy: Record<string, number> = {};
    let complete = true;
    for (const p of BODIES) {
      const l = lonOf(chart, p);
      if (l == null) { complete = false; break; }
      lonBy[p] = l;
    }
    const lagnaSignIdx = ZOD.indexOf(chart.lagna.sign);
    if (!complete || lagnaSignIdx < 0) continue;
    // Degree-true lagna: the sign index plus the stored degree into the sign.
    const lagnaLon = lagnaSignIdx * 30 + (chart.lagna.degree ?? 0);
    const birthUtcMs = birthUtcMsOf(b);

    let timeline: ConvergenceSpan[];
    try {
      timeline = computeConvergenceTimeline({ lonBy, lagnaLon, birthUtcMs, mcLon: null });
    } catch (e) {
      console.error(`  chart ${b.date} ${b.time} failed:`, (e as Error).message);
      continue;
    }
    chartsUsed++;
    spansTotal += timeline.length;
    for (const s of timeline) if (Object.keys(s.themes).length === 0) spansWithNoThemes++;

    for (const dateStr of DATES) {
      const ms = Date.parse(`${dateStr}T12:00:00Z`);
      const span = timeline.find((s) => ms >= s.startMs && ms < s.endMs);
      if (!span) continue;   // outside the 120-year timeline; counted by omission, see controls

      const lit: string[] = [];
      let tiedNotLit = 0;
      for (const [theme, tc] of Object.entries(span.themes)) {
        if (tc.lit) lit.push(theme);
        else if (tc.mahaTied) tiedNotLit++;
      }
      cells++;
      litHistogram.set(lit.length, (litHistogram.get(lit.length) ?? 0) + 1);
      mahaTiedCount.set(tiedNotLit, (mahaTiedCount.get(tiedNotLit) ?? 0) + 1);
      for (const t of lit) themeLit.set(t, (themeLit.get(t) ?? 0) + 1);
      distinctLitSets.add(lit.sort().join("+") || "(none)");
    }
  }

  const pct = (n: number) => `${((n / cells) * 100).toFixed(1)}%`;
  console.log(`\n  ${chartsUsed} charts x ${DATES.length} dates = ${cells} chart-days`);
  console.log(`  (each chart's full 120-year convergence timeline: ${spansTotal} pratyantar spans)\n`);

  console.log("  HOW MANY THEMES ARE LIT AT ONCE  (existing Step-15 engine, standing rule)");
  let one = 0, none = 0, many = 0;
  for (const k of [...litHistogram.keys()].sort((a, b) => a - b)) {
    const v = litHistogram.get(k)!;
    if (k === 0) none = v; else if (k === 1) one = v; else many += v;
    console.log(`    ${String(k).padStart(2)} lit    ${String(v).padStart(5)}   ${pct(v).padStart(6)}  ${"#".repeat(Math.round((v / cells) * 60))}`);
  }
  console.log(`\n    exactly one (the lead is already decided) : ${String(one).padStart(5)}   ${pct(one)}`);
  console.log(`    none        (the null case, §4.4)         : ${String(none).padStart(5)}   ${pct(none)}`);
  console.log(`    two or more (a tiebreak is needed)        : ${String(many).padStart(5)}   ${pct(many)}`);

  console.log("\n  WHICH THEMES LIGHT");
  for (const [t, v] of [...themeLit.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`    ${t.padEnd(20)} ${String(v).padStart(5)}   ${pct(v).padStart(6)}`);
  if (themeLit.size === 0) console.log("    (none — see controls before believing this)");

  console.log("\n  NEAR MISSES — themes maha-tied but short of convergence 2");
  for (const k of [...mahaTiedCount.keys()].sort((a, b) => a - b))
    console.log(`    ${k} such theme${k === 1 ? " " : "s"}   ${String(mahaTiedCount.get(k)!).padStart(5)}   ${pct(mahaTiedCount.get(k)!).padStart(6)}`);

  // ── CONTROLS. A zero from an uncontrolled instrument is not evidence (CLAUDE.md).
  console.log("\n  CONTROLS");
  console.log(`    charts that produced a timeline        : ${chartsUsed}/${BIRTHS.length}   ${chartsUsed === BIRTHS.length ? "OK" : "FAIL - charts dropped"}`);
  console.log(`    every chart-day found a covering span  : ${cells}/${chartsUsed * DATES.length}   ${cells === chartsUsed * DATES.length ? "OK" : "FAIL - gaps in the timeline"}`);
  console.log(`    spans carrying NO theme at all         : ${spansWithNoThemes}/${spansTotal}   ${spansWithNoThemes < spansTotal ? "OK - the engine does produce themes" : "FAIL - engine returned nothing anywhere"}`);
  console.log(`    distinct lit-sets observed             : ${distinctLitSets.size}   ${distinctLitSets.size >= 2 ? "OK - the result varies by chart" : "FAIL - one-sided, suspect the instrument"}`);
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
