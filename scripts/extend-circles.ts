/**
 * EXTEND CIRCLE ENUM: + 'children', 'pets', 'mentors', 'mentees', 'followers' (David 2026-07-16).
 * Hand-run against prod (Railway MYSQL_PUBLIC_URL). MODIFY COLUMN keeps every existing
 * value and all data — additive values only. Idempotent — skips if already extended.
 *
 * The engine's rooms for the newcomers (classical):
 *   children → the 5th (children & creations)
 *   mentees  → the 5th too (one's students ARE 5th-house)
 *   mentors  → the 9th (the guru), riding the parents & roots theme
 *   pets     → the 6th (small animals), riding the health & vitality theme
 *   followers→ the 11th (the audience, gains, large networks), riding recognition
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/extend-circles.ts
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
  if (["'children'", "'pets'", "'mentors'", "'mentees'", "'followers'"].every((v) => type.includes(v))) {
    console.log("· all four already in the enum — skipped"); process.exit(0);
  }
  await db.execute(sql`
    ALTER TABLE tasks MODIFY COLUMN circle
    ENUM('life_partner','children','family','best_friends','inner_circle','friends','mentors','mentees','coworkers','clients','followers','pets','self','everyone_else') NULL
  `);
  console.log("✅ tasks.circle now includes children, pets, mentors, mentees, followers — all existing values and data preserved.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
