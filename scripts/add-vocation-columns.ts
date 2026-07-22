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

// instrument is a COMMA-SEPARATED list of tags (hands,voice,words,body,mind) — a person's work can
// use more than one instrument. VARCHAR(64) holds all five. If the column already exists narrower
// (the first v913 run made it VARCHAR(16)), it is widened below — safe, no data loss on a VARCHAR grow.
const COLUMNS: { name: string; ddl: string }[] = [
  { name: "instrument", ddl: "ADD COLUMN instrument VARCHAR(64) NULL" },
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

  // Widen `instrument` to VARCHAR(64) if an earlier run created it narrower — multi-instrument
  // profiles store a comma list ("hands,voice,words,mind" = 22 chars) that a VARCHAR(16) rejects.
  const [len] = await conn.execute(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'instrument'`,
    [dbName],
  );
  const curLen = (len as any[])[0]?.n ?? 0;
  if (curLen < 64) {
    await conn.execute(`ALTER TABLE profiles MODIFY instrument VARCHAR(64) NULL`);
    console.log(`profiles.instrument: WIDENED ${curLen} → 64 ✓`);
  } else {
    console.log(`profiles.instrument: width ${curLen} ✓ (nothing to do)`);
  }

  console.log("\nDone. Safe to deploy the code that declares these columns.");
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
