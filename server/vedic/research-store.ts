/**
 * RESEARCH STORE — persists the two profile-creation research layers (David's directives,
 * 2026-07-14):
 *   #1 profile_research      — the 12-house canon research object (house-research.ts)
 *   #2 profile_dasha_periods — the full Vimshottari system birth→120y (dasha-tree.ts)
 *
 * Called from recomputeProfileChart AFTER the natal bodies are stored, in the same
 * best-effort tier as the profection precompute: a failure warns and never blocks the
 * chart save. If the tables don't exist yet (prod before the manual migration runs),
 * the store no-ops with one warning — deploy order is safe either way.
 *
 * inputHash guards recompute waste: same birth inputs + engine version → skip the write.
 * A birth-data edit always changes the hash, so nothing typo-derived survives (the same
 * law recomputeProfileChart enforces for the chart itself).
 */
import { createHash } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "../db.js";
import { profileResearch, profileDashaPeriods, profileConvergence } from "../../drizzle/schema.js";
import { computeNatalResearch, RESEARCH_ENGINE_VERSION, type ResearchInput, type NatalResearch } from "./house-research.js";
import { dashaTree, type DashaLevel } from "./dasha-tree.js";
import { computeConvergenceTimeline } from "./convergence.js";

const DASHA_ENGINE_VERSION = "dasha-tree-v1";

/** Chart data the store needs, in the calculator's own shape. */
export interface StoreChartInput {
  profileId: number;
  /** { Sun: {longitude, longitudeSpeed?, declination?}, … } — 9 grahas incl. Rahu/Ketu. */
  bodies: Record<string, { longitude: number; longitudeSpeed?: number; declination?: number }>;
  lagnaLon: number;
  mcLon: number | null;
  /** Exact UTC birth instant ISO (calculator's utcBirthIso). */
  utcBirthIso: string;
  latitude: number;
  longitude: number;
  basis: "ascendant" | "ascendant_approx" | "chandra";
}

const GRAHA_KEYS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;

function isMissingTable(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return msg.includes("ER_NO_SUCH_TABLE") || /doesn't exist/i.test(msg);
}

export type StoreStatus = "stored" | "unchanged" | "unavailable";

/** Compute + persist the 12-house research. `unchanged` = same inputs already stored. */
export async function storeNatalResearch(input: StoreChartInput): Promise<StoreStatus> {
  const db = await getDb();
  if (!db) return "unavailable";

  const lonBy: Record<string, number> = {};
  const speedBy: Record<string, number> = {};
  const declBy: Record<string, number> = {};
  for (const [name, b] of Object.entries(input.bodies)) {
    lonBy[name] = b.longitude;
    if (b.longitudeSpeed != null) speedBy[name] = b.longitudeSpeed;
    if (b.declination != null) declBy[name] = b.declination;
  }
  // Ayana needs all seven declinations; partial = honestly absent.
  const declComplete = GRAHA_KEYS.every((g) => declBy[g] != null);

  const timed = input.basis !== "chandra";
  const birthMs = Date.parse(input.utcBirthIso);

  // The time-anchored v2 layers (Vedic weekday, day/night, kalavelas) — timed charts only.
  let vedicWeekday: number | null = null;
  let isDayBirth: boolean | null = null;
  let kalavelaLongitudes: Record<string, number> | null = null;
  if (timed && Number.isFinite(birthMs)) {
    try {
      const { vedicDay } = await import("./shadbala.js");
      const { kalavelaStarts } = await import("./natal-states.js");
      const { ascendantAt } = await import("../birthchart/calculator.js");
      const day = vedicDay(birthMs, input.latitude, input.longitude);
      vedicWeekday = day.civilDate.getUTCDay();
      isDayBirth = birthMs >= day.sunriseMs && birthMs < day.sunsetMs;
      const starts = kalavelaStarts({
        birthUtcMs: birthMs, sunriseMs: day.sunriseMs, sunsetMs: day.sunsetMs,
        nextSunriseMs: day.nextSunriseMs, vedicWeekday,
      });
      kalavelaLongitudes = {};
      for (const [name, atMs] of Object.entries(starts)) {
        kalavelaLongitudes[name] = await ascendantAt(atMs, input.latitude, input.longitude);
      }
    } catch (err) {
      console.warn("[Research Store] Kalavela/vedic-day resolve failed (research stays partial):", err);
      vedicWeekday = null; isDayBirth = null; kalavelaLongitudes = null;
    }
  }

  const researchInput: ResearchInput = {
    lonBy,
    speedBy: speedBy as ResearchInput["speedBy"],
    declBy: declComplete ? (declBy as ResearchInput["declBy"]) : undefined,
    lagnaLon: input.lagnaLon,
    mcLon: timed ? input.mcLon : null,
    birthUtcMs: timed ? birthMs : null,
    latitude: input.latitude,
    longitude: input.longitude,
    basis: input.basis,
    isDayBirth,
    vedicWeekday,
    kalavelaLongitudes,
  };

  const inputHash = createHash("sha256")
    .update(JSON.stringify({ v: RESEARCH_ENGINE_VERSION, ...researchInput }))
    .digest("hex");

  try {
    const existing = await db.select({ inputHash: profileResearch.inputHash })
      .from(profileResearch)
      .where(eq(profileResearch.profileId, input.profileId))
      .limit(1);
    if (existing[0]?.inputHash === inputHash) return "unchanged";

    const research = computeNatalResearch(researchInput);
    await db.insert(profileResearch).values({
      profileId: input.profileId,
      engineVersion: RESEARCH_ENGINE_VERSION,
      inputHash,
      research: JSON.stringify(research),
    }).onDuplicateKeyUpdate({
      set: { engineVersion: RESEARCH_ENGINE_VERSION, inputHash, research: JSON.stringify(research) },
    });
    return "stored";
  } catch (err) {
    if (isMissingTable(err)) {
      console.warn("[Research Store] profile_research table missing — run server/scripts/create-research-tables.ts");
      return "unavailable";
    }
    throw err;
  }
}

