import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";

(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  for (const p of rows) {
    if (!["Linda","Lisa","David Chum"].includes(p.name ?? "")) continue;
    if (!p.lagnaSign || !p.birthDate) continue;
    const i: any = await buildNarrativeInput(p.id, "2026-06-29", { dayLoc: await resolveDaySkyForProfileId(p.id, "2026-06-29") });
    const planets = i.natal.planets ?? i.natal.bodies ?? [];
    console.log(`\n${p.name} (${i.natal.lagna} lagna)`);
    // raw, with whatever name field exists
    for (const x of planets) {
      const name = x.planet ?? x.body ?? x.name ?? "?";
      console.log(`  ${String(name).padEnd(8)} H${x.house}  ${x.sign}  ${x.dignity ?? ""}${x.retrograde?" Rx":""}  ${x.nakshatra ?? ""}`);
    }
    // which planets sit in 2nd and 3rd
    const in2 = planets.filter((x:any)=>x.house===2).map((x:any)=>x.planet??x.body??x.name);
    const in3 = planets.filter((x:any)=>x.house===3).map((x:any)=>x.planet??x.body??x.name);
    console.log(`  → 2nd house (voice/worth): ${in2.join(", ")||"empty"} | 3rd house (expression): ${in3.join(", ")||"empty"}`);
  }
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
