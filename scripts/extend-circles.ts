/**
 * RESHAPE THE CIRCLE ENUM to David's final roster (2026-07-16). Hand-run against
 * prod (Railway MYSQL_PUBLIC_URL). Idempotent.
 *
 * Changes from the first run:
 *   CUT  best_friends (same thing as inner_circle — rows migrate to inner_circle first)
 *   ADD  children (5th) · mentees (5th, one's students) · mentors (9th, the guru)
 *        pets (6th) · followers (11th, the audience) · enemies (6th, shatru)
 *        acquaintances (11th, the wider network)
 *        business_partner (7th — ALL one-to-one partnership) · helpers (6th — the
 *        people who serve you: accountant, dentist, plumber) · institutions (10th —
 *        authority: the IRS, the bank, the landlord)
 *
 * Final roster (18): life_partner · business_partner · children · family ·
 * inner_circle · friends · acquaintances · mentors · mentees · coworkers · clients ·
 * helpers · institutions · followers · pets · enemies · self · everyone_else
 *
 * Run:  DATABASE_URL=<railway MYSQL_PUBLIC_URL> npx tsx scripts/extend-circles.ts
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

const FINAL = "'life_partner','business_partner','children','family','inner_circle','friends','acquaintances','mentors','mentees','coworkers','clients','helpers','institutions','followers','pets','enemies','self','everyone_else'";

async function run() {
  const db = await getDb();
  if (!db) { console.error("no database connection"); process.exit(1); }
  const res = await db.execute(sql`
    SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'circle'
  `);
  const rows: any[] = Array.isArray(res[0]) ? (res[0] as any[]) : ((res as any).rows ?? []);
  const type: string = rows[0]?.COLUMN_TYPE ?? "";
  if (!type) { console.error("tasks.circle not found — run add-task-circle-column.ts first"); process.exit(1); }
  if (type.includes("'acquaintances'") && !type.includes("'best_friends'")) {
    console.log("· enum already at the final roster — skipped"); process.exit(0);
  }
  // 1. best_friends rows fold into inner_circle (same thing, David's ruling)
  const upd: any = await db.execute(sql`UPDATE tasks SET circle = 'inner_circle' WHERE circle = 'best_friends'`);
  console.log(`· migrated best_friends → inner_circle (${(upd as any)?.rowsAffected ?? (Array.isArray(upd) ? (upd[0] as any)?.affectedRows : 0) ?? 0} rows)`);
  // 2. reshape to the final fifteen (all existing values preserved except best_friends)
  await db.execute(sql.raw(`ALTER TABLE tasks MODIFY COLUMN circle ENUM(${FINAL}) NULL`));
  console.log("✅ tasks.circle is the final eighteen — data preserved, best_friends folded in.");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
