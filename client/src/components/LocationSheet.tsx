import { useState, useEffect } from "react";
import { MapPin, LocateFixed, X, Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { captureCurrentLocation } from "@/lib/capture-location";

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
  /** Why the sheet opened (set by AppHeader from the velea-open-location event detail):
   *  "profile-switch" = confirm/change where the newly viewed person is (David's Q2);
   *  "missing" = no location entered at all;
   *  "day-override" = pick-a-date "where were you on this day?" — writes a per-profile-per-date
   *  row (profiles.setDayLocation), never the account's current-location slot.
   *  null = a plain chip tap. */
  context?: { reason: "profile-switch" | "missing" | "day-override"; name?: string; profileId?: number; date?: string } | null;
}

type Status = "idle" | "locating" | "geocoding" | "success" | "error";

export default function LocationSheet({ open, onClose, context }: LocationSheetProps) {
  const utils = trpc.useUtils();
  const [cityInput, setCityInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCity, setSavedCity] = useState<string | null>(null);

  const isDayOverride = context?.reason === "day-override" && context.profileId != null && !!context.date;

  const { data: locationData } = trpc.settings.getLocation.useQuery(undefined, {
    enabled: open && !isDayOverride,
  });
  // In override mode "currently set" means THIS day's stored place, not the account slot.
  const { data: dayOverride } = trpc.profiles.getDayLocation.useQuery(
    { profileId: context?.profileId ?? 0, date: context?.date ?? "" },
    { enabled: open && isDayOverride },
  );

  useEffect(() => {
    if (isDayOverride) setSavedCity(dayOverride?.city ?? null);
    else if (locationData?.city) setSavedCity(locationData.city);
  }, [locationData, dayOverride, isDayOverride]);

  // Fresh state every open (audit v762): with reload-on-save gone the sheet persists across
  // opens, so a stale error/success from last time would re-show on the next open.
  useEffect(() => {
    if (open) { setStatus("idle"); setErrorMsg(""); }
  }, [open]);

  const onSaved = {
    onSuccess: () => {
      setStatus("success");
      // Refresh IN PLACE — no window.location.reload(). The reload nuked whatever flow the
      // sheet opened from (the first-run welcome most painfully: set location → app reloads →
      // welcome gone → the ask comes around again. David: "friction much?"). Invalidating
      // every query recomputes the panchang/readings for the new place while the underlying
      // surface (welcome, Today, Horoscope) keeps its state.
      utils.invalidate();
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 1200);
    },
    onError: (err: { message: string }) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  };
  // Whether the door gate is still waiting on this profile. Read from the SAME query the chip and
  // the gate card use, so all three agree and one invalidation clears all three.
  const needsGroundConfirm = !!trpc.settings.getReadingLocation.useQuery().data?.needsGroundConfirm;
  const confirmGround = trpc.settings.confirmGround.useMutation();

  const setLocation = trpc.settings.setLocation.useMutation(onSaved);
  const setDayLocation = trpc.profiles.setDayLocation.useMutation(onSaved);
  const clearDayLocation = trpc.profiles.clearDayLocation.useMutation(onSaved);

  /** One save door — routes to the account slot or the per-date override by context. */
  async function saveLocation(v: { city: string; lat: string; lon: string; timezone: string }) {
    if (isDayOverride) {
      await setDayLocation.mutateAsync({ profileId: context!.profileId!, date: context!.date!, ...v });
    } else {
      await setLocation.mutateAsync(v);
      // THE DOOR GATE'S OTHER ANSWER (2026-07-21). Someone who reached this sheet from the gate
      // card said "no, the ground is wrong" and has now said what is right. Saving here is that
      // answer, so it stamps — otherwise the gate stays shut, no reading ever generates, and the
      // person is stranded with no way to tell the app they already fixed it.
      //
      // ONLY while the gate is pending. Stamping on every save would overwrite the hometown with
      // whatever city was entered, which is exactly wrong for the common case this app is built
      // for: someone travelling sets their CURRENT location, and their home base must survive it.
      // The two tiers exist to be different; this must not collapse them.
      if (needsGroundConfirm) await confirmGround.mutateAsync({ decision: "confirm", ...v });
    }
  }

  async function handleUseMyLocation() {
    setStatus("locating");
    setErrorMsg("");
    try {
      const captured = await captureCurrentLocation();
      setStatus("geocoding");
      await saveLocation(captured);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(`${e?.message ?? "Could not get your location."} Please enter your city manually.`);
    }
  }

  async function handleCitySearch() {
    if (!cityInput.trim()) return;
    setStatus("geocoding");
    setErrorMsg("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1`
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        setStatus("error");
        setErrorMsg("City not found. Try a different spelling or add the country.");
        return;
      }
      const { lat, lon, display_name } = data[0];
      // Extract city name from display_name (first segment)
      const city = display_name.split(",")[0].trim();
      // Resolve the tz from the CITY'S coordinates, not the device (a manually searched city can
      // be far from where the phone sits — device tz gave that city's sky on the wrong clock).
      let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        const r = await utils.settings.resolveTimezone.fetch({ lat: parseFloat(lat).toFixed(6), lon: parseFloat(lon).toFixed(6) });
        if (r.timezone) timezone = r.timezone;
      } catch { /* fall back to device tz */ }
      await saveLocation({
        city,
        lat: parseFloat(lat).toFixed(6),
        lon: parseFloat(lon).toFixed(6),
        timezone,
      });
    } catch {
      setStatus("error");
      setErrorMsg("Geocoding failed. Please try again.");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[140]"
        style={{ background: "oklch(0 0 0 / 0.4)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[140] mx-auto max-w-lg rounded-t-2xl"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          boxShadow: "0 -8px 32px oklch(0 0 0 / 0.18)",
          // Clear the fixed 72px bottom nav so the last row isn't hidden behind it.
          paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 1.5rem)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} style={{ color: "var(--color-primary)" }} />
            <span
              className="text-sm font-semibold uppercase tracking-wide"
              style={{
                color: "var(--color-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              Your Location
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-muted-foreground)" }} className="p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Context line — why the sheet opened on its own */}
          {context && status === "idle" && (
            <p className="text-sm px-1" style={{ color: "var(--color-foreground)", lineHeight: 1.5 }}>
              {context.reason === "profile-switch" ? (
                <>
                  Now reading{context.name ? <> for <strong>{context.name}</strong></> : " another chart"}.
                  The day is sampled where the body wakes up — set the place this reading should
                  live in{savedCity ? <>, or close to keep <strong>{savedCity}</strong></> : ""}.
                </>
              ) : context.reason === "day-override" ? (
                <>
                  Where in the world was this day lived? Its sky — sunrise, the day's turn, the
                  reading — is sampled there. Only this date changes.
                </>
              ) : (
                <>
                  No location set yet — today's timing is running on the app default. Set it once
                  and sunrise, the day's turn, and every reading are tuned to where you are.
                </>
              )}
            </p>
          )}

          {/* Day-override: existing row + the way back to the usual place */}
          {isDayOverride && dayOverride && status === "idle" && (
            <button
              onClick={() => { setStatus("geocoding"); clearDayLocation.mutate({ profileId: context!.profileId!, date: context!.date! }); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
            >
              This day is pinned to <strong>{dayOverride.city}</strong> — tap to remove and use the usual place.
            </button>
          )}

          {/* Current location display */}
          {!isDayOverride && savedCity && status === "idle" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--filter-pill-bg-active)",
                border: `1px solid var(--filter-pill-border-active)`,
                color: "var(--color-foreground)",
              }}
            >
              <MapPin size={13} style={{ color: "var(--color-primary)" }} />
              <span>
                Currently set to <strong>{savedCity}</strong>
              </span>
            </div>
          )}

          {/* Use my location button — hidden for a day-override (GPS says where you ARE,
              not where that day was lived) */}
          {!isDayOverride && (
          <button
            onClick={handleUseMyLocation}
            disabled={status === "locating" || status === "geocoding" || status === "success"}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
            style={{
              background: "var(--color-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
              opacity: status === "locating" || status === "geocoding" ? 0.7 : 1,
            }}
          >
            {status === "locating" || status === "geocoding" ? (
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-primary)" }} />
            ) : status === "success" ? (
              <Check size={18} style={{ color: "var(--color-primary)" }} />
            ) : (
              <LocateFixed size={18} style={{ color: "var(--color-primary)" }} />
            )}
            <div className="text-left">
              <p
                className="text-sm font-medium"
              >
                {status === "locating"
                  ? "Getting location…"
                  : status === "geocoding"
                  ? "Finding city…"
                  : status === "success"
                  ? "Location saved!"
                  : "Use my current location"}
              </p>
              {status === "idle" && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  Uses device GPS for accurate sunrise times
                </p>
              )}
            </div>
          </button>
          )}

          {/* Divider */}
          {!isDayOverride && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span
              className="text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>
          )}

          {/* City text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
              placeholder="Enter your city (e.g. Mumbai)"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--color-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
              disabled={status === "geocoding" || status === "success"}
            />
            <button
              onClick={handleCitySearch}
              disabled={!cityInput.trim() || status === "geocoding" || status === "success"}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: cityInput.trim() ? "var(--color-primary)" : "var(--color-secondary)",
                color: cityInput.trim() ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              Set
            </button>
          </div>

          {/* Error message */}
          {status === "error" && errorMsg && (
            <p
              className="text-xs px-1"
              style={{ color: "oklch(0.6 0.18 25)" }}
            >
              {errorMsg}
            </p>
          )}

          <p
            className="text-xs pb-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Your location is used only to calculate local sunrise times and day modes. It is not shared.
          </p>
        </div>
      </div>
    </>
  );
}
