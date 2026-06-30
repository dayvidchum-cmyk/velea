import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { generateGlance } from "../narrative/generate.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];

(async () => {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  console.log(`\n### GLANCE FOR EVERYONE — ${date} ###`);
  for (const p of rows) {
    if (!p.lagnaSign || !p.birthDate) continue;
    try {
      const input = await buildNarrativeInput(p.id, date);
      console.log(`\n${"=".repeat(74)}`);
      console.log(`${p.name} (#${p.id}) | ${input.natal.lagna} lagna | ${input.humanTime.dayOfWeek} | mode ${input.panchang.mode} | yr H${input.profection.activatedHouse} TL ${input.profection.timeLord} | dasha ${input.dasha?.mahaDasha.lord}-${input.dasha?.antarDasha.lord}`);
      console.log("=".repeat(74));
      const g = await generateGlance(input);
      if (!g) { console.log("  (no output)"); continue; }
      console.log("NARRATIVE: " + g.narrative);
      console.log("GOOD FOR:  " + (g.goodFor ?? []).map((x) => "· " + x).join("  "));
      console.log("AVOID:     " + (g.avoid ?? []).map((x) => "· " + x).join("  "));
    } catch (e: any) {
      console.log(`\n${p.name} (#${p.id}) — skipped: ${e.message}`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
