/**
 * One-off, idempotent migration: create the `horoscopes` table (the "pick a date" premium
 * reading — immutable purchased snapshots + notes). Matches drizzle/schema.ts `horoscopes`.
 * Run against the target DB (locally, or Railway prod with its DATABASE_URL):
 *   npx tsx server/scripts/create-horoscopes-table.ts
 * Safe to run repeatedly — CREATE TABLE IF NOT EXISTS.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS horoscopes (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      profileId INT NOT NULL,
      readingDate VARCHAR(10) NOT NULL,
      promptVersion VARCHAR(64) NOT NULL,
      model VARCHAR(48) NOT NULL,
      content TEXT NOT NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_horoscope (profileId, readingDate)
    )
  `);
  console.log("✅ horoscopes table ready.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
