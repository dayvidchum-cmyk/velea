/**
 * RECOMPUTE CONVERGENCE — convergence-v2-heavylord (David's Meridian decision, 2026-07-17).
 * Re-runs the Step-15 timeline for EVERY profile with stored research, wholesale-replacing
 * profile_convergence rows (transactional, same as a birth-data edit). COMPUTE ONLY — no
 * schema change. Run by hand: DATABASE_URL=<railway url> npx tsx scripts/recompute-convergence.ts
 */
import { getDb } from "../server/db";
import { profiles, profileNatalBodies } from "../drizzle/schema";
import { isNull, eq, and } from "drizzle-orm";
import { calculateBirthChart } from "../server/birthchart/calculator";
import { storeConvergence } from "../server/vedic/research-store";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("no db");
  const rows = await db.select().from(profiles);
  const live = rows.filter((p: any) => !p.archivedAt && p.birthDate);
  console.log(`profiles with birth data: ${live.length}`);
  for (const prof of live as any[]) {
    try {
      const lat = parseFloat(prof.birthLocationLat), lon = parseFloat(prof.birthLocationLon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) { console.log(`- ${prof.id} ${prof.name}: no coords, skipped`); continue; }
      const chart: any = await calculateBirthChart(prof.birthDate, prof.birthTime || "12:00", lat, lon, prof.birthTimezone || "UTC", { lagnaBasis: prof.birthTime ? "ascendant" : "chandra" });
      const bodies: Record<string, any> = {};
      for (const [name, d] of [["Sun", chart.sun], ["Moon", chart.moon], ["Mars", chart.mars], ["Mercury", chart.mercury], ["Jupiter", chart.jupiter], ["Venus", chart.venus], ["Saturn", chart.saturn], ["Rahu", chart.rahu], ["Ketu", chart.ketu]] as const) {
        bodies[name] = { longitude: (d as any).longitude, longitudeSpeed: (d as any).longitudeSpeed, declination: (d as any).declination };
      }
      const n = await storeConvergence({
        profileId: prof.id, bodies, lagnaLon: chart.lagna.longitude,
        mcLon: prof.birthTime && chart.mc?.longitude != null ? chart.mc.longitude : null,
        utcBirthIso: chart.utcBirthIso, latitude: lat, longitude: lon,
        basis: prof.birthTime ? "ascendant" : "chandra",
      });
      console.log(`✓ ${prof.id} ${prof.name}: ${n} spans (heavy-lord)`);
    } catch (e: any) {
      console.error(`✗ ${prof.id} ${prof.name}:`, e?.message ?? e);
    }
  }
  process.exit(0);
}
main();
