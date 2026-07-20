/**
 * ADD THE SHIFT-ALERT DEDUPE COLUMN — David-run, never automatic.
 *
 * He asked (2026-07-20): "the user should get an alert on their phone when the day shifts."
 *
 * The morning bell dedupes on push_subscriptions.lastMorningPush — a varchar(10) holding the local
 * date, so a user is rung once per local day. A shift alert needs its OWN marker, because a user
 * can legitimately get both on the same day: the bell at 8am and the turn at 3:42pm.
 *
 * WHY NOT REUSE lastMorningPush. It is varchar(10) and a date fills it exactly. Packing a composite
 * like "2026-07-20#turn" into it would silently truncate or reject — which is not hypothetical here:
 * the 2026-07-17 outage was a varchar(10) cacheDate column rejecting longer keys and killing billed
 * readings for everyone. Repeating that to save one column would be indefensible.
 *
 * WHY THIS IS A SCRIPT AND NOT A MIGRATION. A deploy once wiped every account via an automatic
 * force-migrate. Schema changes here are hand-run by David, always.
 *
 * Run:  npx tsx server/scripts/add-turn-push-column.ts
 * Safe to run twice — it checks before it adds, and adds a NULLABLE column, so existing rows are
 * untouched and every user simply looks "not yet alerted", which is the correct starting state.
 */
import { getDb } from "../db.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database. Set DATABASE_URL and run again.");
    process.exit(1);
  }

  const existing: any = await db.execute(sql`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'push_subscriptions'
      AND COLUMN_NAME = 'lastTurnPush'
  `);
  const rows = Array.isArray(existing) ? existing[0] ?? existing : existing?.rows ?? [];
  if (Array.isArray(rows) && rows.length > 0) {
    console.log("lastTurnPush already exists — nothing to do.");
    return;
  }

  await db.execute(sql`
    ALTER TABLE push_subscriptions
    ADD COLUMN lastTurnPush VARCHAR(10) NULL
  `);
  console.log("Added push_subscriptions.lastTurnPush VARCHAR(10) NULL.");
  console.log("Nullable on purpose: every existing row reads as 'not yet alerted', which is correct.");
  console.log("\nNext: the shift alert is built but stays OFF until this column exists —");
  console.log("it checks for the column and no-ops without it, so running this is what turns it on.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});
