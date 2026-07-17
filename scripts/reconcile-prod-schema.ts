/**
 * RECONCILE PROD SCHEMA (audit 2026-07-17, H14) — makes the prod database match
 * drizzle/schema.ts for the tables that drifted (created by hand-run scripts / the retired
 * auto-push, never reconciled). READ-FIRST and IDEMPOTENT: every step inspects
 * information_schema before acting, only alters when needed, and NEVER drops a column,
 * table, or row of data. Safe to run repeatedly.
 *
 * Per the no-auto-force-migrate law, run BY HAND against prod (URL stays in your terminal):
 *   cd ~/projects/Velea
 *   DATABASE_URL='<railway MYSQL_PUBLIC_URL>' npx tsx scripts/reconcile-prod-schema.ts
 *
 * It supersedes the piecemeal scripts (widen-narrative-cache, add-task-circles-column,
 * extend-circles-2, add-horoscope-lifearea, create-*-table) by doing all the reconciliation
 * in one reviewed pass. Those remain runnable but this is the single source of truth.
 *
 * NOT INCLUDED — the H8 location-keyed panchang cache. That is a coordinated CODE + schema
 * change (the read/write path must key by location too), not a pure reconciliation; forcing
 * only the schema half would break the daily read. It is its own task.
 */
import { getDb } from "../server/db.js";
import { sql } from "drizzle-orm";

// PROD's exact 28-value circle enum order (extend-circles-2.ts).
const CIRCLE_ENUM = "'life_partner','husband','wife','boyfriend','girlfriend','lover','situationship','business_partner','children','mother','father','family','inner_circle','friends','acquaintances','mentors','mentees','boss','coworkers','clients','helpers','institutions','powerful','followers','pets','enemies','self','everyone_else'";

let db: any;
const rowsOf = (res: any): any[] => (Array.isArray(res?.[0]) ? res[0] : (res?.rows ?? []));

async function tableExists(name: string): Promise<boolean> {
  const r = await db.execute(sql`SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${name} LIMIT 1`);
  return rowsOf(r).length > 0;
}
async function columnType(table: string, column: string): Promise<string | null> {
  const r = await db.execute(sql`SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}`);
  return rowsOf(r)[0]?.t ?? null;
}
/** Columns an index covers, in order; [] if the index does not exist. */
async function indexColumns(table: string, indexName: string): Promise<string[]> {
  const r = await db.execute(sql`SELECT COLUMN_NAME AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND INDEX_NAME = ${indexName} ORDER BY SEQ_IN_INDEX`);
  return rowsOf(r).map((x) => x.c);
}

async function step(label: string, fn: () => Promise<string>) {
  try { console.log(`  ${await fn()}  — ${label}`); }
  catch (e: any) { console.log(`  ✗ FAILED — ${label}: ${e?.message ?? e}`); }
}

