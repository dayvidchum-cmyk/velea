/**
 * One-tap current-location capture: device GPS → Nominatim reverse geocode → device tz.
 * Shared by the LocationSheet's GPS button and the first-run welcome's gold button (which
 * must DO the thing it says — "Set my current location" — not open another asking surface;
 * David, 2026-07-18 "friction much?"). Throws with a human message on denial/failure so
 * callers can fall back to the manual city-entry sheet.
 */
export type CapturedLocation = { city: string; lat: string; lon: string; timezone: string };

export function captureCurrentLocation(): Promise<CapturedLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try { localStorage.setItem("velea-geo-ok", "1"); } catch { /* ignore */ } // enables the "you've moved" nudge
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "My Location";
          resolve({
            city,
            lat: latitude.toFixed(6),
            lon: longitude.toFixed(6),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        } catch {
          reject(new Error("Could not determine your city."));
        }
      },
      (err) => {
        reject(new Error(err.code === 1 ? "Location access denied." : "Could not get your location."));
      },
      { timeout: 10000 },
    );
  });
}
