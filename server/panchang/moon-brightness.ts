/**
 * MOON BRIGHTNESS — the day-trigger's strength dial (David 2026-07-23, states doctrine binary #5:
 * "the Moon near new is genuinely depleted; near full, brimming"). The Moon is the day's trigger,
 * and it arrived as only a nakshatra/tithi NAME — no sense of how much light it is actually carrying.
 *
 * This costs no new astronomy: the illuminated fraction is a pure function of the Sun–Moon
 * ELONGATION the panchang already computes for the tithi (tithi = floor(elong / 12) + 1). New moon
 * (0°) → dark; full (180°) → brimming; quarters → half. The engine computes the objective condition;
 * the narrative expresses the lived state (waxing = filling / gathering; waning = releasing / emptying).
 *
 * Not a judgement — a state. A dark Moon is not "weak," it is inward and seeding; a full Moon is not
 * "good," it is brimming and exposed. The prose reads the gradient; the classical terms (paksha,
 * tithi) stay in the glossary.
 */

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const DEG = Math.PI / 180;

/** The eight lived phases across the synodic month (45°-wide bins, centred on the syzygies/quarters). */
export type MoonPhase =
  | "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous"
  | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";

export interface MoonBrightness {
  /** Elongation of the Moon from the Sun, 0..360 (0 = new, 180 = full) — the shared source. */
  elongationDeg: number;
  /** Fraction of the disc lit, 0..1 — David's "% of light" (1 − cos(elong)) / 2. */
  illumination: number;
  /** true from new → full (gathering light), false from full → new (releasing it). */
  waxing: boolean;
  /** The classical half of the month — shukla (bright, waxing) or krishna (dark, waning). */
  paksha: "shukla" | "krishna";
  /** The Moon's brightness-strength as the day-trigger's dial, 0..1 — the classical paksha bala
   *  curve (linear in elongation, peaking at full), normalized. Depleted near new, brimming near full. */
  pakshaBala: number;
  /** The named lived phase. */
  phase: MoonPhase;
}

const PHASES: MoonPhase[] = [
  "new", "waxing-crescent", "first-quarter", "waxing-gibbous",
  "full", "waning-gibbous", "last-quarter", "waning-crescent",
];

/**
 * The Moon's brightness state from the Sun and Moon longitudes (deg). Same elongation the tithi and
 * karana are cut from, so it can never disagree with them.
 */
export function moonBrightness(sunLon: number, moonLon: number): MoonBrightness {
  const elong = norm360(moonLon - sunLon);
  const illumination = (1 - Math.cos(elong * DEG)) / 2;
  // shukla = elong [0, 180) (tithi 1–15), krishna = [180, 360) (tithi 16–30) — 180° is the instant of
  // full, where tithi flips to 16, so the boundary is exclusive.
  const waxing = elong < 180;
  // Paksha bala (classical): the Moon's strength climbs linearly with its distance from the Sun,
  // peaking at opposition (full) — 0 at new, 1 at full, symmetric back down to new.
  const pakshaBala = 1 - Math.abs(elong - 180) / 180;
  // Phase bins centred on the syzygies/quarters: new spans [337.5, 22.5), then every 45°.
  const phase = PHASES[Math.floor((norm360(elong + 22.5)) / 45) % 8];
  return {
    elongationDeg: +elong.toFixed(2),
    illumination: +illumination.toFixed(3),
    waxing,
    paksha: waxing ? "shukla" : "krishna",
    pakshaBala: +pakshaBala.toFixed(3),
    phase,
  };
}
