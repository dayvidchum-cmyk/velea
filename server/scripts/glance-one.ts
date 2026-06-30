import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { generateGlance, hasAnthropicKey } from "../narrative/generate.js";
const date = process.argv[3] ?? "2026-06-30";
const want = process.argv[2] ?? "David Chum";
(async () => {
  console.log("API key present:", hasAnthropicKey());
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  const p = rows.find(r => r.name === want);
  if (!p) { console.log("profile not found:", want); process.exit(1); }
  const input: any = await buildNarrativeInput(p.id, date);
  console.log(`\n${p.name} — ${input.natal.lagna} · ${date}`);
  try {
    const g = await generateGlance(input);
    if (!g) { console.log("generateGlance returned NULL"); process.exit(0); }
    console.log("\n=== NARRATIVE (raw, showing newlines as ¶) ===");
    console.log(g.narrative.replace(/\n/g, "¶\n"));
    console.log("\nparagraph count (split on blank line):", g.narrative.split(/\n{2,}/).length);
    console.log("\nQUESTION:", g.question);
  } catch (e: any) {
    console.log("generateGlance THREW:", e.message);
  }
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
