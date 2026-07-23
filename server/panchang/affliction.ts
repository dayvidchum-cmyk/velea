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

/**
 * THE SOLAR RELATIONSHIP (David 2026-07-23) — combustion is not a boolean, it is a STATE. A planet
 * 1° from the Sun is incinerated; at 11° it is dimmed but breathing; and at the very heart (~17
 * arcmin — cazimi) the tradition INVERTS the reading: not burnt but purified, concentrated, at the
 * throne. Three-plus lived states were collapsed into one `combust` flag, and the flag traps the
 * model into "weakened/burned" the instant it reads `true`. Naming it the Solar RELATIONSHIP, not
 * "combustion level", is deliberate: the Sun changes the planet's operating environment, it does not
 * simply hurt it. The narrative expresses the lived state; `combust`/`orbDeg` stay for the engine
 * (David's law: layer, don't replace — keep the classical truth internally and in the glossary).
 *
 * THE THRESHOLDS ARE A FIRST CURVE — David's to tune by looking (server/scripts/combustion-scan.ts).
 * cazimi + heart-of-the-sun are ABSOLUTE (a fixed solar region); the combustion tiers scale with the
 * planet's OWN classical orb, so "deep" for Venus (orb 10°) and Mars (orb 17°) means the same
 * fraction of each one's glare.
 */
export type SolarRelationship =
  | "cazimi"                // ≤ ~17' — in the heart: purified, unusually concentrated (the INVERSION)
  | "heart-of-the-sun"      // just outside the throne — deepest immersion, voice inseparable from the Sun's
  | "deep-combustion"
  | "strong-combustion"
  | "moderate-combustion"
  | "mild-combustion"       // still functions, in the glare
  | "free";                 // clear of the Sun

const CAZIMI_DEG = 0.28;    // ~17 arcmin
const HEART_DEG = 1.5;
const COMBUST_TIER = { deep: 0.35, strong: 0.60, moderate: 0.82 };  // fractions of the per-planet orb

/** Grade the planet's distance from the Sun into its lived solar state. `d` = separation (deg),
 *  `limit` = the planet's classical combustion orb (already direction-adjusted). */
export function solarRelationship(d: number, limit: number): SolarRelationship {
  if (d > limit) return "free";
  if (d <= CAZIMI_DEG) return "cazimi";
  if (d <= HEART_DEG) return "heart-of-the-sun";
  if (d <= limit * COMBUST_TIER.deep) return "deep-combustion";
  if (d <= limit * COMBUST_TIER.strong) return "strong-combustion";
  if (d <= limit * COMBUST_TIER.moderate) return "moderate-combustion";
  return "mild-combustion";
}

export type Combustion = { combust: boolean; orbDeg: number; limitDeg: number; relationship: SolarRelationship };

/**
 * Is `planet` combust — within its classical orb of the Sun? The Sun itself and the
 * shadow planets (Rahu/Ketu) have no orb → returns null (not applicable). `combust`/`orbDeg` are
 * the classical truth (unchanged); `relationship` is the graded lived state for the narrative.
 */
export function combustion(planet: string, planetLon: number, sunLon: number, retrograde = false): Combustion | null {
  const orb = COMBUSTION_ORB[planet];
  if (!orb) return null;
  const limit = retrograde ? orb.retro : orb.direct;
  const d = sep(planetLon, sunLon);
  return { combust: d <= limit, orbDeg: +d.toFixed(2), limitDeg: limit, relationship: solarRelationship(d, limit) };
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

export type EclipseSeason = {
  inSeason: boolean;
  node: "Rahu" | "Ketu";
  sunAxisOrbDeg: number;              // |Sun − nearest node|, degrees
  side: "approaching" | "leaving";   // Sun before the node (building) vs past it (aftermath)
};

// The Sun sits within the solar ecliptic limit of the nodal axis for ~±18 days around each
// crossing — the ~5-week eclipse SEASON in which the eclipse pair falls and its effects build
// then unwind. Wider than eclipseNear's tight ±7-day peak, so a read weeks after an eclipse can
// still know the aftermath is unfolding.
const ECLIPSE_SEASON_LIMIT = SOLAR_LIMIT;
const norm180 = (x: number) => (((x % 360) + 540) % 360) - 180;

/**
 * The broader eclipse SEASON and where in it this moment sits — distinct from eclipseNear's tight
 * peak. `side` reads the Sun's position relative to the nearest node it is closest to:
 * "approaching" (Sun still before the node → the build) vs "leaving" (Sun past the node → the
 * aftermath, effects unwinding). Deterministic from the Sun and Rahu sidereal longitudes.
 */
export function eclipseSeason(sunLon: number, rahuLon: number): EclipseSeason {
  const dR = norm180(sunLon - rahuLon);
  const dK = norm180(sunLon - norm360(rahuLon + 180));
  const useRahu = Math.abs(dR) <= Math.abs(dK);
  const delta = useRahu ? dR : dK;
  return {
    inSeason: Math.abs(delta) <= ECLIPSE_SEASON_LIMIT,
    node: useRahu ? "Rahu" : "Ketu",
    sunAxisOrbDeg: +Math.abs(delta).toFixed(1),
    // Sun moves forward: negative offset = still before the node (building); ≥0 = past it (leaving).
    side: delta < 0 ? "approaching" : "leaving",
  };
}
