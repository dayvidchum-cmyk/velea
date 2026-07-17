/**
 * MULTI-CIRCLE MIGRATION (David 2026-07-17: "a user should be able to tag more than one
 * bubble for a person. for anything. right?") — two idempotent steps:
 *  1. RE-ASSERT the 28-value circle enum (the 2:44 AM "Visit Mom" insert failure suggests
 *     the extend-circles-2 run may not have completed — this makes it right either way).
 *  2. ADD `circles` TEXT column (JSON array of circle keys) for multi-tagging.
 * Run by hand: DATABASE_URL=<railway url, in YOUR terminal> npx tsx scripts/add-task-circles-column.ts
 */
import mysql from "mysql2/promise";

const FINAL = "'life_partner','husband','wife','boyfriend','girlfriend','lover','situationship','business_partner','children','mother','father','family','inner_circle','friends','acquaintances','mentors','mentees','boss','coworkers','clients','helpers','institutions','powerful','followers','pets','enemies','self','everyone_else'";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (in YOUR terminal — never in chat).");
  const conn = await mysql.createConnection(url);

  const [cols]: any = await conn.query("SHOW COLUMNS FROM tasks LIKE 'circle'");
  const type: string = cols?.[0]?.Type ?? "";
  if (type.includes("'mother'") && type.includes("'father'")) {
    console.log("1/2 circle enum: already carries mother + father ✓");
  } else {
    await conn.query(`ALTER TABLE tasks MODIFY COLUMN circle ENUM(${FINAL}) NULL`);
    console.log("1/2 circle enum: EXTENDED to 28 values ✓ (this was the Visit-Mom fix)");
  }

  const [c2]: any = await conn.query("SHOW COLUMNS FROM tasks LIKE 'circles'");
  if (c2?.length) {
    console.log("2/2 circles column: already exists ✓");
  } else {
    await conn.query("ALTER TABLE tasks ADD COLUMN circles TEXT NULL AFTER circle");
    console.log("2/2 circles column: ADDED ✓ (multi-tagging unlocked)");
  }

  await conn.end();
  console.log("Done. Tell Claude: ran it — and v644 ships the multi-bubble picker.");
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
