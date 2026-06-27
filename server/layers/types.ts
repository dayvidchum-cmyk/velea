/**
 * Pressure-layer system — shared output types.
 *
 * Architecture rule: each layer produces ONLY its own output. No layer reads or
 * mutates another layer's result. Composition happens at the ranking layer
 * (task-scorer), never inside a layer engine.
 *
 * v1 ships Layer 2 (Time Lord theme) and Layer 3 (Transit pressure).
 * Layer 1 (Panchapakshi) is deferred until an authoritative table is supplied;
 * the combined shape omits it for now and will add it in that round.
 */

// ── Layer 2: Time Lord period theme ──────────────────────────────────────────

export interface TimeLordPeriod {
  mahaDasha: string;
  antarDasha: string;
  /** Static 3–5 word theme phrase for this MD/AD combination. */
  theme: string;
}

// ── Layer 3: Transit pressure ────────────────────────────────────────────────

export type TransitingPlanet = "Saturn" | "Rahu" | "Ketu";
export type NatalPoint = "Sun" | "Moon" | "Lagna";
export type TransitSeverity = "high" | "moderate" | "low";

export interface ActiveTransit {
  transitingPlanet: TransitingPlanet;
  natalPoint: NatalPoint;
  /** Absolute conjunction orb in degrees (0–3). */
  orb: number;
  severity: TransitSeverity;
}

export interface TransitPressure {
  active: ActiveTransit[];
}

// ── Combined endpoint output ─────────────────────────────────────────────────

export interface CurrentLayers {
  timeLordPeriod: TimeLordPeriod | null;
  transits: TransitPressure;
  /** ISO timestamp of when these layers were computed. */
  computedAt: string;
}
