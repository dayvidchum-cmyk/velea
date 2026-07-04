/**
 * AFFLICTION — a planet weakened by proximity to the Sun (combustion / asta) or to a
 * lunar node (nodal "grahan"), plus detection of a real eclipse near a date.
 *
 * Deterministic: pure geometry from sidereal longitudes. No LLM, fully auditable —
 * the same standard as karana/hora. Combustion orbs are the CLASSICAL per-planet
 * values (Drik-Panchang / standard Jyotish): Moon 12°, Mars 17°, Mercury 14° (12°
 * retrograde), Jupiter 11°, Venus 10° (8° retrograde), Saturn 15°.
 */

/** Angular separation between two ecliptic longitudes, 0..180°. */
export function sep(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Classical combustion orbs (degrees from the Sun). [direct, retrograde]. */
export const COMBUSTION_ORB: Record<string, { direct: number; retro: number }> = {
  Moon: { direct: 12, retro: 12 },
  Mars: { direct: 17, retro: 17 },
  Mercury: { direct: 14, retro: 12 },
  Jupiter: { direct: 11, retro: 11 },
  Venus: { direct: 10, retro: 8 },
  Saturn: { direct: 15, retro: 15 },
};

export type Combustion = { combust: boolean; orbDeg: number; limitDeg: number };

/**
 * Is `planet` combust — within its classical orb of the Sun? The Sun itself and the
 * shadow planets (Rahu/Ketu) have no orb → returns null (not applicable).
 */
export function combustion(planet: string, planetLon: number, sunLon: number, retrograde = false): Combustion | null {
  const orb = COMBUSTION_ORB[planet];
  if (!orb) return null;
  const limit = retrograde ? orb.retro : orb.direct;
  const d = sep(planetLon, sunLon);
  return { combust: d <= limit, orbDeg: +d.toFixed(2), limitDeg: limit };
}

export type NodalAffliction = { afflicted: boolean; node: "Rahu" | "Ketu"; orbDeg: number; limitDeg: number };

/**
 * Is `planet` conjunct a lunar node — "eclipsed" by the shadow? Uses the SAME classical
 * orb table as combustion (the node grips the planet as the Sun does). `rahuLon` is
 * Rahu's sidereal longitude; Ketu sits opposite (rahuLon + 180). Returns null for
 * bodies with no orb (Sun/Rahu/Ketu themselves).
 */
export function nodalAffliction(planet: string, planetLon: number, rahuLon: number, retrograde = false): NodalAffliction | null {
  const orb = COMBUSTION_ORB[planet];
  if (!orb) return null;
  const limit = retrograde ? orb.retro : orb.direct;
  const dRahu = sep(planetLon, rahuLon);
  const dKetu = sep(planetLon, norm360(rahuLon + 180));
  const node = dRahu <= dKetu ? "Rahu" : "Ketu";
  const d = Math.min(dRahu, dKetu);
  return { afflicted: d <= limit, node, orbDeg: +d.toFixed(2), limitDeg: limit };
}

export type EclipseNear = {
  type: "solar" | "lunar" | null;
  syzygy: "new" | "full";
  daysToSyzygy: number;   // signed: negative = just past, positive = upcoming
  sunNodeOrbDeg: number;  // Sun–nearest-node separation AT that syzygy
  limitDeg: number;
};

// Ecliptic eclipse limits (Sun–node separation at the syzygy). Major limits, chosen to
// catch every real partial/total eclipse; a near-miss syzygy just inside the limit is a
// rare, acceptable false-positive for a "near the date" heuristic.
const SOLAR_LIMIT = 18.5; // Sun–node at New Moon → solar eclipse
const LUNAR_LIMIT = 12.2; // Sun–node at Full Moon → lunar eclipse
const ELONG_DEG_PER_DAY = 12.19;  // Moon's mean gain on the Sun
const SUN_DEG_PER_DAY = 0.9856;   // Sun's mean daily motion
const NODE_DEG_PER_DAY = -0.0529; // Rahu's mean daily regression

/**
 * Is a real solar/lunar eclipse near this moment? Finds the NEAREST syzygy (new or full
 * moon) from the current Sun/Moon elongation, projects the Sun and the node to that
 * instant, and checks the Sun–node separation against the ecliptic limits. A
 * deterministic eclipse-SEASON proximity signal (not a Besselian predictor): it flags
 * within the fortnight of a real eclipse and stays null otherwise. All longitudes sidereal.
 */
export function eclipseNear(sunLon: number, moonLon: number, rahuLon: number): EclipseNear {
  const elong = norm360(moonLon - sunLon); // 0 = new, 180 = full
  // Signed offset (deg) of the current phase from each syzygy, mapped to (-180, 180].
  const offNew = ((elong + 180) % 360) - 180;         // >0 → just past new
  const offFull = ((elong - 180 + 540) % 360) - 180;  // >0 → just past full
  const daysToNew = -offNew / ELONG_DEG_PER_DAY;
  const daysToFull = -offFull / ELONG_DEG_PER_DAY;

  const useNew = Math.abs(daysToNew) <= Math.abs(daysToFull);
  const days = useNew ? daysToNew : daysToFull;
  const syzygy = useNew ? "new" : "full";

  const sunAt = norm360(sunLon + days * SUN_DEG_PER_DAY);
  const nodeAt = norm360(rahuLon + days * NODE_DEG_PER_DAY);
  const orbToAxis = Math.min(sep(sunAt, nodeAt), sep(sunAt, norm360(nodeAt + 180)));

  const limit = useNew ? SOLAR_LIMIT : LUNAR_LIMIT;
  const type = orbToAxis <= limit ? (useNew ? "solar" : "lunar") : null;

  return { type, syzygy, daysToSyzygy: +days.toFixed(1), sunNodeOrbDeg: +orbToAxis.toFixed(1), limitDeg: limit };
}
