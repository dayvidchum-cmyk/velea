import "dotenv/config";
import { getDb } from "../db.js";
import { projects } from "../../drizzle/schema.js";
import { parseLifeAreas, LIFE_AREAS } from "../../shared/life-areas.js";
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  const rows = await db.select().from(projects).limit(5);
  console.log(`projects found: ${rows.length}`);
  for (const p of rows) console.log(`  #${p.id} "${p.name}" → lifeAreas col: ${JSON.stringify(p.lifeAreas)} → parsed: ${JSON.stringify(parseLifeAreas(p.lifeAreas))}`);
  console.log(`\navailable life areas: ${LIFE_AREAS.map(a => a.key + "=[" + a.houses.join(",") + "]").join("  ")}`);
  process.exit(0);
})().catch(e=>{console.error("FAIL:",e.message);process.exit(1);});