/**
 * Compute + persist the full dasha tree. Timed births store all 5 levels (~66k rows);
 * Chandra (no-time) births store levels 1–3 — a noon placeholder cannot support
 * hour-grain periods. Replaces the profile's rows wholesale INSIDE A TRANSACTION
 * (birth-data edits must never leave a stale or partial timeline behind).
 *
 * `researchStatus` gates the rewrite: when the research hash says the birth inputs are
 * unchanged AND rows already exist, the ~66k-row rewrite is skipped — recomputes (incl.
 * the narrative self-heal path) stay cheap and idempotent.
 */
export async function storeDashaTree(input: StoreChartInput, researchStatus?: StoreStatus): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const birthUtcMs = Date.parse(input.utcBirthIso);
  const moonLon = input.bodies.Moon?.longitude;
  if (!Number.isFinite(birthUtcMs) || moonLon == null) return 0;

  try {
    if (researchStatus === "unchanged") {
      const present = await db.select({ id: profileDashaPeriods.id })
        .from(profileDashaPeriods)
        .where(eq(profileDashaPeriods.profileId, input.profileId))
        .limit(1);
      if (present.length) return 0; // same inputs, timeline already stored — no-op
    }

    const maxLevel: DashaLevel = input.basis === "chandra" ? 3 : 5;
    const periods = dashaTree(birthUtcMs, moonLon, maxLevel);

    await db.transaction(async (tx) => {
      await tx.delete(profileDashaPeriods).where(eq(profileDashaPeriods.profileId, input.profileId));
      const CHUNK = 1000;
      for (let i = 0; i < periods.length; i += CHUNK) {
        const rows = periods.slice(i, i + CHUNK).map((p) => ({
          profileId: input.profileId,
          level: p.level,
          maha: p.lords[0],
          antar: p.lords[1] ?? null,
          pratyantar: p.lords[2] ?? null,
          sookshma: p.lords[3] ?? null,
          prana: p.lords[4] ?? null,
          startAt: new Date(p.startMs),
          endAt: new Date(p.endMs),
        }));
        await tx.insert(profileDashaPeriods).values(rows);
      }
    });
    return periods.length;
  } catch (err) {
    if (isMissingTable(err)) {
      console.warn("[Research Store] profile_dasha_periods table missing — run server/scripts/create-research-tables.ts");
      return 0;
    }
    throw err;
  }
}

/**
 * Compute + persist the convergence timeline (directive #3): one row per pratyantar span,
 * birth→120y, holding the themes with ≥1 actively-tied period-lord. Same idempotence gate
 * and transactional wholesale-replace as the dasha store — a birth-data edit must never
 * leave a stale convergence timeline behind.
 */
export async function storeConvergence(input: StoreChartInput, researchStatus?: StoreStatus): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const birthUtcMs = Date.parse(input.utcBirthIso);
  const moonLon = input.bodies.Moon?.longitude;
  if (!Number.isFinite(birthUtcMs) || moonLon == null) return 0;

  try {
    if (researchStatus === "unchanged") {
      const present = await db.select({ id: profileConvergence.id })
        .from(profileConvergence)
        .where(eq(profileConvergence.profileId, input.profileId))
        .limit(1);
      if (present.length) return 0;
    }

    const lonBy: Record<string, number> = {};
    for (const [name, b] of Object.entries(input.bodies)) lonBy[name] = b.longitude;
    const spans = computeConvergenceTimeline({ lonBy, lagnaLon: input.lagnaLon, birthUtcMs });

    await db.transaction(async (tx) => {
      await tx.delete(profileConvergence).where(eq(profileConvergence.profileId, input.profileId));
      const CHUNK = 500;
      for (let i = 0; i < spans.length; i += CHUNK) {
        const rows = spans.slice(i, i + CHUNK).map((s) => ({
          profileId: input.profileId,
          maha: s.maha,
          antar: s.antar,
          pratyantar: s.pratyantar,
          startAt: new Date(s.startMs),
          endAt: new Date(s.endMs),
          themes: JSON.stringify(s.themes),
        }));
        await tx.insert(profileConvergence).values(rows);
      }
    });
    return spans.length;
  } catch (err) {
    if (isMissingTable(err)) {
      console.warn("[Research Store] profile_convergence table missing — re-run server/scripts/create-research-tables.ts");
      return 0;
    }
    throw err;
  }
}

/** The stored research for a profile (parsed), or null. Rows stored by an OLDER engine
 *  version are treated as a miss — the caller's backfill then recomputes at the current
 *  version (audit 2026-07-15: v1 rows lacked Vimshopak/Deepthaadi and would otherwise
 *  serve a thin natalCondition forever). */
export async function getStoredResearch(profileId: number): Promise<NatalResearch | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(profileResearch)
      .where(eq(profileResearch.profileId, profileId)).limit(1);
    if (!rows[0]) return null;
    if (rows[0].engineVersion !== RESEARCH_ENGINE_VERSION) return null; // outdated = miss
    return JSON.parse(rows[0].research) as NatalResearch;
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

/** The running dasha chain at a moment, from the stored rows (one period per level). */
export async function getDashaChainAt(profileId: number, at: Date) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(profileDashaPeriods)
      .where(and(
        eq(profileDashaPeriods.profileId, profileId),
        lte(profileDashaPeriods.startAt, at),
        gt(profileDashaPeriods.endAt, at),
      ))
      .orderBy(profileDashaPeriods.level);
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

export { DASHA_ENGINE_VERSION };
