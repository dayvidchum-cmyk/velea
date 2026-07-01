/**
 * PANCHANG DAY-QUALITY — the collective "is today an auspicious day?" signal.
 *
 * Classical muhurta hygiene: a day is auspicious when its nakshatra is benefic, its
 * tithi is not Rikta / Amavasya, and its yoga is not one of the malefic yogas. This
 * is the UNIVERSAL side of a golden moment (same for everyone); the individual side
 * (the check-in, acting as Panchapakshi) confirms it per person.
 *
 * All three are derivable from the sidereal Sun & Moon longitudes alone.
 */

// Nakshatra benefic/malefic classification (0-indexed, Ashwini = 0).
// +1 benefic, -1 harsh, 0 neutral — a common general-purpose grouping.
const NAKSHATRA_SCORE: number[] = [
  +1, // 0  Ashwini
  -1, // 1  Bharani
  -1, // 2  Krittika
  +1, // 3  Rohini
  +1, // 4  Mrigashira
  -1, // 5  Ardra
  +1, // 6  Punarvasu
  +1, // 7  Pushya (most auspicious)
  -1, // 8  Ashlesha
  -1, // 9  Magha
  -1, // 10 Purva Phalguni
  +1, // 11 Uttara Phalguni
  +1, // 12 Hasta
  +1, // 13 Chitra
  +1, // 14 Swati
  -1, // 15 Vishakha
  +1, // 16 Anuradha
  -1, // 17 Jyeshtha
  -1, // 18 Mula
  -1, // 19 Purva Ashadha
  +1, // 20 Uttara Ashadha
  +1, // 21 Shravana
  +1, // 22 Dhanishtha
  +1, // 23 Shatabhisha
  -1, // 24 Purva Bhadrapada
  +1, // 25 Uttara Bhadrapada
  +1, // 26 Revati
];

// Malefic yogas (1-indexed classical order: Vishkumbha = 1 … Vaidhriti = 27).
const MALEFIC_YOGAS = new Set([1, 6, 9, 10, 13, 15, 17, 19, 27]);

const TWO_PI_27 = 360 / 27;

export interface DayQuality {
  tithi: number; // 1–30
  nakshatra: number; // 0–26
  yoga: number; // 1–27
  score: number; // net auspiciousness
  auspicious: boolean;
}

/** Tithi score: Purnima/Purna favor, Rikta/Amavasya against, else neutral. */
function tithiScore(tithi: number): number {
  if (tithi === 30) return -1; // Amavasya (new moon)
  if (tithi === 15) return +1; // Purnima (full moon)
  const inPaksha = ((tithi - 1) % 15) + 1; // 1–15
  if (inPaksha === 4 || inPaksha === 9 || inPaksha === 14) return -1; // Rikta
  if (inPaksha === 5 || inPaksha === 10) return +1; // Purna
  return 0;
}

/**
 * Day-quality from sidereal Sun & Moon longitudes (degrees).
 * Auspicious = benefic nakshatra AND non-negative tithi AND non-malefic yoga,
 * with a net score at or above the threshold (kept rare/special).
 */
export function dayQuality(sunLon: number, moonLon: number, threshold = 2): DayQuality {
  const norm = (x: number) => ((x % 360) + 360) % 360;
  const moon = norm(moonLon);
  const sun = norm(sunLon);
  const tithi = Math.floor(norm(moon - sun) / 12) + 1; // 1–30
  const nakshatra = Math.floor(moon / TWO_PI_27) % 27; // 0–26
  const yoga = (Math.floor(norm(sun + moon) / TWO_PI_27) % 27) + 1; // 1–27

  const nScore = NAKSHATRA_SCORE[nakshatra] ?? 0;
  const tScore = tithiScore(tithi);
  const yScore = MALEFIC_YOGAS.has(yoga) ? -1 : 0;
  const score = nScore + tScore + yScore;

  // Auspicious: strong net AND no outright malefic factor dragging it.
  const auspicious = score >= threshold && nScore > 0 && tScore >= 0 && yScore >= 0;
  return { tithi, nakshatra, yoga, score, auspicious };
}
