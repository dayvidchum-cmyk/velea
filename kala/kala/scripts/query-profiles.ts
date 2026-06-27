import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { profiles } from '../drizzle/schema.js';
import { asc } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const rows = await db.select({
    id: profiles.id,
    userId: profiles.userId,
    name: profiles.name,
    lagnaSign: profiles.lagnaSign,
    birthDate: profiles.birthDate,
    birthTime: profiles.birthTime,
    birthLocationCity: profiles.birthLocationCity,
  }).from(profiles).orderBy(asc(profiles.userId), asc(profiles.id));
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}

main().catch(console.error);
