import { useState, useEffect } from "react";
import { MapPin, LocateFixed, X, Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "locating" | "geocoding" | "success" | "error";

export default function LocationSheet({ open, onClose }: LocationSheetProps) {
  const [cityInput, setCityInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCity, setSavedCity] = useState<string | null>(null);

  const { data: locationData } = trpc.settings.getLocation.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (locationData?.city) {
      setSavedCity(locationData.city);
    }
  }, [locationData]);

  const setLocation = trpc.settings.setLocation.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => {
        onClose();
        // Reload to recalculate panchang with new location
        window.location.reload();
      }, 1200);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setStatus("locating");
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        localStorage.setItem("velea-geo-ok", "1"); // remembers the grant → enables the "you've moved" nudge
        const { latitude, longitude } = pos.coords;
        setStatus("geocoding");
        try {
          // Reverse geocode using a free public API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "My Location";
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await setLocation.mutateAsync({
            city,
            lat: latitude.toFixed(6),
            lon: longitude.toFixed(6),
            timezone,
          });
        } catch {
          setStatus("error");
          setErrorMsg("Could not determine your city. Please enter it manually.");
        }
      },
      (err) => {
        setStatus("error");
        setErrorMsg(
          err.code === 1
            ? "Location access denied. Please allow location access or enter your city manually."
            : "Could not get your location. Please enter your city manually."
        );
      },
      { timeout: 10000 }
    );
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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await setLocation.mutateAsync({
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
        className="fixed inset-0 z-50"
        style={{ background: "oklch(0 0 0 / 0.4)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl"
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
          {/* Current location display */}
          {savedCity && status === "idle" && (
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

          {/* Use my location button */}
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

          {/* Divider */}
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
