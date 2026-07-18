/**
 * THE MORNING BELL — schema (DAVID-RUN, per the no-auto-migrate law).
 *
 * Creates the push_subscriptions table for web push: one row per device subscription,
 * userId-scoped, with lastMorningPush for the 8am-local dedupe (survives deploys, so a
 * redeploy at 08:00 can't double-ring anyone).
 *
 * Run:  DATABASE_URL="<prod url>" npx tsx scripts/create-push-subscriptions.ts
 * Idempotent — CREATE TABLE IF NOT EXISTS; safe to run twice.
 */
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
  const conn = await mysql.createConnection(url);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      endpoint VARCHAR(512) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lastMorningPush VARCHAR(10) NULL,
      UNIQUE KEY uniq_endpoint (endpoint),
      KEY idx_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  const [rows] = await conn.execute(`SHOW TABLES LIKE 'push_subscriptions'`);
  console.log("push_subscriptions:", (rows as any[]).length ? "EXISTS ✓" : "MISSING ✗");
  await conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
