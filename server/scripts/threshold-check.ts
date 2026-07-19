import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  for (const p of rows) {
    if (!["David Chum","Lisa","Krista","Linda","Lang","Simone"].includes(p.name ?? "")) continue;
    if (!p.lagnaSign || !p.birthDate) continue;
    const i: any = await buildNarrativeInput(p.id, "2026-06-29", { dayLoc: await resolveDaySkyForProfileId(p.id, "2026-06-29") });
    console.log(`\n${p.name} (#${p.id}) — lagna ${i.natal.lagna} ${i.natal.lagnaDegree ?? "?"}°${i.natal.lagnaThreshold?` [${i.natal.lagnaThreshold}]`:""}`);
    for (const pl of i.natal.planets) {
      const flag = pl.threshold ? `  <<< ${pl.threshold}` : "";
      const big3 = ["Sun","Moon"].includes(pl.name);
      if (pl.threshold || big3) console.log(`   ${pl.name.padEnd(8)} ${pl.sign.padEnd(12)} ${String(pl.degree).padStart(5)}°${flag}`);
    }
  }
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
