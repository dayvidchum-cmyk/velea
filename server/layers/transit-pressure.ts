/**
 * LAYER 3 — Transit pressure (v1: narrow scope).
 *
 * Only Saturn, Rahu, Ketu transiting natal Sun, Moon, or Lagna. Conjunction
 * only, degree-based orb ≤ 3°. Each real conjunction is reported separately
 * (Rahu and Ketu labeled distinctly — see Conflict E, option a).
 *
 * The math is a PURE function (computeTransitPressure) so it can be unit-tested
 * with no ephemeris. A thin async wrapper fetches current longitudes via the
 * natal engine (identical ayanamsa/method to the stored natal data, so orbs are
 * apples-to-apples) and the profile's natal points.
 *
 * Missing inputs degrade gracefully to an empty result (contributes ×1.0).
 */

import type { AstrologySubject } from "../astrology-subject";
import { getSiderealLongitudes } from "../vedic/natal-chart-engine";
import type {
  ActiveTransit,
  NatalPoint,
  TransitingPlanet,
  TransitPressure,
} from "./types";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const TRANSITING_PLANETS: TransitingPlanet[] = ["Saturn", "Rahu", "Ketu"];
const DEFAULT_ORB = 3; // degrees

export interface NatalLongitude {
  point: NatalPoint;
  longitude: number; // 0–360 sidereal
}

export interface TransitLongitude {
  planet: TransitingPlanet;
  longitude: number; // 0–360 sidereal
}

/** Smallest angular separation between two ecliptic longitudes (0–180). */
function angularSeparation(a: number, b: number): number {
  let d = Math.abs(((a - b) % 360 + 360) % 360);
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * PURE core. Given natal point longitudes and transiting planet longitudes,
 * return every conjunction within `orbDeg`. Tightest orbs first.
 */
export function computeTransitPressure(
  natal: NatalLongitude[],
  transiting: TransitLongitude[],
  orbDeg: number = DEFAULT_ORB
): ActiveTransit[] {
  const active: ActiveTransit[] = [];
  for (const t of transiting) {
    for (const n of natal) {
      const sep = angularSeparation(t.longitude, n.longitude);
      if (sep <= orbDeg) {
        active.push({
          transitingPlanet: t.planet,
          natalPoint: n.point,
          orb: Math.round(sep * 10) / 10,
          severity: sep < 1 ? "high" : sep <= 2 ? "moderate" : "low",
        });
      }
    }
  }
  active.sort((a, b) => a.orb - b.orb);
  return active;
}

/** Derive the profile's natal Sun / Moon / Lagna sidereal longitudes. */
export function natalPointsFromSubject(subject: AstrologySubject): NatalLongitude[] {
  const points: NatalLongitude[] = [];

  const sun = subject.natalBodies.find((b) => b.planet === "Sun");
  if (sun?.longitude != null && sun.longitude !== "") {
    const lon = parseFloat(sun.longitude);
    if (!Number.isNaN(lon)) points.push({ point: "Sun", longitude: ((lon % 360) + 360) % 360 });
  }

  const moon = subject.natalBodies.find((b) => b.planet === "Moon");
  if (moon?.longitude != null && moon.longitude !== "") {
    const lon = parseFloat(moon.longitude);
    if (!Number.isNaN(lon)) points.push({ point: "Moon", longitude: ((lon % 360) + 360) % 360 });
  }

  // Lagna full longitude = signIndex * 30 + degree-within-sign (ascendantDegree)
  if (subject.lagnaSign && subject.ascendantDegree != null && subject.ascendantDegree !== "") {
    const signIdx = ZODIAC_SIGNS.indexOf(subject.lagnaSign);
    const deg = parseFloat(subject.ascendantDegree);
    if (signIdx >= 0 && !Number.isNaN(deg)) {
      points.push({ point: "Lagna", longitude: (signIdx * 30 + deg) % 360 });
    }
  }

  return points;
}

/**
 * Async wrapper: compute current transit pressure for a profile.
 * Returns { active: [] } when natal points or the ephemeris are unavailable.
 */
export async function getTransitPressure(
  subject: AstrologySubject,
  when: Date = new Date()
): Promise<TransitPressure> {
  const natal = natalPointsFromSubject(subject);
  if (natal.length === 0) return { active: [] };

  try {
    const longitudes = await getSiderealLongitudes(when, TRANSITING_PLANETS);
    const transiting: TransitLongitude[] = TRANSITING_PLANETS
      .filter((p) => typeof longitudes[p] === "number")
      .map((p) => ({ planet: p, longitude: longitudes[p] }));
    if (transiting.length === 0) return { active: [] };

    return { active: computeTransitPressure(natal, transiting) };
  } catch {
    return { active: [] };
  }
}
