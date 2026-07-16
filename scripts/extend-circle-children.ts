/**
 * EXTEND CIRCLE ENUM: + 'children' (David 2026-07-16: "children should be added.
 * as in the user's offspring."). Hand-run against prod (Railway MYSQL_PUBLIC_URL).
 * MODIFY COLUMN keeps every existing value and all data — additive value only.
 * Idempotent — skips if 'children' is already in the enum.
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/extend-circle-children.ts
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) { console.error("no database connection"); process.exit(1); }
  const res = await db.execute(sql`
    SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'circle'
  `);
  const rows: any[] = Array.isArray(res[0]) ? (res[0] as any[]) : ((res as any).rows ?? []);
  const type = rows[0]?.COLUMN_TYPE ?? "";
  if (!type) { console.error("tasks.circle not found — run add-task-circle-column.ts first"); process.exit(1); }
  if (type.includes("'children'")) { console.log("· 'children' already in the enum — skipped"); process.exit(0); }
  await db.execute(sql`
    ALTER TABLE tasks MODIFY COLUMN circle
    ENUM('life_partner','children','family','best_friends','inner_circle','friends','coworkers','clients','self','everyone_else') NULL
  `);
  console.log("✅ tasks.circle now includes 'children' — all existing values and data preserved.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
