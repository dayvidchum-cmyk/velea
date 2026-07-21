/**
 * SNAPSHOT TODAY'S READINGS BEFORE THEY REGENERATE — read-only.
 *
 * narrative_cache is UNIQUE on (profileId, surface, cacheDate), so a regeneration UPSERTS over
 * `content`. Once the payload gains a field, dayStableHash changes, the cache misses, and the
 * previous prose is overwritten and unrecoverable. This captures it first.
 *
 * STRICTLY READ-ONLY. It runs SELECT and writes a local JSON file. It does not create, alter,
 * update or delete anything — safe to point at production.
 *
 * Usage (from the repo root), with the Railway connection string:
 *
 *   DATABASE_URL='<prod url>' npx tsx server/scripts/snapshot-readings.ts
 *   DATABASE_URL='<prod url>' npx tsx server/scripts/snapshot-readings.ts 2026-07-21 David Lisa Lang
 *
 * Writes ./reading-snapshot-<date>.json and prints the prose so it can be read in the terminal.
 * Re-running is safe: it overwrites only its own local file, never the database.
 */
import "dotenv/config";
import { writeFileSync } from "fs";

const args = process.argv.slice(2);
const DATE = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : new Date().toISOString().slice(0, 10);
const NAMES = (args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args.slice(1) : args);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — pass the Railway connection string.");
  const mysql = await import("mysql2/promise");
  const c = await mysql.createConnection(url);

  const [profiles] = (await c.execute(
    "select id, name, userId from profiles order by id"
  )) as unknown as [{ id: number; name: string; userId: number }[]];

  const wanted = NAMES.length
    ? profiles.filter((p) => NAMES.some((n) => (p.name ?? "").toLowerCase().includes(n.toLowerCase())))
    : profiles;

  if (!wanted.length) {
    console.log(`  no profiles matched ${NAMES.join(", ") || "(all)"} — nothing captured`);
    await c.end();
    return;
  }

  const ids = wanted.map((p) => p.id);
  const [rows] = (await c.execute(
    `select id, profileId, surface, cacheDate, inputHash, model, content, generatedAt, locked
       from narrative_cache
      where cacheDate = ? and profileId in (${ids.map(() => "?").join(",")})
      order by profileId, surface`,
    [DATE, ...ids]
  )) as unknown as [any[]];

  const nameOf = new Map(wanted.map((p) => [p.id, p.name]));
  const out = rows.map((r) => {
    let parsed: unknown = r.content;
    try { parsed = JSON.parse(r.content); } catch { /* glance stores a plain string */ }
    return { ...r, profileName: nameOf.get(r.profileId) ?? String(r.profileId), parsed };
  });

  const file = `reading-snapshot-${DATE}.json`;
  writeFileSync(file, JSON.stringify({ capturedFor: DATE, capturedAtUtc: new Date().toISOString(), rows: out }, null, 2));

  console.log(`\n  ${out.length} cached reading(s) for ${DATE} across ${wanted.length} profile(s)`);
  console.log(`  saved -> ${file}\n`);
  for (const r of out) {
    console.log(`${"=".repeat(72)}`);
    console.log(`  ${r.profileName}  ·  ${r.surface}  ·  ${r.cacheDate}  ·  hash ${String(r.inputHash).slice(0, 12)}…${r.locked ? "  [LOCKED]" : ""}`);
    console.log(`  model ${r.model}  ·  generated ${r.generatedAt}`);
    console.log(`${"=".repeat(72)}`);
    const p: any = r.parsed;
    if (p && typeof p === "object") {
      for (const k of ["scene", "story", "tilt", "closeLine", "question"]) {
        if (p[k] != null) console.log(`\n  [${k}]\n  ${String(p[k]).replace(/\n/g, "\n  ")}`);
      }
      const extra = Object.keys(p).filter((k) => !["scene", "story", "tilt", "closeLine", "question"].includes(k));
      if (extra.length) console.log(`\n  (other keys: ${extra.join(", ")})`);
    } else {
      console.log(`\n  ${String(r.content).replace(/\n/g, "\n  ")}`);
    }
    console.log();
  }

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
