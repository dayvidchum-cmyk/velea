import "dotenv/config";
import { getDb } from "../db.js";
import { sql } from "drizzle-orm";
(async () => {
  const db = await getDb(); if (!db) throw new Error("no db");
  try {
    await db.execute(sql`ALTER TABLE projects ADD COLUMN lifeAreas text`);
    console.log("✓ added projects.lifeAreas");
  } catch (e: any) {
    if (/duplicate column|exists/i.test(e.message)) console.log("· lifeAreas already exists — ok");
    else throw e;
  }
  const r: any = await db.execute(sql`SHOW COLUMNS FROM projects LIKE 'lifeAreas'`);
  console.log("verify:", JSON.stringify(r?.[0]?.[0] ?? r?.[0] ?? r));
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
