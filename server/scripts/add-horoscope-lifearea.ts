/**
 * One-off, idempotent migration: add the `lifeArea` column to `horoscopes` and widen the unique
 * key to (profileId, readingDate, lifeArea) — so each life area a user reveals for a date is its
 * own immutable purchase (eclipse×Career and eclipse×Money coexist). Existing whole-day snapshots
 * become lifeArea = 'day' (the DEFAULT), so nothing is lost or overwritten.
 *
 * Run against the target DB (Railway prod with its DATABASE_URL):
 *   npx tsx server/scripts/add-horoscope-lifearea.ts
 * Safe to run repeatedly — each step checks whether it's already applied before touching anything.
 * NEVER a drizzle-kit push/force (see memory: velea-no-auto-force-migrate) — this is a plain,
 * reviewed ALTER that only adds a column and swaps a unique index.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  // 1. Add the column if it isn't there yet (default 'day' backfills every legacy row).
  const [{ n: hasCol }] = (await db.execute(sql`
    SELECT COUNT(*) AS n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'horoscopes' AND COLUMN_NAME = 'lifeArea'
  `)) as any as [{ n: number }];
  if (Number(hasCol) === 0) {
    await db.execute(sql`ALTER TABLE horoscopes ADD COLUMN lifeArea VARCHAR(16) NOT NULL DEFAULT 'day' AFTER readingDate`);
    console.log("✅ added column horoscopes.lifeArea (existing rows backfilled to 'day').");
  } else {
    console.log("• column horoscopes.lifeArea already present — skipping.");
  }

  // 2. Swap the unique key from (profileId, readingDate) to (profileId, readingDate, lifeArea).
  const [{ n: hasOldKey }] = (await db.execute(sql`
    SELECT COUNT(*) AS n FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'horoscopes' AND INDEX_NAME = 'uniq_horoscope'
      AND COLUMN_NAME = 'lifeArea'
  `)) as any as [{ n: number }];
  if (Number(hasOldKey) === 0) {
    // Drop the 2-column unique (it exists on the old schema) and recreate it with lifeArea.
    await db.execute(sql`ALTER TABLE horoscopes DROP INDEX uniq_horoscope`);
    await db.execute(sql`ALTER TABLE horoscopes ADD UNIQUE KEY uniq_horoscope (profileId, readingDate, lifeArea)`);
    console.log("✅ unique key uniq_horoscope now (profileId, readingDate, lifeArea).");
  } else {
    console.log("• unique key already includes lifeArea — skipping.");
  }

  console.log("🪐 horoscopes life-area migration complete.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
