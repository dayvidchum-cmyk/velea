/**
 * Explicit Response Contracts for Profection Engine
 * 
 * These interfaces define the exact shape of data flowing between:
 * - Natal chart engine → Profection engine
 * - Profection engine → Interpreter
 * - Interpreter → Router/API
 * - Router/API → Frontend renderer
 * 
 * All required fields are non-optional to prevent silent shape changes.
 * Optional fields are explicitly marked as such.
 */

/**
 * Natal Time Lord Placement Contract
 * Required fields for Time Lord natal position
 */
export interface NatalTimeLordPlacement {
  planet: string; // e.g. "Venus", "Mercury"
  sign: string; // e.g. "Aquarius", "Taurus"
  house: number; // 1-12 from Lagna
  nakshatra: string | null; // e.g. "Shatabhisha", "Ashwini" (nullable from DB)
  pada: number | null; // 1-4 (nullable from DB)
  degree: string; // e.g. "12.60"
}

/**
 * Natal Chart Contract
 * Complete natal chart data passed to interpreter
 */
export interface NatalChartContract {
  lagnaSign: string | null;
  bodies: NatalTimeLordPlacement[];
}

/**
 * Secondary Transit Conditions Contract
 * Additional astrological conditions affecting the transit
 */
export interface SecondaryTransitConditions {
  coPresentPlanets?: string[]; // Other planets in same sign
  rahuKetuPresence?: "Rahu" | "Ketu" | "Both" | null; // Rahu/Ketu presence
  combustionStatus?: boolean; // Is Time Lord combust?
  closeConjunctions?: string[]; // Planets within 4 degree orb
  solitaryStatus?: boolean; // Is Time Lord alone in sign?
}

/**
 * Time Lord Transit Record Contract
 * Single transit period for the Time Lord
 * All required fields must be present
 */
export interface TimeLordTransitRecord {
  startDate: string; // ISO date: YYYY-MM-DD
  endDate: string; // ISO date: YYYY-MM-DD
  timeLord: string; // e.g. "Venus"
  sign: string; // e.g. "Taurus"
  house: number; // 1-12 from Lagna
  retrogradeStatus: boolean; // Is Time Lord retrograde?
  secondaryConditions: SecondaryTransitConditions; // Additional conditions
}

/**
 * Profection Year Interpretation Contract
 * All interpretation sections required
 */
export interface ProfectionInterpretationContract {
  operationalChain: string; // House → Sign → Time Lord → Natal Placement chain
  section5: string; // Yearly Focus
  section6: string; // What Supports Growth
  section7: string; // What Creates Friction
  quickReference: string; // Quick reference summary
}

/**
 * Profection Year Data Contract
 * Core profection year calculation results
 */
export interface ProfectionYearDataContract {
  age: number; // User's age at profection year start
  activatedHouse: number; // 1-12
  activatedSign: string; // e.g. "Taurus"
  timeLord: string; // Ruling planet for this house
  yearStart: string; // ISO date: YYYY-MM-DD
  yearEnd: string; // ISO date: YYYY-MM-DD
  lagnaSign: string; // User's lagna sign
}

/**
 * Time Lord Movement Section Contract
 * Complete transit data for Section 4
 */
export interface TimeLordMovementContract {
  transits: TimeLordTransitRecord[];
}

/**
 * Profection Year API Response Contract
 * Complete response from profection.forDate endpoint
 */
export interface ProfectionYearResponseContract {
  profection: ProfectionYearDataContract;
  interpretation: ProfectionInterpretationContract;
}

/**
 * Profection Year with Transits Response Contract
 * Response from profection.timeLordTransits endpoint
 */
export interface ProfectionYearWithTransitsResponseContract {
  transits: TimeLordTransitRecord[];
}
