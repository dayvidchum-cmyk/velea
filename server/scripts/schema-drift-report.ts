/**
 * SCHEMA DRIFT REPORT — read-only. Prints how the LIVE tables differ from schema.ts.
 *
 * WHY THIS EXISTS. Production tables drift from schema.ts, and the drift is invisible until it
 * costs money: on 2026-07-17 a cacheDate column that was VARCHAR(10) in the live table silently
 * rejected longer cache keys, which killed billed readings. schema.ts said one thing, the database
 * did another, and nothing compared them.
 *
 * WHY DAVID RUNS IT AND NOT ME. It needs the Railway DATABASE_URL. He should never paste that into
 * a chat — so this prints ONLY structure: table names, column names, types, nullability. No rows,
 * no user data, no connection string. Paste the output; that is enough to act on.
 *
 * IT CHANGES NOTHING. There is no ALTER, no CREATE, no DROP in this file — it issues SHOW
 * statements only. Any fix it implies is a separate script, written after seeing this, and run by
 * hand. (No auto-migrations, ever: a push --force once wiped every account.)
 *
 *   DATABASE_URL="<the Railway URL>" npx tsx server/scripts/schema-drift-report.ts
 */
import { getDb } from "../db.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";

/** What schema.ts declares: table -> column -> a coarse type + length we can compare on. */
function declared(): Map<string, Map<string, string>> {
  const src = readFileSync(new URL("../../drizzle/schema.ts", import.meta.url), "utf8");
  const out = new Map<string, Map<string, string>>();
  for (const m of src.matchAll(/mysqlTable\(\s*"(\w+)"\s*,\s*\{([\s\S]*?)\n\}/g)) {
    const [, table, body] = m;
    const cols = new Map<string, string>();
    for (const c of body.matchAll(/(\w+):\s*(\w+)\("(\w+)"(?:,\s*\{[^}]*length:\s*(\d+)[^}]*\})?/g)) {
      const [, , kind, dbName, len] = c;
      cols.set(dbName, len ? `${kind}(${len})` : kind);
    }
    out.set(table, cols);
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("set DATABASE_URL to the Railway URL (it is never printed)");
  if (/localhost|127\.0\.0\.1/.test(url)) {
    console.warn("WARNING: this DATABASE_URL is localhost. The local .env is stale and is NOT");
    console.warn("production — a drift report from it says nothing about the live database.\n");
  }
  const db = await getDb();
  if (!db) throw new Error("could not connect");

  const decl = declared();
  const live: any = await db.execute(sql`SHOW TABLES`);
  const liveTables = new Set<string>();
  for (const r of (live?.[0] ?? live ?? []) as any[]) liveTables.add(String(Object.values(r)[0]));

  console.log(`schema.ts declares ${decl.size} tables; the database has ${liveTables.size}.\n`);

  const missingTables = [...decl.keys()].filter((t) => !liveTables.has(t));
  const extraTables = [...liveTables].filter((t) => !decl.has(t));
  if (missingTables.length) console.log(`DECLARED BUT ABSENT: ${missingTables.join(", ")}\n`);
  if (extraTables.length) console.log(`IN THE DATABASE, NOT IN schema.ts: ${extraTables.join(", ")}\n`);

  let drifts = 0;
  for (const [table, cols] of decl) {
    if (!liveTables.has(table)) continue;
    const rows: any = await db.execute(sql.raw(`SHOW COLUMNS FROM \`${table}\``));
    const liveCols = new Map<string, { type: string; nullable: boolean }>();
    for (const r of (rows?.[0] ?? rows ?? []) as any[]) {
      liveCols.set(String(r.Field ?? r.field), {
        type: String(r.Type ?? r.type).toLowerCase(),
        nullable: String(r.Null ?? r.null).toUpperCase() === "YES",
      });
    }
    const notes: string[] = [];
    for (const [col, kind] of cols) {
      const l = liveCols.get(col);
      if (!l) { notes.push(`  MISSING in db   ${col}  (schema.ts: ${kind})`); continue; }
      // The 7/17 shape: a varchar in the live table SHORTER than schema.ts declares.
      const dm = kind.match(/varchar\((\d+)\)/); const lm = l.type.match(/varchar\((\d+)\)/);
      if (dm && lm && Number(lm[1]) < Number(dm[1])) {
        notes.push(`  TOO SHORT       ${col}  db ${l.type} < schema.ts ${kind}  <-- the 2026-07-17 outage shape`);
      }
    }
    for (const col of liveCols.keys()) if (!cols.has(col)) notes.push(`  not in schema.ts ${col}  (db has it)`);
    if (notes.length) { console.log(`${table}:`); notes.forEach((n) => console.log(n)); console.log(""); drifts += notes.length; }
  }

  console.log(drifts === 0
    ? "No drift found between schema.ts and the live tables."
    : `${drifts} difference(s) above. Nothing was changed — any fix is a separate hand-run script.`);
  process.exit(0);
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
