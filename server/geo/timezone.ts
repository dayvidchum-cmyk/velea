import tzlookup from "tz-lookup";

/**
 * Resolve the IANA timezone name (e.g. "America/New_York") for a coordinate.
 * Offline lookup — no API/key. Returns null for invalid/out-of-range input.
 */
export function timezoneForCoords(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  try {
    return tzlookup(lat, lon);
  } catch {
    return null;
  }
}
