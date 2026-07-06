/**
 * LOCAL additive schema sync: for every table in drizzle/schema.ts, find columns
 * the schema declares but this laptop's database is missing, and ADD only those.
 * NEVER drops or alters existing columns — purely additive, non-destructive.
 * Types + nullability come straight from the drizzle column definitions.
 *
 * This closes the drift (e.g. the Meridian `mcLongitude` columns) that was
 * erroring every logged-in query. Localhost-only.
 *
 * Run:  npx tsx server/scripts/sync-missing-columns.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "../../drizzle/schema.js";

async function main() {
  const u = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1", "::1"].includes(u.hostname)) {
    throw new Error(`Refusing to run: host is '${u.hostname}', not localhost.`);
  }
  const dbName = u.pathname.replace(/^\//, "");
  const conn = await mysql.createConnection({
    host: u.hostname, port: Number(u.port || 3306),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: dbName,
  });

  // Actual columns per table in the DB.
  const [rows]: any = await conn.query(
    "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=?",
    [dbName]
  );
  const dbCols = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!dbCols.has(r.TABLE_NAME)) dbCols.set(r.TABLE_NAME, new Set());
    dbCols.get(r.TABLE_NAME)!.add(r.COLUMN_NAME);
  }

  const plan: string[] = [];
  for (const exp of Object.values(schema)) {
    let cfg: ReturnType<typeof getTableConfig>;
    try { cfg = getTableConfig(exp as any); } catch { continue; } // skip non-tables (enums, relations)
    const tableName = cfg.name;
    const have = dbCols.get(tableName);
    if (!have) { console.log(`(skip) table '${tableName}' not in DB — additive sync won't create tables.`); continue; }
    for (const col of cfg.columns) {
      const name = col.name;
      if (have.has(name)) continue;
      const sqlType = col.getSQLType();
      const nullable = col.notNull ? "NOT NULL" : "NULL";
      // Only safe to auto-add a NOT NULL column if it has a default; otherwise add as NULL to avoid failing on existing rows.
      const safeNull = col.notNull && col.default === undefined ? "NULL" : nullable;
      plan.push(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name}\` ${sqlType} ${safeNull}`);
      console.log(`+ ${tableName}.${name} (${sqlType} ${safeNull})`);
    }
  }

  if (plan.length === 0) { console.log(`✓ no missing columns — schema and ${dbName} agree.`); await conn.end(); return; }
  for (const stmt of plan) await conn.query(stmt);
  console.log(`✓ added ${plan.length} missing column(s) to ${dbName}.`);
  await conn.end();
}
main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
