/**
 * Server re-export of the single canonical 27-nakshatra table. The table lives in
 * `shared/nakshatra-names.ts` (imported by client and server alike); this shim keeps the
 * existing `../vedic/nakshatra-names.js` import paths working. Never re-declare the array here.
 */
export { NAK27 } from "@shared/nakshatra-names";
