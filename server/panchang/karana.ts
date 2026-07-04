/**
 * KARANA — half of a tithi (the Moon gaining 6° of elongation over the Sun).
 * There are 60 karanas in a lunar month (2 per tithi). Eleven distinct karanas:
 *   • 7 movable (chara), which repeat 8 times through the month:
 *       Bava, Balava, Kaulava, Taitila, Garaja, Vanija, Vishti(Bhadra)
 *   • 4 fixed (sthira), each occurring once per month:
 *       Kimstughna, Shakuni, Chatushpada, Naga
 *
 * Canonical placement over the 60 half-tithis (n = 1..60):
 *   n = 1                → Kimstughna              (1st half of Shukla Pratipada)
 *   n = 2..57            → the 7 chara, repeating  (56 = 8 × 7)
 *   n = 58               → Shakuni                 (2nd half of Krishna Chaturdashi)
 *   n = 59               → Chatushpada             (1st half of Amavasya)
 *   n = 60               → Naga                    (2nd half of Amavasya)
 *
 * Deterministic: derived from the SAME sun/moon elongation as the tithi
 *   tithi   = floor(elong / 12) + 1        (1..30)
 *   karanaN = floor(elong / 6)  + 1        (1..60)
 * so karanaN ∈ {2·tithi − 1, 2·tithi} always — it can be cross-checked against
 * the (already-trusted) tithi. Vishti/Bhadra is the classically inauspicious one
 * (avoid initiating). Meaning is exposed but NOT wired into mode logic here.
 */

export type KaranaQuality = "benefic" | "inauspicious" | "mixed";

export interface Karana {
  number: number;   // 1..60 (which half-tithi of the month)
  name: string;     // e.g. "Bava", "Vishti"
  altName?: string; // e.g. Vishti → "Bhadra"
  movable: boolean;  // chara (true) vs sthira/fixed (false)
  quality: KaranaQuality;
}

// The 7 chara (movable) karanas, in cycle order.
const CHARA: { name: string; altName?: string; quality: KaranaQuality }[] = [
  { name: "Bava", quality: "benefic" },
  { name: "Balava", quality: "benefic" },
  { name: "Kaulava", quality: "benefic" },
  { name: "Taitila", quality: "benefic" },
  { name: "Garaja", quality: "benefic" },
  { name: "Vanija", quality: "benefic" },
  { name: "Vishti", altName: "Bhadra", quality: "inauspicious" }, // the malefic karana — avoid initiating
];

// The 4 sthira (fixed) karanas, generally mixed/inauspicious for new ventures.
const FIXED: Record<number, { name: string; quality: KaranaQuality }> = {
  1: { name: "Kimstughna", quality: "mixed" },
  58: { name: "Shakuni", quality: "inauspicious" },
  59: { name: "Chatushpada", quality: "mixed" },
  60: { name: "Naga", quality: "inauspicious" },
};

const norm = (x: number) => ((x % 360) + 360) % 360;

/** Karana number (1..60) from the Sun/Moon sidereal longitudes. */
export function karanaNumber(sunLon: number, moonLon: number): number {
  return Math.floor(norm(moonLon - sunLon) / 6) + 1; // 1..60
}

/** Full karana for the given Sun/Moon longitudes. */
export function karanaFromLongitudes(sunLon: number, moonLon: number): Karana {
  return karanaFromNumber(karanaNumber(sunLon, moonLon));
}

/** Full karana from its 1..60 number (pure — the canonical sequence). */
export function karanaFromNumber(n: number): Karana {
  if (n < 1 || n > 60 || !Number.isInteger(n)) throw new Error(`karana number out of range: ${n}`);
  if (FIXED[n]) {
    const f = FIXED[n];
    return { number: n, name: f.name, movable: false, quality: f.quality };
  }
  // n = 2..57 → the 7 chara repeating (n=2 is the first chara, Bava)
  const c = CHARA[(n - 2) % 7];
  return { number: n, name: c.name, altName: c.altName, movable: true, quality: c.quality };
}
