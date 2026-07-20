/**
 * ADD THE LOCATION A PAID READING WAS COMPUTED FOR.
 *
 * THE DEFECT (audit 2026-07-20). The `horoscopes` table freezes a purchased reading — content,
 * prompt version, model — but records NO location. The sky it was computed for came from
 * resolveDaySky (override → current → hometown → birth) at reveal time, and nothing kept it.
 * Meanwhile the page prints the location from a LIVE query (Horoscope.tsx:540, "Lived in {city}"),
 * directly above the frozen prose.
 *
 * So: reveal a past date with no override (computed from hometown), later set that date's
 * location to Tokyo, and the page reads "Lived in Tokyo" over a reading computed for the
 * hometown sky. Editing an existing override after purchase does the same. The row records
 * nothing, so the mismatch is undetectable after the fact — for a reading someone paid for.
 *
 * WHY THIS IS A SCRIPT AND NOT A MIGRATION: a deploy once ran `drizzle push --force` and wiped
 * every account. Schema changes in this repo are David's to run, always.
 *
 * SAFE TO RUN TWICE. The columns are added only if absent, and they are NULLABLE — every
 * existing row reads as "location not recorded", which is the honest state for rows frozen
 * before this ran. The code must therefore treat NULL as "cannot say", never as "birth city".
 *
 *   npx tsx server/scripts/add-horoscope-location-columns.ts
 */
import { getDb } from "../db.js";
import { sql } from "drizzle-orm";

const COLUMNS: Array<{ name: string; ddl: string; why: string }> = [
  { name: "computedLat", ddl: "DOUBLE NULL", why: "the latitude the sky was actually cast for" },
  { name: "computedLon", ddl: "DOUBLE NULL", why: "the longitude" },
  { name: "computedTimezone", ddl: "VARCHAR(64) NULL", why: "IANA zone — sunrise and the day's boundaries depend on it" },
  { name: "computedCity", ddl: "VARCHAR(120) NULL", why: "what to SHOW the reader, instead of a live lookup" },
  // varchar(16), not (10): a varchar(10) cache column silently rejecting longer keys is what
  // killed billed readings on 2026-07-17. Never size one of these to the current longest value.
  { name: "computedSource", ddl: "VARCHAR(16) NULL", why: "override | current | hometown | birth" },
];

async function main() {
  const db = await getDb();
  if (!db) throw new Error("no database — set DATABASE_URL to the Railway URL before running");

  const existing = new Set<string>();
  const rows: any = await db.execute(sql`SHOW COLUMNS FROM horoscopes`);
  for (const r of (rows?.[0] ?? rows ?? []) as any[]) existing.add(String(r.Field ?? r.field));
  console.log(`horoscopes currently has ${existing.size} columns`);

  let added = 0;
  for (const c of COLUMNS) {
    if (existing.has(c.name)) { console.log(`  = ${c.name} already present — skipping`); continue; }
    await db.execute(sql.raw(`ALTER TABLE horoscopes ADD COLUMN \`${c.name}\` ${c.ddl}`));
    console.log(`  + ${c.name} ${c.ddl}  — ${c.why}`);
    added++;
  }

  const after: any = await db.execute(sql`SHOW COLUMNS FROM horoscopes`);
  const names = new Set<string>();
  for (const r of (after?.[0] ?? after ?? []) as any[]) names.add(String(r.Field ?? r.field));
  const missing = COLUMNS.filter((c) => !names.has(c.name)).map((c) => c.name);
  if (missing.length) throw new Error(`FAILED — still missing: ${missing.join(", ")}`);

  console.log(`\nDone. ${added} column(s) added; all ${COLUMNS.length} present.`);
  console.log("Existing rows read as NULL = 'location not recorded', which is correct for");
  console.log("anything frozen before this ran. The UI must say nothing rather than guess.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
