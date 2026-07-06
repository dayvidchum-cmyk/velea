/**
 * One-off LOCAL migration: rename the localhost database `kala` -> `velea`.
 * Moves every base table in-place via a single atomic RENAME TABLE (no data copy),
 * so local finally matches the `velea` name already in .env.
 * Safe by construction:
 *   - refuses to run unless the DB host is localhost (never a remote/deployed DB)
 *   - refuses if `velea` already has tables (won't overwrite)
 *   - refuses if `kala` has views/routines/triggers (RENAME TABLE can't move those)
 *   - leaves the now-empty `kala` database in place as a backup
 * Credentials come from .env via dotenv — never printed.
 *
 * Run:  npx tsx server/scripts/rename-db-local.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const raw = process.env.DATABASE_URL || "";
  const u = new URL(raw);

  if (!["localhost", "127.0.0.1", "::1"].includes(u.hostname)) {
    throw new Error(`Refusing to run: host is '${u.hostname}', not localhost. This script is LOCAL-ONLY.`);
  }

  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  });

  const [dbs]: any = await conn.query("SHOW DATABASES");
  const names = dbs.map((r: any) => Object.values(r)[0]);
  if (!names.includes("kala")) throw new Error("Source DB 'kala' not found — nothing to rename.");

  const [meta]: any = await conn.query(
    "SELECT DEFAULT_CHARACTER_SET_NAME cs, DEFAULT_COLLATION_NAME col FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='kala'"
  );
  const cs = meta[0].cs, col = meta[0].col;

  const [tbls]: any = await conn.query(
    "SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA='kala' ORDER BY TABLE_NAME"
  );
  const baseTables = tbls.filter((t: any) => t.TABLE_TYPE === "BASE TABLE").map((t: any) => t.TABLE_NAME);
  const views = tbls.filter((t: any) => t.TABLE_TYPE === "VIEW").map((t: any) => t.TABLE_NAME);
  const [routs]: any = await conn.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA='kala'");
  const [trigs]: any = await conn.query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='kala'");
  console.log(`kala: ${baseTables.length} tables, ${views.length} views, ${routs.length} routines, ${trigs.length} triggers (charset ${cs}/${col})`);
  if (views.length || routs.length || trigs.length) {
    throw new Error("kala has views/routines/triggers — RENAME TABLE won't move these. Stop and handle manually.");
  }

  const [existing]: any = await conn.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA='velea'");
  if (existing[0].n > 0) throw new Error("Target DB 'velea' already has tables — refusing to overwrite.");

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`velea\` CHARACTER SET ${cs} COLLATE ${col}`);
  const clause = baseTables.map((t: string) => `\`kala\`.\`${t}\` TO \`velea\`.\`${t}\``).join(", ");
  await conn.query(`RENAME TABLE ${clause}`);

  const [prof]: any = await conn.query("SELECT COUNT(*) n FROM `velea`.`profiles`");
  console.log(`✓ moved ${baseTables.length} tables kala → velea. velea.profiles = ${prof[0].n} rows. (empty 'kala' left as backup)`);

  await conn.end();
}
main().then(() => process.exit(0)).catch((e) => { console.error("MIGRATION FAILED:", e.message); process.exit(1); });
