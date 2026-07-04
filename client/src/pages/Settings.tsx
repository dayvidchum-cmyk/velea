import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Eye, EyeOff, ChevronDown, ChevronUp, Users, RefreshCw, Compass, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { resetOnboarding, fireTaskGuide, startTour } from "@/components/Onboarding";
import { useSettingsContext } from "@/contexts/SettingsContext";
import type { SettingsState, TodayTaskLimit } from "@/hooks/useSettings";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";

// ─── Reusable setting row ─────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
          {label}
        </p>
        <div className="flex-shrink-0">{children}</div>
      </div>
      {/* Description spans the FULL width below (not squeezed beside the control) so long
          copy wraps to fewer lines and the row stays short. */}
      {description && (
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
          {description}
        </p>
      )}
    </div>
  );
}

// ─── Toggle button pair ───────────────────────────────────────────────────────

function TogglePair<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => React.ReactNode;
}) {
  return (
    <div
      className="flex rounded-md overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
          style={{
            letterSpacing: "0.02em",
            background: value === opt
              ? "var(--color-foreground)"
              : "transparent",
            color: value === opt
              ? "var(--color-background)"
              : "var(--color-muted-foreground)",
            borderRight: i < options.length - 1
              ? "1px solid var(--border)"
              : "none",
            cursor: "pointer",
          }}
        >
          {renderLabel ? renderLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SettingsSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const modeColor = useDayModeColor();
  const [open, setOpen] = useState(defaultOpen); // collapsed by default — minimize overload
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1.5px solid ${modeColor}`,
        background: `color-mix(in srgb, ${modeColor} 14%, var(--background))`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between"
        style={{ background: modeColor, border: "none", cursor: "pointer" }}
      >
        <span className="text-sm font-bold uppercase" style={{ color: "#ffffff", letterSpacing: "0.08em" }}>
          {title}
        </span>
        <ChevronDown size={18} style={{ color: "#ffffff", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && <div className="px-5">{children}</div>}
    </div>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed. Other devices have been signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (err) => toast.error(err.message || "Failed to change password"),
  });

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current &&
    !changePassword.isPending;

  const mismatch = confirm.length > 0 && next !== confirm;

  const inputStyle: React.CSSProperties = {
    background: "var(--color-secondary)",
    border: "1px solid var(--color-border)",
    color: "var(--color-foreground)",
  };

  return (
    <SettingsSection title="Password">
      <div className="py-4 space-y-3">
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            style={inputStyle}
          />
        </div>
        <input
          type={show ? "text" : "password"}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          style={inputStyle}
        />
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          style={{ ...inputStyle, borderColor: mismatch ? "var(--destructive, #d9534f)" : "var(--color-border)" }}
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
            {show ? "Hide" : "Show"}
          </button>
          {mismatch && (
            <span className="text-xs" style={{ color: "var(--destructive, #d9534f)" }}>
              Passwords don't match
            </span>
          )}
        </div>
        <Button
          onClick={() => changePassword.mutate({ currentPassword: current, newPassword: next })}
          disabled={!canSubmit}
          size="sm"
          className="w-full"
        >
          {changePassword.isPending ? "Updating…" : "Change Password"}
        </Button>
      </div>
    </SettingsSection>
  );
}

// ─── Astrology Debug Panel (removed) ────────────────────────────────────────

function AstrologyDebugPanel() { return null; }

function _AstrologyDebugPanel_UNUSED() {
  const [expanded, setExpanded] = useState(false);
  const birthChartQuery = trpc.settings.getBirthChart.useQuery();
  const utils = trpc.useUtils();
  const dashaQuery = trpc.dasha.timeline.useQuery(undefined, {
    enabled: expanded,
    retry: false,
  });

  const recalcMutation = trpc.settings.calculateBirthChart.useMutation({
    onSuccess: () => {
      utils.settings.getBirthChart.invalidate();
      utils.panchang.today.invalidate();
      utils.profection.current.invalidate();
      utils.dasha.timeline.invalidate();
      toast.success("Birth chart recalculated");
    },
    onError: (err) => toast.error(err.message || "Recalculation failed"),
  });

  function handleRecalculate() {
    const d = birthChartQuery.data;
    if (!d?.birthDate || !d?.birthTime || !d?.birthLocationCity) {
      toast.error("No saved birth data to recalculate from");
      return;
    }
    recalcMutation.mutate({
      birthDate: d.birthDate,
      birthTime: d.birthTime,
      birthLocationCity: d.birthLocationCity,
      birthLocationLat: d.birthLocationLat ?? undefined,
      birthLocationLon: d.birthLocationLon ?? undefined,
      birthTimezone: d.birthTimezone ?? "UTC",
    });
  }

  const chart = birthChartQuery.data;
  const moon = chart?.natalBodies?.find((b: any) => b.planet === 'Moon');
  const dasha = dashaQuery.data;

  // Compute UTC birth ISO from stored birth date + time + timezone
  const utcBirthIso = (() => {
    if (!chart?.birthDate || !chart?.birthTime || !chart?.birthTimezone) return null;
    try {
      // Use Intl to convert local birth time to UTC
      const [y, mo, d] = chart.birthDate.split('-').map(Number);
      const [h, mi] = chart.birthTime.split(':').map(Number);
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: chart.birthTimezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
      // Binary search for UTC ms matching local time
      let lo = Date.UTC(y, mo - 1, d - 1, 0, 0, 0);
      let hi = Date.UTC(y, mo - 1, d + 1, 23, 59, 59);
      const target = h * 60 + mi;
      const targetDate = y * 10000 + mo * 100 + d;
      for (let i = 0; i < 50; i++) {
        const mid = Math.floor((lo + hi) / 2);
        const parts = fmt.formatToParts(new Date(mid));
        const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0');
        const lDate = get('year') * 10000 + get('month') * 100 + get('day');
        const lMin = get('hour') * 60 + get('minute');
        if (lDate < targetDate || (lDate === targetDate && lMin < target)) lo = mid + 1;
        else hi = mid;
      }
      return new Date(lo).toISOString();
    } catch { return null; }
  })();

  const monoStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: 'var(--color-foreground)',
    lineHeight: '1.6',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--color-muted-foreground)',
    minWidth: '180px',
    display: 'inline-block',
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        style={{ background: 'var(--input)', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
      >
        <p className="text-sm font-bold uppercase" style={{ color: 'var(--amber-gold)', letterSpacing: '0.04em' }}>
          Astrology Debug
        </p>
        {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-muted-foreground)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-muted-foreground)' }} />}
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-4">

          {/* Recalculate button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleRecalculate}
            disabled={recalcMutation.isPending || !chart?.birthDate}
          >
            <RefreshCw size={13} className={recalcMutation.isPending ? "animate-spin" : ""} />
            {recalcMutation.isPending ? "Recalculating..." : "Recalculate from Saved Birth Data"}
          </Button>

          {/* Birth timestamps */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--amber-gold)', letterSpacing: '0.04em' }}>Birth Timestamps</p>
            <div style={monoStyle}>
              <div><span style={labelStyle}>Local birth:</span> {chart?.birthDate ?? '—'} {chart?.birthTime ?? ''} {chart?.birthTimezone ?? ''}</div>
              <div><span style={labelStyle}>UTC birth (computed):</span> {utcBirthIso ?? '—'}</div>
            </div>
          </div>

          {/* Moon data */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--amber-gold)', letterSpacing: '0.04em' }}>Moon</p>
            {moon ? (
              <div style={monoStyle}>
                <div><span style={labelStyle}>Sidereal longitude:</span> {moon.longitude ? `${parseFloat(moon.longitude).toFixed(6)}°` : `(reconstructed) ${moon.sign ? ((['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(moon.sign)) * 30 + parseFloat(moon.degree || '0')).toFixed(4) + '°' : '—'}`}</div>
                <div><span style={labelStyle}>Sign:</span> {moon.sign} {parseFloat(moon.degree || '0').toFixed(4)}°</div>
                <div><span style={labelStyle}>Nakshatra:</span> {moon.nakshatra ?? '—'} pada {moon.pada ?? '—'}</div>
              </div>
            ) : (
              <p style={{ ...monoStyle, color: 'var(--color-muted-foreground)' }}>No Moon data — calculate birth chart first.</p>
            )}
          </div>

          {/* Dasha balance */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--amber-gold)', letterSpacing: '0.04em' }}>Vimshottari Dasha</p>
            {dashaQuery.isLoading ? (
              <p style={{ ...monoStyle, color: 'var(--color-muted-foreground)' }}>Calculating…</p>
            ) : dashaQuery.error ? (
              <p style={{ ...monoStyle, color: 'var(--color-muted-foreground)' }}>{dashaQuery.error.message}</p>
            ) : dasha ? (
              <div style={monoStyle}>
                <div><span style={labelStyle}>Starting dasha lord:</span> {dasha.startingDashaLord}</div>
                <div><span style={labelStyle}>Moon nakshatra:</span> {dasha.moonNakshatra}</div>
                <div><span style={labelStyle}>Current Mahadasha:</span> {dasha.currentMahadasha ?? '—'}</div>
                <div><span style={labelStyle}>Current Antardasha:</span> {dasha.currentAntardasha ?? '—'}</div>
                <div className="mt-2"><span style={labelStyle}>Full Mahadasha timeline:</span></div>
                {(() => {
                  // Group entries by mahadasha
                  const mahas: Record<string, { start: string; end: string }> = {};
                  for (const e of dasha.entries) {
                    if (!mahas[e.mahadasha]) mahas[e.mahadasha] = { start: e.startDate, end: e.endDate };
                    else mahas[e.mahadasha].end = e.endDate;
                  }
                  return Object.entries(mahas).map(([lord, { start, end }]) => (
                    <div key={lord} style={{ paddingLeft: '180px' }}>
                      {lord.padEnd(8, '\u00a0')} {start} → {end}
                    </div>
                  ));
                })()}
              </div>
            ) : null}
          </div>

          {/* All planets */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--amber-gold)', letterSpacing: '0.04em' }}>All Natal Bodies</p>
            {chart?.natalBodies && chart.natalBodies.length > 0 ? (
              <div style={monoStyle}>
                {chart.natalBodies.map((b: any) => (
                  <div key={b.planet}>
                    <span style={labelStyle}>{b.planet}:</span>
                    {b.sign} {parseFloat(b.degree || '0').toFixed(2)}° H{b.house}
                    {b.nakshatra ? ` · ${b.nakshatra} p${b.pada}` : ''}
                    {b.longitude ? ` · lon=${parseFloat(b.longitude).toFixed(4)}°` : ''}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ ...monoStyle, color: 'var(--color-muted-foreground)' }}>No natal body data.</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function fmtBirthDate(d?: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${MONTHS_LONG[m - 1]} ${day}, ${y}`;
}
function fmtBirthTime(t?: string | null) {
  if (!t) return null;
  const [h, mi] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(mi ?? 0).padStart(2, "0")} ${period}`;
}

export default function Settings() {
  const { settings, updateSetting, saveSettings } = useSettingsContext();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const modeColor = useDayModeColor();
  const { data: subject } = trpc.profiles.getSubject.useQuery();
  const { data: locationData } = trpc.settings.getLocation.useQuery();
  const utils = trpc.useUtils();

  // ── Guided tours (server-persisted) ──
  const tourStateQ = trpc.settings.getTourState.useQuery();
  const toursEnabled = tourStateQ.data?.enabled ?? true;
  const setToursEnabledMutation = trpc.settings.setToursEnabled.useMutation({
    onSuccess: () => utils.settings.getTourState.invalidate(),
  });
  const resetToursMutation = trpc.settings.resetTours.useMutation({
    onSuccess: () => utils.settings.getTourState.invalidate(),
  });

  function handleReplayIntro() {
    resetToursMutation.mutate();
    resetOnboarding(user?.id); // clear legacy localStorage flag too
    toast.success("Tours reset — you'll see each page's tour again");
    navigate("/");
  }

  const logoutMutation = trpc.auth.logout.useMutation();
  const logoutOthersMutation = trpc.auth.logoutOtherSessions.useMutation({
    onSuccess: () => toast.success("Signed out of all other devices."),
    onError: (err) => toast.error(err.message || "Failed to sign out other devices"),
  });
  const forceLogoutAll = trpc.auth.forceLogoutAllUsers.useMutation({
    onSuccess: (r) => toast.success(`Cleared ${r.count} session${r.count === 1 ? "" : "s"} — everyone re-logs in on next open. You stayed signed in.`),
    onError: (err) => toast.error(err.message || "Failed to force logout"),
  });

  // Local draft — mirrors the live settings but only persists on Save
  const [draft, setDraft] = useState<SettingsState>(() => ({ ...settings }));
  const [isDirty, setIsDirty] = useState(false);

  function updateDraft<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // Live-preview appearance and orb counts immediately (non-destructive)
    updateSetting(key, value);
    setIsDirty(true);
  }

  function handleSave() {
    saveSettings(draft);
    setIsDirty(false);
    toast.success("Settings saved", { duration: 800 });
  }

  const TASK_LIMIT_OPTIONS: TodayTaskLimit[] = [1, 2, 3, 4, 5, "unlimited"];

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Redirect to login
        window.location.href = "/";
      },
    });
  };

  return (
    <div className="container py-6 pb-28 max-w-lg mx-auto">
      <AppHeader pageTitle="Settings" />
      <div className="flex justify-end mt-2 mb-2">
        <Button
          onClick={handleSave}
          size="sm"
          style={{
            background: "var(--color-foreground)",
            color: "var(--color-background)",
            fontSize: "0.75rem",
            padding: "0.25rem 0.75rem",
          }}
        >
          Save
        </Button>
      </div>

      {isDirty && (
        <p
          className="text-xs mb-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          You have unsaved changes
        </p>
      )}

      <div className="space-y-5">

        {/* ── Profile ───────────────────────────────────────────────────── */}
        <SettingsSection title="Profile">
          <div className="py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-base font-bold" style={{ color: "var(--color-foreground)" }}>
              {subject?.name ?? user?.name ?? "Your profile"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {[fmtBirthDate(subject?.birthDate), fmtBirthTime(subject?.birthTime), subject?.birthLocationCity].filter(Boolean).join(" · ") || "No birth details yet"}
            </p>
            {subject?.lagnaSign && (
              <p className="text-xs font-semibold uppercase mt-1.5" style={{ color: modeColor, letterSpacing: "0.06em" }}>
                {subject.lagnaSign} Lagna
              </p>
            )}
          </div>
          <div className="py-4">
            <button
              onClick={() => navigate("/profiles")}
              className="w-full text-sm font-semibold py-2.5 rounded-lg transition-colors"
              style={{ background: "var(--color-secondary)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
            >
              Edit birth details
            </button>
          </div>

          {/* Current location — where you are NOW (separate from birth place); drives
              local sunrise, panchang timing, yamas, and hora. Opens the shared
              LocationSheet (device GPS or manual city) mounted in AppHeader. */}
          <div className="py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={13} style={{ color: modeColor }} />
              <p className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>Current location</p>
            </div>
            <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {locationData?.city
                ? <>Set to <strong style={{ color: "var(--color-foreground)" }}>{locationData.city}</strong> — makes today's sunrise, timing, and transits accurate. Update it when you travel.</>
                : <>Not set — we can't compute your local sunrise and timing accurately until you tell us where you are.</>}
            </p>
            <button
              onClick={() => window.dispatchEvent(new Event("velea-open-location"))}
              className="w-full text-sm font-semibold py-2.5 rounded-lg transition-colors"
              style={{
                background: locationData?.city ? "var(--color-secondary)" : "var(--color-primary)",
                color: locationData?.city ? "var(--color-foreground)" : "var(--color-primary-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              {locationData?.city ? "Change current location" : "Set your location"}
            </button>
          </div>
        </SettingsSection>

        {/* ── Interface & Focus ─────────────────────────────────────────── */}
        <SettingsSection title="Interface & Focus">

          {/* 1. Appearance */}
          <SettingRow
            label="Appearance"
            description="System follows your device settings."
          >
            <TogglePair
              options={["system", "dark", "light"] as const}
              value={draft.appearance}
              onChange={(v) => updateDraft("appearance", v as "system" | "dark" | "light")}
              renderLabel={(v) => (
                <span className="flex items-center gap-1.5">
                  {v === "system" ? <Monitor size={11} /> : v === "dark" ? <Moon size={11} /> : <Sun size={11} />}
                  {v === "system" ? "System" : v === "dark" ? "Dark" : "Light"}
                </span>
              )}
            />
          </SettingRow>

          {/* 2. Task Orb Counts */}
          <SettingRow
            label="Show Task Counts On Orbs"
            description="When off, orbs show a dot instead of a number."
          >
            <TogglePair
              options={["on", "off"] as const}
              value={draft.showOrbCounts ? "on" : "off"}
              onChange={(v) => updateDraft("showOrbCounts", v === "on")}
              renderLabel={(v) => (
                <span className="flex items-center gap-1.5">
                  {v === "on" ? <Eye size={11} /> : <EyeOff size={11} />}
                  {v === "on" ? "On" : "Off"}
                </span>
              )}
            />
          </SettingRow>

          {/* Verdict shapes ranking */}
          <SettingRow
            label="Let the daily verdict shape my task order"
            description="When on, the day's go/hold call gently tilts task ranking — discretionary work rises on a strong day, recedes on a hold day."
          >
            <TogglePair
              options={["on", "off"] as const}
              value={draft.verdictShapesRanking ? "on" : "off"}
              onChange={(v) => updateDraft("verdictShapesRanking", v === "on")}
              renderLabel={(v) => <span>{v === "on" ? "On" : "Off"}</span>}
            />
          </SettingRow>


          {/* 3. Today Task Limit */}
          <SettingRow
            label="Tasks Shown At One Time"
            description="How many tasks appear in the Today view simultaneously. When a task is completed, the next eligible task enters the list."
          >
            <div
              className="flex rounded-md overflow-hidden flex-wrap gap-px"
              style={{ border: "1px solid var(--border)" }}
            >
              {TASK_LIMIT_OPTIONS.map((opt, i) => (
                <button
                  key={String(opt)}
                  onClick={() => updateDraft("todayTaskLimit", opt)}
                  className="px-2.5 py-1.5 text-xs font-semibold transition-all duration-150"
                  style={{
                    letterSpacing: "0.02em",
                    background: draft.todayTaskLimit === opt
                      ? "var(--color-foreground)"
                      : "transparent",
                    color: draft.todayTaskLimit === opt
                      ? "var(--color-background)"
                      : "var(--color-muted-foreground)",
                    borderRight: i < TASK_LIMIT_OPTIONS.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                    cursor: "pointer",
                    minWidth: "2rem",
                  }}
                >
                  {opt === "unlimited" ? "∞" : opt}
                </button>
              ))}
            </div>
          </SettingRow>

          {/* 4. Personal Energy */}
          <SettingRow
            label="Personal Energy"
            description="Your typical energy level. Used to prioritize tasks that match your capacity today."
          >
            <TogglePair
              options={["Low", "Medium", "High"] as const}
              value={draft.personalEnergy}
              onChange={(v) => updateDraft("personalEnergy", v as "Low" | "Medium" | "High")}
              renderLabel={(v) => (
                <span className="flex items-center gap-1">
                  {v === "Low" ? "🌙" : v === "Medium" ? "⚡" : "🔥"}
                  {v}
                </span>
              )}
            />
          </SettingRow>

        </SettingsSection>

        {/* ── Help ──────────────────────────────────────────────────── */}
        <SettingsSection title="Help">
          <button
            onClick={() => { navigate("/"); setTimeout(() => startTour(), 450); }}
            className="w-full rounded-xl font-bold my-2"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)", fontSize: "1rem", minHeight: 52 }}
          >
            Take a tour of Velea
          </button>
          <button
            onClick={() => navigate("/about")}
            className="w-full flex items-center justify-between py-4"
            style={{ borderTop: "1px solid var(--border)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <div className="pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>About Velea</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>The manifesto — why the Moon, and your life as a story.</p>
            </div>
            <span style={{ color: "var(--color-muted-foreground)", fontSize: "1.15rem", flexShrink: 0 }}>→</span>
          </button>
          <div className="flex items-center justify-between py-4">
            <div className="pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                Guided tours
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                Show a short coachmark tour the first time you open each page.
              </p>
            </div>
            <button
              onClick={() => setToursEnabledMutation.mutate({ enabled: !toursEnabled })}
              disabled={setToursEnabledMutation.isPending}
              aria-pressed={toursEnabled}
              className="flex-shrink-0 flex items-center gap-2"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: toursEnabled ? "var(--color-primary)" : "var(--color-muted-foreground)" }}>
                {toursEnabled ? "On" : "Off"}
              </span>
              <span style={{ width: 46, height: 28, borderRadius: 999, background: toursEnabled ? "var(--color-primary)" : "var(--color-border)", display: "inline-flex", alignItems: "center", padding: 3, transition: "background 0.2s", justifyContent: toursEnabled ? "flex-end" : "flex-start" }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                Replay the tours
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                Reset every page's tour so they show again as you visit each page.
              </p>
            </div>
            <Button
              onClick={handleReplayIntro}
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5"
            >
              <Compass size={14} />
              Replay
            </Button>
          </div>

          <div className="flex items-center justify-between py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="pr-4">
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                How to add a task
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                A quick walkthrough of the mode orbs and the + button, on the Today screen.
              </p>
            </div>
            <Button
              onClick={() => { fireTaskGuide(); navigate("/"); }}
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5"
            >
              <Compass size={14} />
              Show me
            </Button>
          </div>
        </SettingsSection>

        {/* ── Account ───────────────────────────────────────────────── */}
        <ChangePasswordSection />

        <SettingsSection title="Account">
          <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="pr-4">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-foreground)" }}
              >
                Sign out other devices
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Revoke every other active session. This device stays signed in.
              </p>
            </div>
            <Button
              onClick={() => logoutOthersMutation.mutate()}
              disabled={logoutOthersMutation.isPending}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              {logoutOthersMutation.isPending ? "Working…" : "Sign out"}
            </Button>
          </div>
          {user?.role === "admin" && (
            <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="pr-4">
                <p className="text-sm font-semibold" style={{ color: "#c0392b" }}>
                  Force log out all users
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                  Admin only. After a big build change, clear every user&rsquo;s session — they re-login on next open. This device stays signed in.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (window.confirm("Force-log out ALL users? Everyone will need to sign in again on their next open. You stay signed in.")) {
                    forceLogoutAll.mutate();
                  }
                }}
                disabled={forceLogoutAll.isPending}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                style={{ borderColor: "#c0392b", color: "#c0392b" }}
              >
                {forceLogoutAll.isPending ? "Working…" : "Force logout"}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between py-4">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-foreground)" }}
              >
                Log Out
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Sign out and switch to another account
              </p>
            </div>
            <Button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              variant="outline"
              size="sm"
              className="ml-4 flex-shrink-0"
            >
              {logoutMutation.isPending ? "Logging out..." : "Log Out"}
            </Button>
          </div>
        </SettingsSection>

      </div>

      {/* Sticky save bar — visible when there are unsaved changes */}
      {isDirty && (
        <div
          className="fixed bottom-24 left-0 right-0 flex justify-center z-50 px-4"
          style={{ pointerEvents: "none" }}
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-full shadow-lg"
            style={{
              background: "var(--color-foreground)",
              color: "var(--color-background)",
              pointerEvents: "auto",
            }}
          >
            <span className="text-xs font-medium">Unsaved changes</span>
            <button
              onClick={handleSave}
              className="text-xs font-bold tracking-wide px-3 py-1 rounded-full transition-all duration-150"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                letterSpacing: "0.02em",
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Birth Chart Sheet removed — form is now inline above */}
    </div>
  );
}
