import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "./server/db";
import { profiles } from "./drizzle/schema";
import { calculateBirthChart } from "./server/birthchart/calculator";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select().from(profiles).where(eq(profiles.id, 1));
  const p = rows[0];
  console.log("Birth:", p.birthDate, p.birthTime, p.birthTimezone, p.birthLocationLat, p.birthLocationLon);

  const chart = await calculateBirthChart(p.birthDate!, p.birthTime!, parseFloat(p.birthLocationLat!), parseFloat(p.birthLocationLon!), p.birthTimezone!);
  
  for (const [k, v] of Object.entries(chart)) {
    if (['utcBirthIso','julianDay','lagna'].includes(k)) continue;
    console.log(`${k}: Rx=${(v as any).isRetrograde}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
