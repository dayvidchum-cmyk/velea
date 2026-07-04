/**
 * Proof harness for currentPratyantardasha (3rd Vimshottari level).
 * Verifies the classical rules against the antardasha it subdivides:
 *   (1) the 9 pratyantars TILE the antar exactly — first starts at antarStart,
 *       last ends at antarEnd, no gaps/overlaps;
 *   (2) the FIRST pratyantar lord = the antar lord (a period opens with its own sub-lord);
 *   (3) each pratyantar's length = (lord.years / 120) of the antar span;
 *   (4) every day of the antar lands in exactly one pratyantar (walk sampling).
 * Plus a live sanity print of the current maha/antar/pratyantar for a real chart.
 *
 * Run: npx tsx server/scripts/pratyantar-check.ts
 */
import "dotenv/config";
import { currentPratyantardasha } from "../dasha-calculator.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveAstrologySubject } from "../astrology-subject.js";

const YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const SEQ = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DAY = 86400000;

let fails = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fails++;
};

// Enumerate all 9 pratyantars of an antar span by walking day-by-day and asking the
// function which lord owns each day — reconstructs the boundaries it produces.
function enumerate(antarLord: string, start: string, end: string) {
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  const segs: { lord: string; start: number; end: number }[] = [];
  for (let t = s; t < e; t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    const p = currentPratyantardasha(antarLord, start, end, d);
    if (!p) { ok(`day ${d} has a pratyantar`, false); continue; }
    const last = segs[segs.length - 1];
    if (!last || last.lord !== p.lord) segs.push({ lord: p.lord, start: t, end: t + DAY });
    else last.end = t + DAY;
  }
  return { s, e, segs };
}

async function main() {
  // A representative antar span to subdivide (Saturn maha → Mercury antar, ~2.7y).
  const antarLord = "Mercury";
  const start = "2020-01-01", end = "2022-08-15";
  console.log(`=== Pratyantars of ${antarLord} antar  [${start} → ${end}) ===`);
  const { s, e, segs } = enumerate(antarLord, start, end);

  ok("first pratyantar lord = antar lord", segs[0]?.lord === antarLord, `got ${segs[0]?.lord}`);
  ok("exactly 9 distinct pratyantars in order",
     segs.length === 9 && segs.every((g, i) => g.lord === SEQ[(SEQ.indexOf(antarLord) + i) % 9]),
     segs.map(g => g.lord).join("→"));
  ok("first starts at antar start", Math.abs(segs[0].start - s) < DAY);
  ok("last ends at antar end", Math.abs(segs[segs.length - 1].end - e) < DAY);
  // No gaps/overlaps between consecutive segments.
  const contiguous = segs.every((g, i) => i === 0 || Math.abs(g.start - segs[i - 1].end) < DAY);
  ok("contiguous — no gaps or overlaps", contiguous);
  // Proportions: each segment ≈ (years/120) of the total span (±2 days for day-walk rounding).
  const total = e - s;
  const propOk = segs.every(g => {
    const expected = (YEARS[g.lord] / 120) * total;
    return Math.abs((g.end - g.start) - expected) < 2 * DAY;
  });
  ok("each length = (lord.years / 120) of the antar", propOk,
     segs.map(g => `${g.lord}:${Math.round((g.end - g.start) / DAY)}d`).join(" "));

  console.log("\n=== Live sanity — wired output via buildNarrativeInput (real chart) ===");
  const pid = (await resolveAstrologySubject(2) as any).profileId;
  const ni: any = await buildNarrativeInput(pid, "2026-07-03");
  const d = ni.dasha;
  if (d) {
    console.log(`  Maha ${d.mahaDasha.lord} → Antar ${d.antarDasha.lord} → Pratyantar ${d.pratyantarDasha?.lord ?? "(none)"}`);
    ok("input carries dasha.pratyantarDasha with a lord + natal + rulesHouses",
       !!(d.pratyantarDasha && d.pratyantarDasha.lord && d.pratyantarDasha.natal && Array.isArray(d.pratyantarDasha.rulesHouses)));
  } else {
    console.log("  (no current dasha for this chart/date — sanity skipped)");
  }

  console.log(`\n${fails === 0 ? "ALL PASS ✓" : fails + " FAILED ✗"}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
