/**
 * One-off, idempotent migration: add the `lifeArea` column to `horoscopes` and widen the unique
 * key to (profileId, readingDate, lifeArea) — so each life area a user reveals for a date is its
 * own immutable purchase (eclipse×Career and eclipse×Money coexist). Existing whole-day snapshots
 * become lifeArea = 'day' (the DEFAULT), so nothing is lost or overwritten.
 *
 * Run against the target DB (Railway prod with its DATABASE_URL):
 *   DATABASE_URL='mysql://…' npx tsx server/scripts/add-horoscope-lifearea.ts
 *
 * Idempotency is done by ATTEMPTING each change and catching the "already exists" error — NOT by
 * pre-querying information_schema (the previous version parsed that query's result wrong, falsely
 * reported "already present," and never added the column). This try/catch form can't misfire: the
 * column/key either gets added, or the ALTER errors with a duplicate code we recognize.
 *
 * NEVER a drizzle-kit push/force (see memory: velea-no-auto-force-migrate) — a plain, reviewed ALTER.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

const isDup = (e: unknown, codes: RegExp) => codes.test(String((e as any)?.cause?.code ?? (e as any)?.code ?? e));

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  // 1. Add the column. ER_DUP_FIELDNAME (1060) = it's already there → fine.
  try {
    await db.execute(sql`ALTER TABLE horoscopes ADD COLUMN lifeArea VARCHAR(16) NOT NULL DEFAULT 'day' AFTER readingDate`);
    console.log("✅ added column horoscopes.lifeArea (existing rows backfilled to 'day').");
  } catch (e) {
    if (isDup(e, /1060|ER_DUP_FIELDNAME|Duplicate column/i)) console.log("• column horoscopes.lifeArea already present — skipping.");
    else throw e;
  }

  // 2. Drop the old 2-column unique if it exists (so we can recreate it with lifeArea).
  //    ER_CANT_DROP_FIELD_OR_KEY (1091) = it wasn't there → fine.
  try {
    await db.execute(sql`ALTER TABLE horoscopes DROP INDEX uniq_horoscope`);
    console.log("✅ dropped old uniq_horoscope.");
  } catch (e) {
    if (isDup(e, /1091|ER_CANT_DROP_FIELD_OR_KEY|check that column\/key exists/i)) console.log("• no old uniq_horoscope to drop — skipping.");
    else throw e;
  }

  // 3. Add the 3-column unique. ER_DUP_KEYNAME (1061) = it's already the new shape → fine.
  try {
    await db.execute(sql`ALTER TABLE horoscopes ADD UNIQUE KEY uniq_horoscope (profileId, readingDate, lifeArea)`);
    console.log("✅ unique key uniq_horoscope now (profileId, readingDate, lifeArea).");
  } catch (e) {
    if (isDup(e, /1061|ER_DUP_KEYNAME|Duplicate key name/i)) console.log("• unique key already includes lifeArea — skipping.");
    else throw e;
  }

  // 4. Verify — SELECT the column so success is PROVEN, not assumed (the whole point of this rewrite).
  await db.execute(sql`SELECT lifeArea FROM horoscopes LIMIT 1`);
  console.log("🪐 verified: horoscopes.lifeArea is queryable. Migration complete.");
  process.exit(0);
}

main().catch((e) => { console.error("MIGRATION FAILED:", e); process.exit(1); });
