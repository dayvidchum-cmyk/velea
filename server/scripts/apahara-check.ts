/**
 * Proof harness for the APAHARA layer (server/panchapakshi/apahara.ts) — replays the
 * FULL Astro-Vision corpus (196 detailed charts, 4,900 sub-period rows, three PDFs
 * David supplied 2026-07-10) against the encoded laws, and exhaustively diffs the
 * shipped BIRD_MAIN_SEQUENCES against the corpus's 28 simple weekday tables.
 *
 * The engine must reproduce EVERY row: sub-bird, sub-activity, duration, relation,
 * power, effect. Zero tolerance — a single mismatch fails the run.
 *
 * Run: npx tsx server/scripts/apahara-check.ts
 */
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeApaharas } from "../panchapakshi/apahara.js";
import { BIRD_MAIN_SEQUENCES } from "../panchapakshi/sequences.js";
import { ACTIVITIES, type Activity } from "../panchapakshi/activities.js";
import { BIRDS, type Bird, type Paksha } from "../panchapakshi/tables.js";

const here = dirname(fileURLToPath(import.meta.url));
const REF = join(here, "..", "panchapakshi", "reference");

// Corpus vocabulary → engine vocabulary.
const ACT: Record<string, Activity> = { Rule: "Ruling", Eat: "Eating", Walk: "Walking", Sleep: "Sleeping", Death: "Dying" };
const PAK: Record<string, Paksha> = { Suklapaksha: "Shukla", Krishnapaksha: "Krishna" };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Row = {
  file: string; bird: string; paksha: string; weekday: string; phase: "day" | "night";
  yamaIndex: number; mainActivity: string; subIndex: number; subBird: string;
  subActivity: string; durMin: number; relation: string; power: number; effect: string;
};

const rows: Row[] = JSON.parse(gunzipSync(readFileSync(join(REF, "pakshi-extract.json.gz"))).toString());
console.log(`Corpus: ${rows.length} sub-period rows`);

// ---- 1. Replay every yama through computeApaharas (nominal 144-min yamas) ----
const byYama = new Map<string, Row[]>();
for (const r of rows) {
  const k = [r.file, r.bird, r.paksha, r.weekday, r.phase, r.yamaIndex].join("|");
  if (!byYama.has(k)) byYama.set(k, []);
  byYama.get(k)!.push(r);
}

let yamas = 0, mismatches = 0;
const MIN = 60000;
for (const [key, subs] of Array.from(byYama.entries())) {
  subs.sort((a: Row, b: Row) => a.subIndex - b.subIndex);
  const r0 = subs[0];
  const start = 0, end = 144 * MIN;
  const got = computeApaharas({
    mainBird: r0.bird as Bird,
    mainActivity: ACT[r0.mainActivity],
    paksha: PAK[r0.paksha],
    phase: r0.phase,
    startMs: start,
    endMs: end,
  });
  for (let i = 0; i < 5; i++) {
    const want = subs[i], g = got[i];
    const durMin = Math.round((g.endMs - g.startMs) / MIN);
    const bad =
      g.bird !== want.subBird ||
      g.activity !== ACT[want.subActivity] ||
      durMin !== want.durMin ||
      g.relation !== want.relation ||
      Math.abs(g.power - want.power) > 0.005 ||
      g.effect !== want.effect;
    if (bad) {
      mismatches++;
      if (mismatches <= 5)
        console.log(`MISMATCH ${key} sub${i + 1}: want ${want.subBird}-${want.subActivity} ${want.durMin}m ${want.relation} ${want.power} "${want.effect}" — got ${g.bird}-${g.activity} ${durMin}m ${g.relation} ${g.power} "${g.effect}"`);
    }
  }
  yamas++;
}
console.log(`1. APAHARA replay: ${yamas} yamas × 5 subs — ${mismatches === 0 ? "ALL MATCH" : mismatches + " MISMATCHES"}`);

// ---- 2. Exhaustive diff: shipped BIRD_MAIN_SEQUENCES vs the corpus simple tables ----
const mains = JSON.parse(readFileSync(join(REF, "pakshi-main-sequences.json"), "utf8"));
let cells = 0, mainBad = 0;
for (let wd = 0; wd < 7; wd++) {
  for (const [pName, pIdx] of [["Suklapaksha", 0], ["Krishnapaksha", 1]] as const) {
    for (const [phName, phIdx] of [["day", 0], ["night", 1]] as const) {
      for (let b = 0; b < 5; b++) {
        const corpus: string[] | undefined = mains[WEEKDAYS[wd]]?.[pName]?.[phName]?.[BIRDS[b]];
        if (!corpus) continue;
        const ours = BIRD_MAIN_SEQUENCES[wd][pIdx][phIdx][b].map((a) => ACTIVITIES[a]);
        for (let y = 0; y < 5; y++) {
          cells++;
          if (ours[y] !== ACT[corpus[y]]) {
            mainBad++;
            if (mainBad <= 5) console.log(`MAIN MISMATCH ${WEEKDAYS[wd]} ${pName} ${phName} ${BIRDS[b]} yama${y + 1}: corpus ${corpus[y]} vs ours ${ours[y]}`);
          }
        }
      }
    }
  }
}
console.log(`2. MAIN SEQUENCES diff: ${cells} cells vs corpus — ${mainBad === 0 ? "ALL MATCH" : mainBad + " MISMATCHES"}`);

// ---- 3. Real-length scaling sanity: uneven yama tiles exactly, order preserved ----
const g = computeApaharas({ mainBird: "Owl", mainActivity: "Ruling", paksha: "Krishna", phase: "day", startMs: 1000, endMs: 1000 + 9013277 });
const tile = g[0].startMs === 1000 && g[4].endMs === 1000 + 9013277 && g.every((x, i) => i === 0 || g[i - 1].endMs === x.startMs);
console.log(`3. Real-length tiling: ${tile ? "PASS" : "FAIL"}`);

const failed = mismatches + mainBad + (tile ? 0 : 1);
console.log(failed === 0 ? "\nALL PROOFS PASS" : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
