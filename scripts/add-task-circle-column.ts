/**
 * ADD TASK CIRCLE COLUMN — David runs this BY HAND against prod (Railway
 * MYSQL_PUBLIC_URL), per the schema pause-point law. ADDITIVE ONLY: one nullable
 * column on tasks; no data is touched, nothing is dropped. Idempotent — safe to
 * run twice.
 *
 *   circle ENUM NULL — WHO the task touches (David's taxonomy, 2026-07-16):
 *     'life_partner'  → the marriage/union rooms
 *     'family'        → parents & roots, home & land
 *     'best_friends'  → the inner circle (3rd house — blood + chosen family)
 *     'inner_circle'  → same axis, the closest ring
 *     'friends'       → the wider chosen family
 *     'coworkers'     → career & the daily craft
 *     'clients'       → wealth/income + career
 *     'self'          → identity + health & vitality
 *     'everyone_else' → the public, how you're received
 *
 *   The engine maps each circle to its life-theme rooms; when a day's OPEN WINDOWS
 *   light those rooms, tasks touching that circle rise in Aligned (a soft lift,
 *   never a filter). UI pills + scorer ship AFTER this runs.
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/add-task-circle-column.ts
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) { console.error("no database connection"); process.exit(1); }
  const res = await db.execute(sql`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'
      AND COLUMN_NAME = 'circle'
  `);
  const rows: any[] = Array.isArray(res[0]) ? (res[0] as any[]) : ((res as any).rows ?? []);
  const have = new Set(rows.map((r: any) => r.COLUMN_NAME));

  if (!have.has("circle")) {
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN circle ENUM('life_partner','family','best_friends','inner_circle','friends','coworkers','clients','self','everyone_else') NULL`);
    console.log("✅ added tasks.circle (ENUM of David's nine circles, NULL)");
  } else console.log("· circle already present — skipped");

  console.log("done — additive only, no data touched.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
