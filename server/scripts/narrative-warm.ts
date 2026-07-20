#!/usr/bin/env node
/** Warm/verify the narrative cache for a profile+date. Usage: tsx ... [date] [profileId] */
import "dotenv/config";
import { getDayReadCached } from "../narrative/service.js"; // glance retired v805
import { resolveDaySkyForProfileId } from "../panchang/resolve-day-sky.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];
const pid = Number(process.argv[3] ?? 1);

(async () => {
  const dayLoc = await resolveDaySkyForProfileId(pid, date);
  const a = await getDayReadCached(pid, date, false, dayLoc);
  console.log(`1st call — available:${a.available} cached:${a.cached}`);
  console.log("  story:", a.read?.story?.slice(0, 90));
  console.log("  question:", a.read?.question);
  const b = await getDayReadCached(pid, date, false, dayLoc);
  console.log(`2nd call — cached:${b.cached} (expect true; no new API call)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
