/**
 * THE READINGS AUTOPSY (2026-07-17 outage, deep audit) — runs the REAL server pipeline for
 * one user's owner profile, stage by stage, against whatever DATABASE_URL points at, and
 * prints exactly where it dies. READ-ONLY: no writes, no LLM calls, no cache touches.
 *
 * Run (URL stays in YOUR terminal, per the migration law):
 *   DATABASE_URL='<railway url>' npx tsx scripts/diagnose-readings.ts dayvidchum@gmail.com
 */
import { eq, and } from "drizzle-orm";
import { getDb, getUserByEmail } from "../server/db.js";
import { profiles, profileResearch, profileConvergence } from "../drizzle/schema.js";

const email = process.argv[2] ?? "dayvidchum@gmail.com";
let failures = 0;

async function stage(name: string, fn: () => Promise<string | void>) {
  const t0 = Date.now();
  try {
    const note = await fn();
    console.log(`  ✓ ${name}${note ? ` — ${note}` : ""} (${Date.now() - t0}ms)`);
  } catch (err: any) {
    failures++;
    console.log(`  ✗ ${name} — ${err?.message ?? err} (${Date.now() - t0}ms)`);
    if (err?.stack) console.log(`      ${String(err.stack).split("\n")[1]?.trim() ?? ""}`);
  }
}

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB (DATABASE_URL unset?). Aborting."); process.exit(1); }

  const user = await getUserByEmail(email);
  if (!user) { console.error(`No user for ${email}`); process.exit(1); }
  console.log(`\nUser #${user.id} ${email} (role: ${user.role})`);

  const [owner] = await db.select().from(profiles)
    .where(and(eq(profiles.userId, user.id), eq(profiles.isOwner, true))).limit(1);
  if (!owner) { console.error("No owner profile."); process.exit(1); }
  console.log(`Owner profile #${owner.id} "${owner.name}" (lagna: ${owner.lagnaSign}, birthDate: ${owner.birthDate})\n`);

  console.log("— GATES —");
  const { hasFeature } = await import("../server/feature-flags.js");
  for (const key of ["lifeAtlas", "specialReadings", "chapterReader", "houseReader", "yearPage", "secondProfile"] as any[]) {
    await stage(`hasFeature(${key})`, async () => String(await hasFeature(user, key)));
  }

  console.log("\n— STORED RESEARCH —");
  let research: any = null;
  await stage("raw research row", async () => {
    const [row] = await db.select().from(profileResearch).where(eq(profileResearch.profileId, owner.id)).limit(1);
    if (!row) throw new Error("NO ROW — readings that need research will all miss/backfill");
    const { RESEARCH_ENGINE_VERSION } = await import("../server/vedic/house-research.js");
    const size = row.research.length;
    JSON.parse(row.research); // throws on truncation/corruption
    return `engine ${row.engineVersion} (code wants ${RESEARCH_ENGINE_VERSION}), ${Math.round(size / 1024)}KB, JSON parses`;
  });
  await stage("getStoredResearch() (the real gate)", async () => {
    const { getStoredResearch } = await import("../server/vedic/research-store.js");
    research = await getStoredResearch(owner.id);
    if (!research) throw new Error("returned NULL (version mismatch or missing) — every research-fed surface backfills inline");
    return `${(research.yogas ?? []).length} yogas, ${(research.houses ?? []).length} houses, shadbala ${research.shadbala ? "present" : "MISSING"}`;
  });

  console.log("\n— DASHA STORE —");
  await stage("dasha chain at now", async () => {
    const { getDashaChainAt } = await import("../server/vedic/research-store.js");
    const chain = await getDashaChainAt(owner.id, new Date());
    if (!chain.length) throw new Error("EMPTY chain — dasha/TL surfaces starve");
    return chain.map((c: any) => `L${c.level}:${c.lord}`).join(" ");
  });

  console.log("\n— CONVERGENCE / ATLAS —");
  await stage("convergence rows + mergeThemeWindows", async () => {
    const rows = await db.select().from(profileConvergence).where(eq(profileConvergence.profileId, owner.id));
    if (!rows.length) throw new Error("NO ROWS — atlas empty");
    for (const r of rows) JSON.parse(r.themes); // any corrupt row throws here
    const { mergeThemeWindows } = await import("../server/vedic/windows.js");
    const windows = mergeThemeWindows(rows as any);
    const past = windows.filter((w: any) => w.to < new Date().toISOString().slice(0, 10)).length;
    return `${rows.length} rows → ${windows.length} windows (${past} past)`;
  });

  console.log("\n— THE DAY-READ INPUT (heaviest real path, no LLM) —");
  await stage("buildNarrativeInput(today)", async () => {
    const { buildNarrativeInput } = await import("../server/narrative/input-builder.js");
    const today = new Date().toISOString().slice(0, 10);
    const input = await buildNarrativeInput(owner.id, today);
    const size = JSON.stringify(input).length;
    return `input built, ${Math.round(size / 1024)}KB (${Math.round(size / 4 / 1000)}k tokens ≈)`;
  });

  console.log(`\n${failures === 0 ? "ALL STAGES GREEN — server pipeline is healthy for this profile; the failure is client-side or gate-side."
    : `${failures} STAGE(S) FAILED — the first ✗ above is the outage.`}\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
