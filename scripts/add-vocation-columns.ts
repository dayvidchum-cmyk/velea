/**
 * THE VOCATION FIELD — schema (DAVID-RUN, per the no-auto-migrate law).
 *
 * Two columns:
 *   · profiles.instrument   VARCHAR(16) NULL   — hands|voice|words|body|mind
 *   · profiles.vocationNote VARCHAR(200) NULL  — optional free-text detail
 *
 * WHY (2026-07-21). The reading kept literalizing a day-star's craft image onto non-makers
 * ("work with your hands" for a person who does not). The chart can give craft APTITUDE but never
 * the FACT of a trade — asserting it is the founding wound. The only honest source is the person's
 * own word. This column carries it, so the reading reaches the REAL instrument (the hands for a PMU
 * artist, the voice for a teacher, words for a writer) instead of guessing — and stays fully
 * abstract when unset. Admin-only for now: controlled testing on known profiles first.
 *
 * NULL = unset → the safe default-abstract; the reading never invents a trade. Deliberately NOT
 * backfilled — a backfilled instrument would be a guessed trade, the exact thing this ends.
 *
 * Run:  DATABASE_URL="<prod url>" npx tsx scripts/add-vocation-columns.ts
 *
 * Idempotent — column-existence check per column; safe to run twice. Adds nullable columns and
 * writes no rows, so it cannot lose data.
 *
 * ORDERING (this has bitten this repo — the cacheDate outage): run this BEFORE deploying the commit
 * that declares these columns in drizzle/schema.ts. Drizzle selects every declared column, so
 * shipping the code first makes every profile read fail against a database that has not been
 * migrated.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const COLUMNS: { name: string; ddl: string }[] = [
  { name: "instrument", ddl: "ADD COLUMN instrument VARCHAR(16) NULL" },
  { name: "vocationNote", ddl: "ADD COLUMN vocationNote VARCHAR(200) NULL" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
  if (/localhost|127\.0\.0\.1/.test(url)) {
    console.log("NOTE: this DATABASE_URL is local. The local .env is stale by standing rule —");
    console.log("      prod config lives in Railway. Continuing against local anyway.\n");
  }
  const conn = await mysql.createConnection(url);
  const [db] = await conn.execute(`SELECT DATABASE() AS db`);
  const dbName = (db as any[])[0].db;

  for (const col of COLUMNS) {
    const [rows] = await conn.execute(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = ?`,
      [dbName, col.name],
    );
    if ((rows as any[])[0].n > 0) {
      console.log(`profiles.${col.name}: exists ✓ (nothing to do)`);
    } else {
      await conn.execute(`ALTER TABLE profiles ${col.ddl}`);
      console.log(`profiles.${col.name}: ADDED ✓`);
    }
  }

  console.log("\nDone. Safe to deploy the code that declares these columns.");
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
