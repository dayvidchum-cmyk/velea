import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Calendar, Clock, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BirthChartSheetProps {
  open: boolean;
  onClose: () => void;
}

// Common IANA timezones grouped by region, covering most users worldwide.
// The browser's detected timezone is pre-selected automatically.
const TIMEZONE_OPTIONS: { label: string; value: string }[] = [
  // Americas
  { label: "America/New_York (ET)", value: "America/New_York" },
  { label: "America/Chicago (CT)", value: "America/Chicago" },
  { label: "America/Denver (MT)", value: "America/Denver" },
  { label: "America/Los_Angeles (PT)", value: "America/Los_Angeles" },
  { label: "America/Anchorage (AKT)", value: "America/Anchorage" },
  { label: "Pacific/Honolulu (HT)", value: "Pacific/Honolulu" },
  { label: "America/Toronto (ET)", value: "America/Toronto" },
  { label: "America/Vancouver (PT)", value: "America/Vancouver" },
  { label: "America/Mexico_City (CT)", value: "America/Mexico_City" },
  { label: "America/Bogota (COT)", value: "America/Bogota" },
  { label: "America/Lima (PET)", value: "America/Lima" },
  { label: "America/Santiago (CLT)", value: "America/Santiago" },
  { label: "America/Sao_Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "America/Buenos_Aires (ART)", value: "America/Argentina/Buenos_Aires" },
  // Europe
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET/CEST)", value: "Europe/Berlin" },
  { label: "Europe/Madrid (CET/CEST)", value: "Europe/Madrid" },
  { label: "Europe/Rome (CET/CEST)", value: "Europe/Rome" },
  { label: "Europe/Amsterdam (CET/CEST)", value: "Europe/Amsterdam" },
  { label: "Europe/Stockholm (CET/CEST)", value: "Europe/Stockholm" },
  { label: "Europe/Warsaw (CET/CEST)", value: "Europe/Warsaw" },
  { label: "Europe/Athens (EET/EEST)", value: "Europe/Athens" },
  { label: "Europe/Istanbul (TRT)", value: "Europe/Istanbul" },
  { label: "Europe/Moscow (MSK)", value: "Europe/Moscow" },
  // Africa
  { label: "Africa/Cairo (EET)", value: "Africa/Cairo" },
  { label: "Africa/Lagos (WAT)", value: "Africa/Lagos" },
  { label: "Africa/Nairobi (EAT)", value: "Africa/Nairobi" },
  { label: "Africa/Johannesburg (SAST)", value: "Africa/Johannesburg" },
  // Middle East
  { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
  { label: "Asia/Riyadh (AST)", value: "Asia/Riyadh" },
  { label: "Asia/Tehran (IRST)", value: "Asia/Tehran" },
  { label: "Asia/Karachi (PKT)", value: "Asia/Karachi" },
  // South Asia
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Asia/Dhaka (BST)", value: "Asia/Dhaka" },
  { label: "Asia/Colombo (IST)", value: "Asia/Colombo" },
  { label: "Asia/Kathmandu (NPT)", value: "Asia/Kathmandu" },
  // Southeast Asia
  { label: "Asia/Bangkok (ICT)", value: "Asia/Bangkok" },
  { label: "Asia/Jakarta (WIB)", value: "Asia/Jakarta" },
  { label: "Asia/Singapore (SGT)", value: "Asia/Singapore" },
  { label: "Asia/Manila (PST)", value: "Asia/Manila" },
  { label: "Asia/Kuala_Lumpur (MYT)", value: "Asia/Kuala_Lumpur" },
  { label: "Asia/Ho_Chi_Minh (ICT)", value: "Asia/Ho_Chi_Minh" },
  // East Asia
  { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
  { label: "Asia/Hong_Kong (HKT)", value: "Asia/Hong_Kong" },
  { label: "Asia/Taipei (CST)", value: "Asia/Taipei" },
  { label: "Asia/Seoul (KST)", value: "Asia/Seoul" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  // Oceania
  { label: "Australia/Sydney (AEST/AEDT)", value: "Australia/Sydney" },
  { label: "Australia/Melbourne (AEST/AEDT)", value: "Australia/Melbourne" },
  { label: "Australia/Brisbane (AEST)", value: "Australia/Brisbane" },
  { label: "Australia/Perth (AWST)", value: "Australia/Perth" },
  { label: "Pacific/Auckland (NZST/NZDT)", value: "Pacific/Auckland" },
  { label: "Pacific/Fiji (FJT)", value: "Pacific/Fiji" },
  // UTC
  { label: "UTC (Coordinated Universal Time)", value: "UTC" },
];

export function BirthChartSheet({ open, onClose }: BirthChartSheetProps) {
  const { data: userSettings, isLoading } = trpc.settings.getBirthChart.useQuery(undefined, {
    enabled: open,
  });

  const utils = trpc.useUtils();
  const calculateChart = trpc.settings.calculateBirthChart.useMutation({
    onSuccess: () => {
      utils.settings.getBirthChart.invalidate();
      utils.panchang.today.invalidate();
      utils.profection.current.invalidate();
      // Invalidate dasha timeline so it recalculates with new Moon data
      utils.dasha.timeline.invalidate();
      toast.success("Birth chart calculated and saved");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to calculate birth chart");
    },
  });

  // Birth information inputs
  const [birthDate, setBirthDate] = useState<string>("");
  const [birthTime, setBirthTime] = useState<string>("");
  const [birthLocation, setBirthLocation] = useState<string>("");
  const [birthLat, setBirthLat] = useState<string>("");
  const [birthLon, setBirthLon] = useState<string>("");
  // Timezone: pre-populate from saved value, then from browser detection
  const [birthTimezone, setBirthTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });
  const [tzSearch, setTzSearch] = useState<string>("");

  useEffect(() => {
    if (userSettings) {
      setBirthDate(userSettings.birthDate ?? "");
      setBirthTime(userSettings.birthTime ?? "");
      setBirthLocation(userSettings.birthLocationCity ?? "");
      setBirthLat(userSettings.birthLocationLat ?? "");
      setBirthLon(userSettings.birthLocationLon ?? "");
      // Use saved timezone if present, otherwise keep browser-detected value
      if (userSettings.birthTimezone) {
        setBirthTimezone(userSettings.birthTimezone);
      }
    }
  }, [userSettings]);

  const filteredTimezones = tzSearch.trim()
    ? TIMEZONE_OPTIONS.filter(
        (tz) =>
          tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
          tz.value.toLowerCase().includes(tzSearch.toLowerCase())
      )
    : TIMEZONE_OPTIONS;

  function handleCalculate() {
    if (!birthDate || !birthTime || !birthLocation) {
      toast.error("Please enter birth date, time, and location");
      return;
    }
    if (!birthTimezone) {
      toast.error("Please select a birth timezone");
      return;
    }

    calculateChart.mutate({
      birthDate,
      birthTime,
      birthLocationCity: birthLocation,
      birthLocationLat: birthLat,
      birthLocationLon: birthLon,
      birthTimezone,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      {/* Sheet container */}
      <div className="bg-background w-full max-w-md flex flex-col" style={{ maxHeight: 'min(90vh, 680px)', height: 'auto', borderRadius: '24px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex-1">
            <h2 className="font-bold text-lg tracking-wide uppercase">Birth Information</h2>
            <p className="text-xs text-muted-foreground mt-1">Enter your birth details to calculate your Vedic chart</p>
          </div>
          <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-muted flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Birth Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar size={14} />
                  Birth Date
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Birth Time */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock size={14} />
                  Birth Time
                </label>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Birth Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <MapPin size={14} />
                  Birth Location (City)
                </label>
                <input
                  type="text"
                  value={birthLocation}
                  onChange={(e) => setBirthLocation(e.target.value)}
                  placeholder="e.g. New York, London, Mumbai"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Birth Timezone — required for accurate chart */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <Globe size={14} />
                  Birth Timezone
                  <span className="text-[12px] font-normal normal-case text-muted-foreground/70">(required for accurate chart)</span>
                </label>
                <input
                  type="text"
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                  placeholder="Search timezone..."
                  className="w-full border border-border rounded-t-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary border-b-0"
                />
                <select
                  value={birthTimezone}
                  onChange={(e) => {
                    setBirthTimezone(e.target.value);
                    setTzSearch("");
                  }}
                  size={4}
                  className="w-full border border-border rounded-b-lg px-3 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {filteredTimezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {birthTimezone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: <strong>{birthTimezone}</strong>
                  </p>
                )}
              </div>

              {/* Coordinates (optional) */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Coordinates (Optional — improves accuracy)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={birthLat}
                    onChange={(e) => setBirthLat(e.target.value)}
                    placeholder="Latitude"
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={birthLon}
                    onChange={(e) => setBirthLon(e.target.value)}
                    placeholder="Longitude"
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Button bar */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={handleCalculate}
            disabled={calculateChart.isPending || !birthDate || !birthTime || !birthLocation || !birthTimezone}
          >
            {calculateChart.isPending ? "Calculating..." : "Calculate & Save Birth Chart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