async function main() {
  db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }
  console.log("\nRECONCILE PROD SCHEMA — read-first, idempotent, non-destructive.\n");

  // ── 1. Missing tables (rode the retired auto-push; no repo creator) ──────────
  console.log("— TABLES —");
  await step("waitlist", async () => {
    if (await tableExists("waitlist")) return "·";
    await db.execute(sql.raw(`CREATE TABLE waitlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      source VARCHAR(64) NOT NULL DEFAULT 'landing',
      referralCode VARCHAR(64),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`));
    return "✓ created";
  });
  await step("referralCodes", async () => {
    if (await tableExists("referralCodes")) return "·";
    await db.execute(sql.raw(`CREATE TABLE referralCodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      ownerName VARCHAR(64) NOT NULL,
      ownerUserId INT,
      newUserDiscountPct INT NOT NULL DEFAULT 10,
      referrerRewardMonths INT NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`));
    return "✓ created";
  });
  await step("referralRedemptions", async () => {
    if (await tableExists("referralRedemptions")) return "·";
    await db.execute(sql.raw(`CREATE TABLE referralRedemptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codeId INT NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      birthDate VARCHAR(16),
      birthTime VARCHAR(16),
      birthLocation VARCHAR(255),
      identityKey VARCHAR(64) NOT NULL UNIQUE,
      userId INT,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      qualifiedAt TIMESTAMP NULL)`));
    return "✓ created";
  });

  // ── 2. tasks: drift columns + the 28-value circle enum ───────────────────────
  console.log("\n— TASKS —");
  await step("tasks.isNewVenture column", async () => {
    if (await columnType("tasks", "isNewVenture")) return "·";
    await db.execute(sql.raw(`ALTER TABLE tasks ADD COLUMN isNewVenture BOOLEAN NULL`));
    return "✓ added";
  });
  await step("tasks.circles column (multi-circle JSON)", async () => {
    if (await columnType("tasks", "circles")) return "·";
    await db.execute(sql.raw(`ALTER TABLE tasks ADD COLUMN circles TEXT NULL`));
    return "✓ added";
  });
  await step("tasks.circle enum → 28 values", async () => {
    const t = (await columnType("tasks", "circle")) ?? "";
    if (t.includes("'mother'") && t.includes("'father'")) return "·";
    await db.execute(sql.raw(`ALTER TABLE tasks MODIFY COLUMN circle ENUM(${CIRCLE_ENUM}) NULL`));
    return "✓ extended";
  });

  // ── 3. narrative_cache: widths + locked + uniq_read (the 7/17 outage shape) ───
  console.log("\n— NARRATIVE_CACHE —");
  await step("surface → VARCHAR(24)", async () => {
    const t = await columnType("narrative_cache", "surface");
    if (t === "varchar(24)") return "·";
    await db.execute(sql.raw(`ALTER TABLE narrative_cache MODIFY surface VARCHAR(24) NOT NULL`));
    return `✓ was ${t}`;
  });
  await step("cacheDate → VARCHAR(64)", async () => {
    const t = await columnType("narrative_cache", "cacheDate");
    if (t === "varchar(64)") return "·";
    await db.execute(sql.raw(`ALTER TABLE narrative_cache MODIFY cacheDate VARCHAR(64) NOT NULL`));
    return `✓ was ${t}`;
  });
  await step("locked column", async () => {
    if (await columnType("narrative_cache", "locked")) return "·";
    await db.execute(sql.raw(`ALTER TABLE narrative_cache ADD COLUMN locked BOOLEAN NOT NULL DEFAULT FALSE`));
    return "✓ added";
  });
  await step("uniq_read (profileId, surface, cacheDate)", async () => {
    if ((await indexColumns("narrative_cache", "uniq_read")).length) return "·";
    await db.execute(sql.raw(`ALTER TABLE narrative_cache ADD UNIQUE KEY uniq_read (profileId, surface, cacheDate)`));
    return "✓ added";
  });

  // ── 4. horoscopes: lifeArea column + the 3-col unique key ─────────────────────
  console.log("\n— HOROSCOPES —");
  await step("horoscopes.lifeArea column ≥ VARCHAR(24)", async () => {
    const t = await columnType("horoscopes", "lifeArea");
    if (!t) { await db.execute(sql.raw(`ALTER TABLE horoscopes ADD COLUMN lifeArea VARCHAR(24) NOT NULL DEFAULT 'day'`)); return "✓ added"; }
    if (t === "varchar(24)") return "·";
    // audit L14: was VARCHAR(16) — 'money_livelihood' is exactly 16 chars (zero headroom); a
    // longer life-area key would truncate and collide in the unique purchase key.
    await db.execute(sql.raw(`ALTER TABLE horoscopes MODIFY lifeArea VARCHAR(24) NOT NULL DEFAULT 'day'`));
    return `✓ widened (was ${t})`;
  });
  await step("uniq_horoscope → (profileId, readingDate, lifeArea)", async () => {
    const cols = await indexColumns("horoscopes", "uniq_horoscope");
    if (cols.length === 3 && cols.includes("lifeArea")) return "·";
    // Old 2-col key is STRICTER (≤1 row per profile+date), so no row can violate the wider
    // 3-col key — safe to swap without dedupe.
    if (cols.length) await db.execute(sql.raw(`ALTER TABLE horoscopes DROP INDEX uniq_horoscope`));
    await db.execute(sql.raw(`ALTER TABLE horoscopes ADD UNIQUE KEY uniq_horoscope (profileId, readingDate, lifeArea)`));
    return `✓ was [${cols.join(", ") || "none"}]`;
  });

  // ── 5. profile_natal_bodies: dedupe + unique(profileId, planet) ──────────────
  console.log("\n— PROFILE_NATAL_BODIES —");
  await step("unique (profileId, planet) — dedupe first", async () => {
    if ((await indexColumns("profile_natal_bodies", "uniq_profile_planet")).length) return "·";
    // The missing key let the upsert plain-insert; drop any duplicate (profileId, planet)
    // rows, keeping the NEWEST (highest id), before adding the constraint.
    const del = await db.execute(sql.raw(`DELETE t1 FROM profile_natal_bodies t1
      INNER JOIN profile_natal_bodies t2
      ON t1.profileId = t2.profileId AND t1.planet = t2.planet AND t1.id < t2.id`));
    await db.execute(sql.raw(`ALTER TABLE profile_natal_bodies ADD UNIQUE KEY uniq_profile_planet (profileId, planet)`));
    const removed = (del as any)?.[0]?.affectedRows ?? (del as any)?.rowsAffected ?? "?";
    return `✓ added (${removed} dup rows removed)`;
  });

  console.log("\nDone. ✓ = applied, · = already correct, ✗ = needs a look.\n");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
