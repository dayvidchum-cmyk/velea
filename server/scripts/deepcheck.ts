import "dotenv/config";
import { getDb } from "../db.js";
import { profiles } from "../../drizzle/schema.js";
import { buildNarrativeInput } from "../narrative/input-builder.js";
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";
import { generateDeepRead } from "../narrative/generate.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  for (const p of rows) {
    if (!p.lagnaSign || !p.birthDate) continue;
    try {
      const input = await buildNarrativeInput(p.id, date, { dayLoc: await resolveDaySkyForProfileId(p.id, date) });
      const d = await generateDeepRead(input);
      const ok = !!d && !!d.confidence;
      const words = d ? JSON.stringify(d).replace(/[{}\[\]",:]/g, " ").split(/\s+/).filter(Boolean).length : 0;
      console.log(`${ok ? "PASS" : "FAIL"}  ${p.name} (#${p.id})  conf=${d?.confidence?.level ?? "—"}  ~words=${words}`);
    } catch (e: any) { console.log(`ERROR ${p.name} (#${p.id}): ${e.message}`); }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
