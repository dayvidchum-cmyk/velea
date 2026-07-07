import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { generateDeepRead, generateChapter } from "../narrative/generate.js";

const date = process.argv[3] ?? "2026-06-29";
const want = process.argv[2] ?? "Linda";
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  for (const p of rows) {
    if (p.name !== want || !p.lagnaSign || !p.birthDate) continue;
    const i: any = await buildNarrativeInput(p.id, date);
    console.log(`\n${"━".repeat(78)}\n${p.name} (#${p.id}) — ${i.natal.lagna} lagna · age ${i.profection.age} · H${i.profection.activatedHouse} ${i.profection.activatedSign} · TL ${i.profection.timeLord} (natal H${i.profection.timeLordNatal?.house}) · dasha ${i.dasha?.mahaDasha.lord}-${i.dasha?.antarDasha.lord}\n${"━".repeat(78)}`);
    const d = await generateDeepRead(i);
    if (!d) { console.log("(no read)"); continue; }
    const sec = (s: any) => s ? `${s.synthesis}\n     ↳ ${s.why}` : "";
    console.log(`\nCORE THEME\n  ${sec(d.coreTheme)}`);
    console.log(`\nWHY NOW — the dasha\n  ${sec(d.whyNow)}`);
    console.log(`\nMANIFESTATIONS`);
    for (const m of d.manifestations ?? []) console.log(`  • ${m.area} — ${m.synthesis}\n     ↳ ${m.why}`);
    console.log(`\nTHE LESSON\n  ${sec(d.developmentalTask)}`);
    const ch = await generateChapter(i);
    console.log(`\nCHAPTER good for: ` + (ch?.chapterGoodFor ?? []).map((x:string)=>"· "+x).join("  "));
    console.log(`CHAPTER avoid:    ` + (ch?.chapterAvoid ?? []).map((x:string)=>"· "+x).join("  "));
    console.log(`\nCONFIDENCE: ${d.confidence.level}\n  ` + (d.confidence.factors ?? []).map((f:any)=>`· ${f.plain}  —  ${f.astro}`).join("\n  "));
  }
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
