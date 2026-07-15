/**
 * ADD TASK PROGRESS COLUMNS — David runs this BY HAND against prod (Railway
 * MYSQL_PUBLIC_URL), per the schema pause-point law. ADDITIVE ONLY: two nullable
 * columns on tasks; no data is touched, nothing is dropped. Idempotent — safe to
 * run twice.
 *
 *   completionPct INT NULL      — user-set completion % for tasks WITHOUT subtasks
 *                                 (with subtasks, the % is derived and this is ignored)
 *   effortSize ENUM NULL        — 'quick' | 'sitting' | 'long': how much of a day the
 *                                 task asks for (the word for the middle is David's to
 *                                 rename before the UI ships)
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/add-task-progress-columns.ts
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) { console.error("no database connection"); process.exit(1); }
  const res = await db.execute(sql`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'
      AND COLUMN_NAME IN ('completionPct', 'effortSize')
  `);
  const rows: any[] = Array.isArray(res[0]) ? (res[0] as any[]) : ((res as any).rows ?? []);
  const have = new Set(rows.map((r: any) => r.COLUMN_NAME));

  if (!have.has("completionPct")) {
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN completionPct INT NULL`);
    console.log("✅ added tasks.completionPct (INT NULL)");
  } else console.log("· completionPct already present — skipped");

  if (!have.has("effortSize")) {
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN effortSize ENUM('quick','sitting','long') NULL`);
    console.log("✅ added tasks.effortSize (ENUM quick/sitting/long, NULL)");
  } else console.log("· effortSize already present — skipped");

  console.log("done — additive only, no data touched.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
