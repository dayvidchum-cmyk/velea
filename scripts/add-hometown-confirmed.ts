/**
 * THE DOOR GATE — schema (DAVID-RUN, per the no-auto-migrate law).
 *
 * One column: profiles.hometownConfirmedAt (TIMESTAMP NULL).
 *
 * WHY IT HAS TO EXIST (2026-07-21). David's ruling was first written as "gate the readings whose
 * sky falls back to the birth city." Measured against the code, that gate would have fired for
 * ZERO profiles:
 *
 *   · add-location-model.ts backfilled hometown ← birth location for every existing profile
 *     (`WHERE hometownLat IS NULL`), and
 *   · server/routers/profiles.ts:531 seeds every NEW profile the same way, by design —
 *     "mirrors the migration's backfill so new profiles are never hometown-less".
 *
 * resolveDaySky checks `hasHometown` before the `birth` tier, so it always finds one: the birth
 * tier is unreachable and the `default` tier needs a profile with no birth location at all. The
 * seeding was correct for its own purpose — nobody should lose a sky because they never set a
 * hometown — but it means a stored hometown is NOT evidence that a human chose it. The signal the
 * gate needs does not exist anywhere in the schema, which is what this column adds.
 *
 * NULL = never asked. Stamped on EITHER answer: confirming and declining are both decisions, and a
 * decline is remembered so the door never asks twice (David's ruling, 2026-07-21). Deliberately
 * NOT backfilled — a backfill would mark every profile as confirmed by a human who was never asked,
 * which is the exact fiction this column exists to end.
 *
 * Run:  DATABASE_URL="<prod url>" npx tsx scripts/add-hometown-confirmed.ts
 *
 * Idempotent — column-existence check only; safe to run twice. Adds a nullable column and writes
 * no rows, so it cannot lose data.
 *
 * ORDERING (this is the part that has bitten this repo): run this BEFORE deploying the commit that
 * declares the column in drizzle/schema.ts. Drizzle selects every declared column, so shipping the
 * code first makes every profile read fail against a database that has not been migrated. Same
 * class as the v-cacheDate outage, where prod drifted from schema.ts and killed billed readings.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

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

  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'hometownConfirmedAt'`,
    [dbName],
  );
  const exists = (rows as any[])[0].n > 0;

  if (exists) {
    console.log("profiles.hometownConfirmedAt: exists ✓ (nothing to do)");
  } else {
    await conn.execute(`ALTER TABLE profiles ADD COLUMN hometownConfirmedAt TIMESTAMP NULL`);
    console.log("profiles.hometownConfirmedAt: ADDED ✓");
  }

  // Report the gate's real reach on THIS database, so the number comes from the data rather than
  // from an estimate in a message. Every unstamped profile is one that will be asked once.
  const [counts] = await conn.execute(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN hometownConfirmedAt IS NULL THEN 1 ELSE 0 END) AS unconfirmed,
      SUM(CASE WHEN hometownLat IS NOT NULL AND hometownLat = birthLocationLat
                AND (hometownLon <=> birthLocationLon) THEN 1 ELSE 0 END) AS hometown_equals_birth
    FROM profiles
  `);
  const c = (counts as any[])[0];
  console.log(`\nprofiles: ${c.total} total`);
  console.log(`  never asked (the door will ask once) : ${c.unconfirmed}`);
  console.log(`  hometown identical to birth city     : ${c.hometown_equals_birth}`);
  console.log(`\nThe second number is how many are reading a sky nobody chose — it is informational`);
  console.log(`only; the gate keys on the stamp, not on the comparison.`);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
