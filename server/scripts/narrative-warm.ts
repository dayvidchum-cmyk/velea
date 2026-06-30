#!/usr/bin/env node
/** Warm/verify the narrative cache for a profile+date. Usage: tsx ... [date] [profileId] */
import "dotenv/config";
import { getGlanceCached } from "../narrative/service.js";

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];
const pid = Number(process.argv[3] ?? 1);

(async () => {
  const a = await getGlanceCached(pid, date);
  console.log(`1st call — available:${a.available} cached:${a.cached}`);
  console.log("  narrative:", a.content?.narrative?.slice(0, 90));
  console.log("  question:", a.content?.question);
  const b = await getGlanceCached(pid, date);
  console.log(`2nd call — cached:${b.cached} (expect true; no new API call)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
