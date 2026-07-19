/**
 * LOCAL DEV MIRROR SYNC — additive only, never drops, never for prod.
 *
 * The deploy pipeline deliberately does NOT auto-migrate (no-auto-migrate law), so the local
 * dev DB drifts behind schema.ts whenever a feature's David-run script only ran on prod (or
 * vice versa). Drifted mirrors make local reproduction lie (2026-07-18: getTourState 500s from
 * a missing push_subscriptions table masked the real onboarding bugs). This reads the runtime
 * drizzle schema and emits CREATE TABLE / ADD COLUMN for anything missing. It never ALTERs
 * existing column types and never drops anything.
 *
 * Run:  npx tsx scripts/sync-local-dev-db.ts          (uses .env DATABASE_URL)
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { getTableConfig, MySqlTable } from "drizzle-orm/mysql-core";
import * as schema from "../drizzle/schema.js";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
  if (/railway|rlwy|proxy\.rlwy/.test(url)) { console.error("Refusing: DATABASE_URL looks like prod (Railway). This tool is for the LOCAL mirror only."); process.exit(1); }
  const conn = await mysql.createConnection(url);
  const [dbr] = await conn.execute(`SELECT DATABASE() AS db`);
  const dbName = (dbr as any[])[0].db;

  const tables = Object.values(schema).filter((v): v is MySqlTable => v instanceof MySqlTable);
  let created = 0, added = 0;

  for (const t of tables) {
    const cfg = getTableConfig(t);
    const [ex] = await conn.execute(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`, [dbName, cfg.name]);
    const colDdl = (c: (typeof cfg.columns)[number]) => {
      let ddl = `\`${c.name}\` ${c.getSQLType()}`;
      if (c.notNull) ddl += " NOT NULL";
      if (c.hasDefault && c.default !== undefined && typeof c.default !== "object") {
        ddl += ` DEFAULT ${typeof c.default === "string" ? `'${c.default}'` : c.default}`;
      } else if (c.hasDefault && (c as any).defaultFn == null && c.default === undefined) {
        // e.g. defaultNow()/onUpdateNow are SQL-level in drizzle; approximate for timestamps
        if (/timestamp/i.test(c.getSQLType())) ddl += " DEFAULT CURRENT_TIMESTAMP";
      }
      if ((c as any).autoIncrement) ddl += " AUTO_INCREMENT";
      return ddl;
    };
    if ((ex as any[])[0].n === 0) {
      const pk = cfg.columns.filter((c) => c.primary).map((c) => `\`${c.name}\``);
      const parts = cfg.columns.map(colDdl);
      if (pk.length) parts.push(`PRIMARY KEY (${pk.join(",")})`);
      await conn.execute(`CREATE TABLE \`${cfg.name}\` (${parts.join(", ")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      console.log(`CREATED table ${cfg.name} (${cfg.columns.length} cols)`);
      created++;
      continue;
    }
    for (const c of cfg.columns) {
      const [colEx] = await conn.execute(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, cfg.name, c.name]);
      if ((colEx as any[])[0].n === 0) {
        // Add as NULL-able regardless of schema notNull — existing rows can't satisfy NOT NULL
        // without a default; the app writes complete rows going forward.
        let ddl = `\`${c.name}\` ${c.getSQLType()}`;
        if (c.hasDefault && c.default !== undefined && typeof c.default !== "object") {
          ddl += ` DEFAULT ${typeof c.default === "string" ? `'${c.default}'` : c.default}`;
        }
        await conn.execute(`ALTER TABLE \`${cfg.name}\` ADD COLUMN ${ddl}`);
        console.log(`ADDED ${cfg.name}.${c.name} (${c.getSQLType()})`);
        added++;
      }
    }
  }
  console.log(`sync done: ${created} table(s) created, ${added} column(s) added — nothing dropped or altered.`);
  await conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
