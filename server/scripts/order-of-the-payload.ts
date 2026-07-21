/**
 * WHAT THE MODEL ACTUALLY RECEIVES, IN THE ORDER IT RECEIVES IT.
 *
 * David, 2026-07-21: "list it out in the order that it is handed to the LLM with how it is flagged
 * for the LLM. I want to see where the LLM starts, why, and where it goes after that."
 *
 * The call is (generate.ts:597-607):
 *   system  = [ BASE_PROMPT (cached prefix), <SURFACE>_TAIL ]
 *   messages= [ { role: "user", content: JSON.stringify(input) } ]
 *
 * So the data arrives as ONE JSON object in ONE user message, and its "order" is nothing more
 * than JavaScript object key-insertion order from buildNarrativeInput. This script prints that
 * true order, the size of each block, and — for every top-level key — every line in the two
 * system prompts that names it, so the FLAG on each block is quoted rather than characterised.
 *
 * Run: npx tsx server/scripts/order-of-the-payload.ts [profileId] [YYYY-MM-DD]
 */
import "dotenv/config";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";
import { BASE_PROMPT, DAY_READ_TAIL } from "../narrative/prompts.js";

const PROFILE_ID = Number(process.argv[2] ?? 1);
const DATE = process.argv[3] ?? new Date().toISOString().slice(0, 10);

/** Words that assert primacy — the thing the spec counted eleven of. */
const PRIMACY = /\b(the spine|the engine of|outranks|the loudest|first|before anything|above all|start (with|from)|open (with|from)|lead with|primary|takes precedence|dominant|most important|anchor)\b/i;

const sizeOf = (v: unknown) => JSON.stringify(v ?? null).length;

function describe(v: any): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return `array[${v.length}]`;
  if (typeof v === "object") return `object{${Object.keys(v).length}}: ${Object.keys(v).slice(0, 8).join(", ")}${Object.keys(v).length > 8 ? ", …" : ""}`;
  if (typeof v === "string") return v.length > 60 ? `"${v.slice(0, 60)}…"` : `"${v}"`;
  return String(v);
}

async function main() {
  const dayLoc = await resolveDaySkyForProfileId(PROFILE_ID, DATE);
  const input: any = await buildNarrativeInput(PROFILE_ID, DATE, { dayLoc });

  const keys = Object.keys(input);
  const total = JSON.stringify(input).length;

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  THE DAY READ PAYLOAD — profile #${PROFILE_ID}, ${DATE}`);
  console.log(`  day location: ${JSON.stringify(dayLoc)}`);
  console.log(`${"=".repeat(78)}`);
  console.log(`\n  WHAT THE MODEL RECEIVES, IN ORDER:`);
  console.log(`    system[0]  BASE_PROMPT     ${String(BASE_PROMPT.length).padStart(6)} chars   (cached prefix)`);
  console.log(`    system[1]  DAY_READ_TAIL   ${String(DAY_READ_TAIL.length).padStart(6)} chars`);
  console.log(`    user[0]    JSON payload    ${String(total).padStart(6)} chars   ${keys.length} top-level keys`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  THE PAYLOAD, IN THE ORDER THE MODEL READS IT (JSON key order)`);
  console.log(`${"=".repeat(78)}\n`);
  console.log(`   #  key                       chars   %  shape`);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const s = sizeOf(input[k]);
    console.log(
      `  ${String(i + 1).padStart(2)}. ${k.padEnd(24)} ${String(s).padStart(6)} ${String(Math.round((s / total) * 100)).padStart(3)}  ${describe(input[k]).slice(0, 90)}`
    );
  }

  // ── how each block is FLAGGED: quote every prompt line that names the key ──
  console.log(`\n${"=".repeat(78)}`);
  console.log(`  HOW EACH BLOCK IS FLAGGED  (quoted from BASE_PROMPT / DAY_READ_TAIL)`);
  console.log(`  "!" marks a line asserting primacy — where the model is told to START.`);
  console.log(`${"=".repeat(78)}`);

  const unnamed: string[] = [];
  const sources: [string, string][] = [["BASE", BASE_PROMPT], ["TAIL", DAY_READ_TAIL]];
  for (const k of keys) {
    const hits: string[] = [];
    for (const [label, text] of sources) {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match the key as a payload reference. FIRST VERSION OF THIS LINE REQUIRED `input.<key>`
        // and reported ten of seventeen blocks as "NOT NAMED" — which was FALSE: BASE_PROMPT opens
        // with a data dictionary that names every key bare ("- dasha: { mahaDasha… }") and refers
        // to several without the prefix ("panchang.activatedHouse", "natalRetrogradeCount is high").
        // A too-strict matcher reporting absence is the "zero from an uncontrolled instrument"
        // trap in CLAUDE.md, so the control below now fails loudly if any key reports zero.
        if (!new RegExp(`(input\\.)?\\b${k}\\b`).test(line)) continue;
        hits.push(`${PRIMACY.test(line) ? "!" : " "} [${label}:${i + 1}] ${line.trim().slice(0, 150)}`);
      }
    }
    console.log(`\n  ── ${k}  (${hits.length} mention${hits.length === 1 ? "" : "s"}) ${"─".repeat(Math.max(0, 48 - k.length))}`);
    if (hits.length === 0) { unnamed.push(k); console.log(`     (no mention found — SUSPECT THE MATCHER, see the control below)`); }
    else for (const h of hits.slice(0, 8)) console.log(`     ${h}`);
    if (hits.length > 8) console.log(`     … ${hits.length - 8} more`);
  }

  // CONTROL: BASE_PROMPT documents every payload key in its INPUT dictionary, so a key with zero
  // mentions means the matcher broke — not that the prompt is silent. This is the control that was
  // missing on the first run, when a strict matcher produced ten false "NOT NAMED" reports.
  console.log(`\n  CONTROL — keys with zero mentions: ${unnamed.length ? unnamed.join(", ") : "none"}   ${unnamed.length === 0 ? "OK" : "FAIL - matcher too strict, do not read these as absent"}`);

  // ── every primacy claim in the tail, in the order the model reads THEM ──
  console.log(`\n${"=".repeat(78)}`);
  console.log(`  EVERY PRIMACY CLAIM, IN PROMPT ORDER — the competing answers to "where do I start?"`);
  console.log(`${"=".repeat(78)}\n`);
  let n = 0;
  for (const [label, text] of sources) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!PRIMACY.test(lines[i])) continue;
      const t = lines[i].trim();
      if (t.length < 25) continue;
      console.log(`  ${String(++n).padStart(2)}. [${label}:${i + 1}] ${t.slice(0, 155)}`);
    }
  }
  console.log(`\n  TOTAL primacy assertions the model must arbitrate: ${n}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
