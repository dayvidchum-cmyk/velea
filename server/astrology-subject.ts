/**
 * resolveAstrologySubject — single source of truth for "whose chart are we calculating?"
 *
 * Priority:
 *   1. Active profile (if the user has one set with birth data)
 *   2. Owner profile (isOwner=true — the user's own "My Chart" entry)
 *
 * All birth data now lives exclusively in the profiles table.
 * The users table birth fields are legacy and no longer read here.
 */

import { getDb } from "./db.js";
import { getActiveProfile, getProfileNatalBodies } from "./routers/profiles.js";
import { profiles } from "../drizzle/schema.js";
import { and, eq } from "drizzle-orm";

export interface AstrologySubject {
  /** Where the data came from */
  source: "profile" | "owner";
  /** Profile ID (always set — both active profiles and owner profile have an id) */
  profileId: number;
  /** Display name */
  name: string | null;
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:mm */
  birthTime: string | null;
  birthLocationCity: string | null;
  birthLocationLat: string | null;
  birthLocationLon: string | null;
  birthTimezone: string | null;
  /** Ascendant sign e.g. "Virgo" */
  lagnaSign: string | null;
  sunHouse: number | null;
  moonHouse: number | null;
  marsHouse: number | null;
  mercuryHouse: number | null;
  jupiterHouse: number | null;
  venusHouse: number | null;
  saturnHouse: number | null;
  rahuHouse: number | null;
  ketuHouse: number | null;
  ascendantDegree: string | null;
  /** All natal body rows from profile_natal_bodies */
  natalBodies: Array<{
    planet: string;
    sign: string;
    degree: string;
    house: number;
    nakshatra: string | null;
    pada: number | null;
    longitude: string | null;
    isRetrograde: boolean | null;
  }>;
}

function profileToSubject(
  p: typeof profiles.$inferSelect,
  bodies: Awaited<ReturnType<typeof getProfileNatalBodies>>,
  source: "profile" | "owner"
): AstrologySubject {
  return {
    source,
    profileId: p.id,
    name: p.name,
    birthDate: p.birthDate!,
    birthTime: p.birthTime ?? null,
    birthLocationCity: p.birthLocationCity ?? null,
    birthLocationLat: p.birthLocationLat ?? null,
    birthLocationLon: p.birthLocationLon ?? null,
    birthTimezone: p.birthTimezone ?? null,
    lagnaSign: p.lagnaSign ?? null,
    sunHouse: p.sunHouse ?? null,
    moonHouse: p.moonHouse ?? null,
    marsHouse: p.marsHouse ?? null,
    mercuryHouse: p.mercuryHouse ?? null,
    jupiterHouse: p.jupiterHouse ?? null,
    venusHouse: p.venusHouse ?? null,
    saturnHouse: p.saturnHouse ?? null,
    rahuHouse: p.rahuHouse ?? null,
    ketuHouse: p.ketuHouse ?? null,
    ascendantDegree: p.ascendantDegree ?? null,
    natalBodies: bodies.map((b) => ({
      planet: b.planet,
      sign: b.sign,
      degree: b.degree,
      house: b.house,
      nakshatra: b.nakshatra ?? null,
      pada: b.pada ?? null,
      longitude: b.longitude ?? null,
      isRetrograde: b.isRetrograde ?? null,
    })),
  };
}

/**
 * Returns the astrology subject for the given userId.
 * Returns null if no birth data is available from any profile.
 */
export async function resolveAstrologySubject(userId: number): Promise<AstrologySubject | null> {
  // 1. Try active profile first (non-owner profile that was explicitly selected)
  const activeProfile = await getActiveProfile(userId);
  if (activeProfile?.birthDate) {
    const bodies = await getProfileNatalBodies(activeProfile.id);
    return profileToSubject(activeProfile, bodies, "profile");
  }

  // 2. Fall back to the owner's "My Chart" profile
  const db = await getDb();
  if (!db) return null;
  const ownerRows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), eq(profiles.isOwner, true)))
    .limit(1);
  const ownerProfile = ownerRows[0];
  if (!ownerProfile?.birthDate) return null;

  const bodies = await getProfileNatalBodies(ownerProfile.id);
  return profileToSubject(ownerProfile, bodies, "owner");
}
