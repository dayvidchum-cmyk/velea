import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { panchang } from '../drizzle/schema.js';
import { asc, between } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const rows = await db.select({
    date: panchang.date,
    moonSign: panchang.moonSign,
    nakshatra: panchang.nakshatra,
    tithi: panchang.tithi,
    houseActivated: panchang.houseActivated,
    mode: panchang.mode,
  }).from(panchang)
    .where(between(panchang.date, '2026-06-01', '2026-06-30'))
    .orderBy(asc(panchang.date));

  // Print as plain text table
  const header = 'date       | moonSign      | nakshatra              | tithi                  | house | mode';
  const sep    = '-----------+---------------+------------------------+------------------------+-------+-----------';
  console.log(header);
  console.log(sep);
  for (const r of rows) {
    const date  = String(r.date ?? '').padEnd(10);
    const moon  = String(r.moonSign ?? '').padEnd(13);
    const naks  = String(r.nakshatra ?? '').padEnd(22);
    const tith  = String(r.tithi ?? '').padEnd(22);
    const house = String(r.houseActivated ?? '').padEnd(5);
    const mode  = String(r.mode ?? '');
    console.log(`${date} | ${moon} | ${naks} | ${tith} | ${house} | ${mode}`);
  }
  await conn.end();
}

main().catch(console.error);
