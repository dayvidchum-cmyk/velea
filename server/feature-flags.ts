/**
 * FEATURE FLAGS (David 2026-07-16: "turn on specific features for the testers —
 * buttons in settings"). Stored as a JSON row in system_prompts (key "feature_flags")
 * — no schema change. Each feature has an AUDIENCE: admins | testers | everyone.
 * Testers are an email allowlist managed from the admin panel in Settings.
 */
import { getDb } from "./db.js";
import { systemPrompts } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

export type Audience = "admins" | "testers" | "everyone";
export type FeatureKey = "yearPage" | "houseReader" | "chapterReader" | "momentRefresh";

export const FEATURE_DEFS: Record<FeatureKey, { label: string; blurb: string }> = {
  yearPage: { label: "Year page", blurb: "The ranked solar year with day pop-ups" },
  houseReader: { label: "House Reader", blurb: "Tap a house on the chart, the research speaks" },
  chapterReader: { label: "Chapter Reader", blurb: "Tap a mahadasha, the lord's dossier speaks" },
  momentRefresh: { label: "Moment refresh", blurb: "The hero's ↻ update-to-the-moment" },
};

export type FeatureFlags = { features: Record<FeatureKey, Audience>; testers: string[] };
const DEFAULTS: FeatureFlags = {
  features: { yearPage: "admins", houseReader: "everyone", chapterReader: "everyone", momentRefresh: "admins" },
  testers: [],
};

let cache: { flags: FeatureFlags; at: number } | null = null;
const TTL = 60_000;

export async function getFlags(): Promise<FeatureFlags> {
  if (cache && Date.now() - cache.at < TTL) return cache.flags;
  const db = await getDb();
  let flags = DEFAULTS;
  if (db) {
    try {
      const rows = await db.select().from(systemPrompts).where(eq(systemPrompts.key, "feature_flags")).limit(1);
      if (rows[0]) {
        const parsed = JSON.parse(rows[0].content);
        flags = {
          features: { ...DEFAULTS.features, ...(parsed.features ?? {}) },
          testers: Array.isArray(parsed.testers) ? parsed.testers : [],
        };
      }
    } catch { /* defaults */ }
  }
  cache = { flags, at: Date.now() };
  return flags;
}

export async function saveFlags(flags: FeatureFlags): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const content = JSON.stringify(flags);
  const rows = await db.select().from(systemPrompts).where(eq(systemPrompts.key, "feature_flags")).limit(1);
  if (rows[0]) await db.update(systemPrompts).set({ content }).where(eq(systemPrompts.key, "feature_flags"));
  else await db.insert(systemPrompts).values({ key: "feature_flags", title: "Feature access flags", content });
  cache = null;
}

export async function hasFeature(user: { role?: string | null; email?: string | null }, key: FeatureKey): Promise<boolean> {
  if (user.role === "admin") return true;
  const flags = await getFlags();
  const aud = flags.features[key] ?? "admins";
  if (aud === "everyone") return true;
  if (aud === "testers") return !!user.email && flags.testers.map((t) => t.toLowerCase()).includes(user.email.toLowerCase());
  return false;
}
