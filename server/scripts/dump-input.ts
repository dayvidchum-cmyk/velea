import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";

const date = "2026-06-29";
const NAMES = ["Lisa", "Linda", "David Chum"];
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  for (const p of rows) {
    if (!NAMES.includes(p.name ?? "")) continue;
    if (!p.lagnaSign || !p.birthDate) continue;
    const i: any = await buildNarrativeInput(p.id, date, { dayLoc: await resolveDaySkyForProfileId(p.id, date) });
    console.log(`\n${"=".repeat(70)}\n${p.name} (#${p.id})  —  ${i.natal.lagna} lagna · age ${i.profection.age}`);
    console.log(`Year: H${i.profection.activatedHouse} ${i.profection.activatedSign} · TL ${i.profection.timeLord} (natal H${i.profection.timeLordNatal?.house})`);
    console.log(`Dasha: ${JSON.stringify(i.dasha)}`);
    console.log(`TimeLordTransit: ${JSON.stringify(i.timeLordTransit)}`);
    console.log(`Natal: ${JSON.stringify((i.natal.planets ?? i.natal.bodies ?? []).map((x:any)=>({p:x.planet??x.body,h:x.house,s:x.sign,dig:x.dignity,retro:x.retrograde})))}`);
  }
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
