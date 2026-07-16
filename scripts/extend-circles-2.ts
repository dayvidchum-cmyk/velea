/**
 * EXTEND CIRCLE ENUM: + 'mother', 'father' (David 2026-07-16: "Mom and dad should be
 * separated things. They are specific to the tradition. Very precise.") — and he's
 * right: mother = the 4th (mātṛ, Moon karaka) · father = the 9th (pitṛ, Sun karaka).
 * 'family' stays as the umbrella for everyone else under the roof.
 *
 * Hand-run against prod (Railway MYSQL_PUBLIC_URL) NEXT LAPTOP SESSION. Additive
 * values only; idempotent; no data touched.
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/extend-circles-2.ts
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

const FINAL = "'life_partner','husband','wife','boyfriend','girlfriend','lover','situationship','business_partner','children','mother','father','family','inner_circle','friends','acquaintances','mentors','mentees','boss','coworkers','clients','helpers','institutions','powerful','followers','pets','enemies','self','everyone_else'";

async function run() {
  const db = await getDb();
  if (!db) { console.error("no database connection"); process.exit(1); }
  const res = await db.execute(sql`
    SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'circle'
  `);
  const rows: any[] = Array.isArray(res[0]) ? (res[0] as any[]) : ((res as any).rows ?? []);
  const type: string = rows[0]?.COLUMN_TYPE ?? "";
  if (!type) { console.error("tasks.circle not found"); process.exit(1); }
  if (type.includes("'mother'") && type.includes("'father'")) {
    console.log("· mother/father already in the enum — skipped"); process.exit(0);
  }
  await db.execute(sql.raw(`ALTER TABLE tasks MODIFY COLUMN circle ENUM(${FINAL}) NULL`));
  console.log("✅ tasks.circle now includes mother (4th) and father (9th) — twenty-eight circles.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
