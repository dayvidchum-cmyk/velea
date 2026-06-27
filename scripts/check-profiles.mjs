import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

// Parse mysql://user:pass@host:port/db?ssl=...
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, password, host, port, database] = match;

const conn = await createConnection({ host, port: Number(port), user, password, database, ssl: { rejectUnauthorized: true } });

const [profiles] = await conn.execute("SELECT id, userId, name, birthDate, lagnaSign, isActive, isOwner FROM profiles");
console.log("=== PROFILES ===");
console.table(profiles);

const [tasks] = await conn.execute("SELECT id, userId, profileId, title FROM tasks LIMIT 10");
console.log("=== TASKS (first 10) ===");
console.table(tasks);

await conn.end();
