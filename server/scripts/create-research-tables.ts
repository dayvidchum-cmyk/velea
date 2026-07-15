/**
 * One-off, idempotent migration: create `profile_research` + `profile_dasha_periods`
 * (David's directives #1 and #2, 2026-07-14 — the per-profile canon house research and the
 * full birth→120y Vimshottari store). Matches drizzle/schema.ts.
 *
 * Run against the target DB (locally, or Railway prod with its DATABASE_URL):
 *   npx tsx server/scripts/create-research-tables.ts
 * Safe to run repeatedly — CREATE TABLE IF NOT EXISTS. Creates tables only; never drops,
 * never alters, never touches existing data (per the no-auto-force-migrate law).
 *
 * Sizing note: a timed profile stores ~66-75k dasha rows (the 9+81+729+6,561+59,049 base
 * cycle plus the second-cycle continuation to age 120); a no-time (Chandra) profile stores
 * ~800-900 (levels 1–3). At ~60 bytes/row that is ~4-5MB per timed profile in InnoDB —
 * fine at current user counts; revisit if profiles reach thousands.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS profile_research (
      id INT NOT NULL AUTO_INCREMENT,
      profileId INT NOT NULL,
      engineVersion VARCHAR(32) NOT NULL,
      inputHash VARCHAR(64) NOT NULL,
      research MEDIUMTEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_profile_research (profileId)
    )
  `);
  console.log("✅ profile_research table ready.");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS profile_dasha_periods (
      id INT NOT NULL AUTO_INCREMENT,
      profileId INT NOT NULL,
      level TINYINT NOT NULL,
      maha VARCHAR(8) NOT NULL,
      antar VARCHAR(8) NULL,
      pratyantar VARCHAR(8) NULL,
      sookshma VARCHAR(8) NULL,
      prana VARCHAR(8) NULL,
      startAt DATETIME(3) NOT NULL,
      endAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_dasha_lookup (profileId, level, startAt)
    )
  `);
  console.log("✅ profile_dasha_periods table ready.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
