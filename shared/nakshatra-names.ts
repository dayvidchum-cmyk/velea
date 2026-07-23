/**
 * THE 27 NAKSHATRAS — canonical spelling, sidereal order (Ashwini = 0 … Revati = 26).
 *
 * THE SINGLE SOURCE, shared by server and client. Every module imports `NAK27` from here
 * (`@shared/nakshatra-names`); **never fork the table.** A divergent spelling in a copy makes a
 * `NAK27.findIndex(name)` lookup silently return -1 — the caller's `if (idx >= 0)` guard skips and
 * the reader loses their crown / tara / apex day with nothing thrown. That silent failure is why the
 * copies were consolidated here (David, 2026-07-22, open-issue #2) and why
 * `nakshatra-tables-agree.test.ts` fails the build if any module re-declares a 27-star order-array.
 *
 * This is the ORDER table only. Name-keyed data (each star's ruling planet, deity, bird, glossary
 * text) legitimately lives elsewhere keyed BY these names — that is not a fork.
 *
 * Provenance of the spellings: server/vedic/canon/nakshatra-tables-provenance.md
 */
export const NAK27: string[] = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
