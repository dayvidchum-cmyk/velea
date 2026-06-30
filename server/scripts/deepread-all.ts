import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { generateDeepRead } from "../narrative/generate.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];

(async () => {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  console.log(`\n############  THE READ — every user  ·  ${date}  ############`);
  for (const p of rows) {
    if (!p.lagnaSign || !p.birthDate) continue;
    let input: any;
    try { input = await buildNarrativeInput(p.id, date); }
    catch (e: any) { console.log(`\n${p.name} (#${p.id}) — skipped: ${e.message}`); continue; }

    console.log(`\n${"━".repeat(80)}`);
    console.log(`${p.name}  (#${p.id})  —  ${input.natal.lagna} lagna · age ${input.profection.age} · H${input.profection.activatedHouse} ${input.profection.activatedSign} · TL ${input.profection.timeLord} (natal H${input.profection.timeLordNatal?.house}) · dasha ${input.dasha?.mahaDasha.lord}-${input.dasha?.antarDasha.lord}`);
    console.log("━".repeat(80));

    const d = await generateDeepRead(input);
    if (!d) { console.log("  (no read)"); continue; }
    const sec = (s: any) => s ? `${s.synthesis}\n     ↳ ${s.why}` : "";
    console.log(`\nCORE THEME\n  ${sec(d.coreTheme)}`);
    console.log(`\nWHY NOW — the dasha\n  ${sec(d.whyNow)}`);
    console.log(`\nMANIFESTATIONS`);
    for (const m of d.manifestations ?? []) console.log(`  • ${m.area} — ${m.synthesis}\n     ↳ ${m.why}`);
    console.log(`\nTHE LESSON\n  ${sec(d.developmentalTask)}`);
    console.log(`\nCHAPTER good for: ` + (d.chapterGoodFor ?? []).map((x: string) => "· " + x).join("  "));
    console.log(`CHAPTER avoid:    ` + (d.chapterAvoid ?? []).map((x: string) => "· " + x).join("  "));
    console.log(`\nCONFIDENCE: ${d.confidence.level}\n  ` + (d.confidence.factors ?? []).map((f: any) => `· ${f.plain}  —  ${f.astro}`).join("\n  "));
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
