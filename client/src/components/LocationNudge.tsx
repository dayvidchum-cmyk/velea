import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * "Looks like you've moved" nudge. When the device's physical location has drifted far
 * from the saved current location, offer a one-tap update so the daily sky (sunrise, hora,
 * golden hour, day boundary) recomputes for where the user actually is.
 *
 * Respectful by design:
 *   - Only runs for users who've ALREADY granted geolocation (flag set by LocationSheet on a
 *     successful GPS use) — never triggers an unsolicited permission prompt on load.
 *   - Additionally confirms `permissions.query` === "granted" when that API is available.
 *   - Throttled to once every few hours; a dismissed city won't nag again until they move on.
 */

const CHECK_KEY = "velea-loc-nudge-checked";   // last-run timestamp (throttle)
const DISMISS_KEY = "velea-loc-nudge-dismissed"; // city the user said "not now" to
const GEO_OK_KEY = "velea-geo-ok";              // set by LocationSheet after a GPS grant
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;   // don't re-check more than every 2h
const DRIFT_KM = 150;                           // same-TZ distance backstop (sunrise/hora shift)

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// UTC offset (minutes) for an IANA timezone right now — DST-aware. The device's own offset is
// -new Date().getTimezoneOffset(); comparing the two tells us the clock/date has actually shifted.
function tzOffsetMinutes(tz: string): number {
  const now = new Date();
  const loc = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((loc.getTime() - utc.getTime()) / 60000);
}

export default function LocationNudge() {
  const { data: saved } = trpc.settings.getLocation.useQuery();
  const setLocation = trpc.settings.setLocation.useMutation({
    onSuccess: () => window.location.reload(), // reload so panchang recomputes for the new place
  });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (!saved?.lat || !saved?.lon) return;                       // nothing to compare against
    if (localStorage.getItem(GEO_OK_KEY) !== "1") return;         // never prompt for permission here
    const last = Number(localStorage.getItem(CHECK_KEY) || 0);
    if (Date.now() - last < CHECK_INTERVAL_MS) return;            // throttle
    if (!navigator.geolocation) return;
    ran.current = true;

    (async () => {
      try {
        if (navigator.permissions?.query) {
          const st = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          if (st.state !== "granted") return; // don't call getCurrentPosition unless already granted
        }
      } catch {
        /* permissions API unsupported (older iOS) — rely on the GEO_OK flag above */
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          localStorage.setItem(CHECK_KEY, String(Date.now()));
          const { latitude, longitude } = pos.coords;
          const km = haversineKm(latitude, longitude, parseFloat(saved.lat!), parseFloat(saved.lon!));
          // Timezone-first: the clock/date changing is what actually breaks the output. Distance
          // is a backstop for big same-TZ east-west moves (which shift sunrise/hora).
          let tzChanged = false;
          try {
            if (saved.timezone) tzChanged = tzOffsetMinutes(saved.timezone) !== -new Date().getTimezoneOffset();
          } catch { /* bad tz string — fall back to distance only */ }
          if (!tzChanged && km < DRIFT_KM) return; // neither trigger met — nothing to do

          let city = "your current area";
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              city;
          } catch {
            /* keep the generic fallback */
          }

          if (localStorage.getItem(DISMISS_KEY) === city) return; // already declined for this place
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          toast(`Looks like you're in ${city}.`, {
            description: "Update your sky to here? Sunrise, hours, and day timing will follow.",
            duration: Infinity,
            action: {
              label: "Update",
              onClick: () => {
                localStorage.removeItem(DISMISS_KEY);
                setLocation.mutate({
                  city,
                  lat: latitude.toFixed(6),
                  lon: longitude.toFixed(6),
                  timezone,
                });
              },
            },
            cancel: {
              label: "Not now",
              onClick: () => localStorage.setItem(DISMISS_KEY, city),
            },
          });
        },
        () => {
          localStorage.setItem(CHECK_KEY, String(Date.now())); // failed/denied — back off, stay silent
        },
        { timeout: 8000, maximumAge: 30 * 60 * 1000, enableHighAccuracy: false }
      );
    })();
  }, [saved]);

  return null;
}
