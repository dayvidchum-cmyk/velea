/**
 * THE LOCATION MODEL — schema (DAVID-RUN, per the no-auto-migrate law).
 *
 * LOCATION_RESOLVER_SPEC.md §2, approved 2026-07-18. Two additions:
 *   1. profiles.hometown{City,Lat,Lon,Timezone} — the day-layer default when not traveling
 *      (resolver tier 3). Backfilled from each profile's birth location (David's Q5: yes),
 *      so nothing changes for non-travelers until they edit it.
 *   2. profile_day_locations — sparse per-profile-per-date overrides ("on THIS date I was in
 *      Tokyo"); powers the pick-a-date "where were you?" prompt (resolver tier 1, phase 5).
 *
 * Run:  DATABASE_URL="<prod url>" npx tsx scripts/add-location-model.ts
 * Idempotent — column-existence checks + CREATE TABLE IF NOT EXISTS; safe to run twice.
 * IMPORTANT: run this BEFORE deploying the commit that adds these columns to schema.ts —
 * drizzle selects every declared column, so code-first would break profile reads.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
  const conn = await mysql.createConnection(url);

  const [db] = await conn.execute(`SELECT DATABASE() AS db`);
  const dbName = (db as any[])[0].db;

  const hasColumn = async (table: string, col: string) => {
    const [rows] = await conn.execute(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, col],
    );
    return (rows as any[])[0].n > 0;
  };

  const cols: Array<[string, string]> = [
    ["hometownCity", "VARCHAR(128) NULL"],
    ["hometownLat", "VARCHAR(24) NULL"],
    ["hometownLon", "VARCHAR(24) NULL"],
    ["hometownTimezone", "VARCHAR(64) NULL"],
  ];
  for (const [name, ddl] of cols) {
    if (await hasColumn("profiles", name)) {
      console.log(`profiles.${name}: exists ✓`);
    } else {
      await conn.execute(`ALTER TABLE profiles ADD COLUMN ${name} ${ddl}`);
      console.log(`profiles.${name}: ADDED ✓`);
    }
  }

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS profile_day_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      profileId INT NOT NULL,
      onDate VARCHAR(10) NOT NULL,
      city VARCHAR(128) NOT NULL,
      lat VARCHAR(24) NOT NULL,
      lon VARCHAR(24) NOT NULL,
      timezone VARCHAR(64) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_profile_date (profileId, onDate),
      KEY idx_profile (profileId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  const [t] = await conn.execute(`SHOW TABLES LIKE 'profile_day_locations'`);
  console.log("profile_day_locations:", (t as any[]).length ? "EXISTS ✓" : "MISSING ✗");

  // Q5 backfill: hometown ← birth location, only where hometown is still empty and a birth
  // location exists. Idempotent by construction (the WHERE clause).
  const [res] = await conn.execute(`
    UPDATE profiles
       SET hometownCity = birthLocationCity,
           hometownLat = birthLocationLat,
           hometownLon = birthLocationLon,
           hometownTimezone = birthTimezone
     WHERE hometownLat IS NULL
       AND birthLocationLat IS NOT NULL
       AND birthLocationLon IS NOT NULL
  `);
  console.log(`hometown backfill: ${(res as any).affectedRows} profile(s) seeded from birth location`);

  await conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
