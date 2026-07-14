import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { generateGlance, generateDeepRead, generateChapter } from "../narrative/generate.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];

(async () => {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  console.log(`\n############  TODAY  ·  ${date}  ############`);
  for (const p of rows) {
    if (!p.lagnaSign || !p.birthDate) continue;
    let input: any;
    try { input = await buildNarrativeInput(p.id, date); }
    catch (e: any) { console.log(`\n${p.name} (#${p.id}) — skipped: ${e.message}`); continue; }

    const tlt = input.timeLordTransit;
    console.log(`\n${"━".repeat(80)}`);
    console.log(`${p.name}  (#${p.id})`);
    console.log(`${input.natal.lagna} lagna · ${input.humanTime.season}`);
    console.log(`Mode: ${input.panchang.qualifier || input.panchang.mode}  |  Year: H${input.profection.activatedHouse} ${input.profection.activatedSign}, Time Lord ${input.profection.timeLord} (natal H${input.profection.timeLordNatal?.house})  |  Dasha: ${input.dasha?.mahaDasha.lord}-${input.dasha?.antarDasha.lord}`);
    if (tlt) console.log(`Chapter: ${tlt.planet} transiting H${tlt.currentHouse} (${tlt.currentSign})`);
    console.log("━".repeat(80));

    const [g, d, ch] = await Promise.all([generateGlance(input), generateDeepRead(input), generateChapter(input)]);

    console.log(`\n  THE SIGNAL`);
    console.log("  " + (g?.narrative ?? "(none)"));
    console.log(`\n  QUESTION`);
    console.log("  " + (g?.question ?? "(none)"));
    console.log(`\n  GOOD FOR: ` + (g?.goodFor ?? []).map((x) => "· " + x).join("   "));
    console.log(`  AVOID:    ` + (g?.avoid ?? []).map((x) => "· " + x).join("   "));

    if (d) {
      console.log(`\n  THE READ`);
      console.log(`  Core:       ${d.coreTheme}`);
      console.log(`  Why now:    ${d.whyNow}`);
      console.log("  Manifestations: " + (d.manifestations ?? []).map((m: any) => m.area + ": " + m.note).join(" | "));
      console.log(`  The Lesson: ${d.developmentalTask}`);
      console.log(`  Chapter good for: ` + (ch?.chapterGoodFor ?? []).map((x: string) => "· " + x).join("  "));
      console.log(`  Chapter avoid:    ` + (ch?.chapterAvoid ?? []).map((x: string) => "· " + x).join("  "));
      console.log(`  Confidence: ${d.confidence.level} — ` + (d.confidence.factors ?? []).join("; "));
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
