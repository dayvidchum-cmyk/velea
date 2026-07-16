import { useState, useEffect, useRef } from "react";
import { LogIn, ChevronDown, ChevronLeft, RefreshCw } from "lucide-react";

/** The Stage mark — a circle with a center dot, framed in a square (David's icon: the ☉ sun-point,
    boxed). Inherits color via currentColor. */
function StageMark({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" />
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { setDayAccent } from "@/lib/dayAccent";
import { useFullSpectrum } from "@/hooks/useFullSpectrum";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { pickGreeting } from "@/lib/greeting";
import { MODE_SOLID } from "../../../shared/types";
import LocationSheet from "@/components/LocationSheet";
import CheckInSheet from "@/components/CheckInSheet";
import StageSheet, { stagePrefetchUrls } from "@/components/StageSheet";
import VeleaMark from "./VeleaMark";
import VeleaLorMark from "./VeleaLorMark";

// Time Master hourly-category colors (mirrors MasterModeCard's CAT_COLOR) so the activity name in the
// dateline (Restore, Action, …) reads in its own color, matching the Time Master section.
const CAT_COLOR: Record<string, string> = {
  Succeed: "#D4AF37", Energize: "#86C440", Action: "#318a55", Restore: "#178F9E", Caution: "#9A4E6E",
};

interface AppHeaderProps {
  /** When provided, renders the Today-page hero layout (date + state utility row + large greeting) */
  heroMode?: {
    qualifier?: string | null;
  };
  /** Optional page title shown below greeting on secondary pages */
  pageTitle?: string;
  /** Render the page title in sans-serif instead of the default serif (e.g. project names) */
  sansTitle?: boolean;
  /** Scale the page title font (e.g. 0.8 to shrink project titles 20%) */
  titleScale?: number;
  /** When provided, shows a small back link directly above the page title */
  onBack?: () => void;
  /** Label for the back link (defaults to "Back") */
  backLabel?: string;
}

/**
 * AppHeader — shared across all pages.
 * Pass `heroMode` on the Today page to get the Velea mockup layout:
 *   - Top utility row: date left, location + current state right
 *   - Large editorial serif greeting below
 * Other pages use the standard compact layout.
 */
export default function AppHeader({ heroMode, pageTitle, sansTitle, titleScale = 1, onBack, backLabel = "Back" }: AppHeaderProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Every chrome accent follows THE DAY (David: "the original styling changed all of
  // that across the app to match the day mode color"). Gold is reserved for the ACTIVE
  // veleal'or and the brand mark alone.
  const modeColor = "var(--day-accent)";
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  // The first-run welcome opens the location picker via this event ("Set my location").
  useEffect(() => {
    const open = () => setLocationSheetOpen(true);
    window.addEventListener("velea-open-location", open);
    return () => window.removeEventListener("velea-open-location", open);
  }, []);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  // The stale-task nudge (CheckInNudge) opens the check-in from anywhere via this event.
  useEffect(() => {
    const openCheckIn = () => setCheckInSheetOpen(true);
    window.addEventListener("velea-open-checkin", openCheckIn);
    return () => window.removeEventListener("velea-open-checkin", openCheckIn);
  }, []);
  const [stageSheetOpen, setStageSheetOpen] = useState(false);
  // Warm the Stage BEFORE the user taps in: the header (always mounted) fetches the sky data and
  // prefetches every card image (the SW then cache-firsts them). Without this, the Stage's own
  // queries only fire on open, so on a cold session the off-screen card (e.g. Mercury) is still
  // downloading when you swipe to it — it flashed blank. React Query shares this cache with the
  // sheet, so there's no double fetch. staleTime 30min = the same key the sheet uses.
  const { data: stageSky } = trpc.celestial.today.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30 * 60 * 1000 });
  useEffect(() => {
    for (const url of stagePrefetchUrls(stageSky)) { const img = new Image(); img.src = url; }
  }, [stageSky]);
  // Live "Velea timestamp": ticks every 20s so the mode · activity · hora · clock line stays current.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);
  // Fixed top bar: measure its height so the in-flow spacer reserves exactly that much,
  // keeping page content from hiding underneath the pinned strip.
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stampDate = new Date(nowMs);
  const stampDateStr = `${stampDate.getFullYear()}-${String(stampDate.getMonth() + 1).padStart(2, "0")}-${String(stampDate.getDate()).padStart(2, "0")}`;
  // Time Master + Hora are private (admin/master) — only query for those users; the day mode and
  // clock still show for everyone.
  const { data: tmToday } = trpc.masterMode.today.useQuery({ date: stampDateStr }, { enabled: isAdmin, staleTime: 600000 });
  const { data: horaToday } = trpc.masterMode.hora.useQuery({ date: stampDateStr }, { enabled: isAdmin, staleTime: 300000 });
  // The dateline's qualifier used to come ONLY from the Today page (via heroMode), so every other
  // page's dateline was missing it. Fetch today's panchang here so the header is correct everywhere.
  const { data: headerPanchang } = trpc.panchang.today.useQuery(undefined, { enabled: isAuthenticated, staleTime: 600000 });
  // The dateline's day word now comes from the SAME source as the calendar and hero — the
  // six movements (David 2026-07-15: the old pipeline's word kept leaking here as "BUILD").
  // The chrome follows TODAY's coin (David). Set from the same character the calendar uses.
  const { data: headerCrown } = trpc.crown.forMonth.useQuery(
    { year: new Date(nowMs).getFullYear(), month: new Date(nowMs).getMonth() + 1 },
    { enabled: isAuthenticated, staleTime: 60 * 60 * 1000 },
  );

  const { data: profileList = [] } = trpc.profiles.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Today's check-in: once recorded, the chip shows its date+time stamp instead of the
  // generic "CURRENT STATE" label, so you can see at a glance when you last checked in.
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  // Show STALENESS, not an absolute time — how long since your last check-in, ticking live.
  // A check-in loses value as it ages, so "2h 14m ago" is the useful signal (matches the
  // stale-task nudge's logic). Falls back to "CURRENT STATE" when you haven't checked in today.
  const checkInStamp = todayCheckIn?.recordedAt
    ? (() => {
        const mins = Math.max(0, Math.round((nowMs - new Date(todayCheckIn.recordedAt).getTime()) / 60000));
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
      })()
    : null;

  const today = new Date();

  // Compact dateline date: "MON, 07-06-2026" (short weekday + MM-DD-YYYY).
  const shortDateLabel = `${today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}, ${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}-${today.getFullYear()}`;

  // Long date for standard header
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Derive the currently active profile from the full list (includes owner)
  const currentProfile = profileList.find((p: any) => p.isActive) ?? null;
  // Use active profile name for greeting; fall back to auth user name
  const displayName = currentProfile?.name ?? user?.name;
  const firstName = displayName?.split(" ")[0] ?? null;
  // Time-aware, second-voice greeting (e.g. "Still up, Lang?" past midnight)
  const greetingLine = pickGreeting(today, firstName);

  // Live Velea timestamp pieces: the 2-word day mode + Time Master activity + hora lord glyph +
  // clock, with a crown when it's a golden hour. The private bits are admin-only (null otherwise).
  const stampMode = (Object.keys(MODE_SOLID) as (keyof typeof MODE_SOLID)[]).find(
    (k) => MODE_SOLID[k].toLowerCase() === modeColor.trim().toLowerCase(),
  ) ?? null;
  const rawQualifier = heroMode?.qualifier ?? (headerPanchang as any)?.qualifier ?? null;
  // The four modes are retired (David 2026-07-15): a qualifier that names one never renders.
  // The moment strip keeps its real information (golden moment, hora); moment-level vocabulary
  // for the filter era is David's to spec.
  const stampQualifier = rawQualifier && /\b(Action|Build|Selective|Restraint)\b/.test(rawQualifier) ? null : rawQualifier;
  // PRE-DAWN FALLBACK: before today's sunrise the clock-date tables haven't started, so the
  // activity + hora segment silently vanished (David, 1:39 AM: "why doesn't the dateline say
  // the time master stuff with the hora planet anymore???"). Between midnight and sunrise we
  // are still inside YESTERDAY's vedic tables — same rule the golden-hour engine uses.
  const yd = new Date(nowMs - 86400000);
  const yesterdayStr = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, "0")}-${String(yd.getDate()).padStart(2, "0")}`;
  const preDawnTm = !!tmToday?.periods?.length && !tmToday.periods.some((p: any) => nowMs >= p.startMs && nowMs < p.endMs);
  const { data: tmYesterday } = trpc.masterMode.today.useQuery({ date: yesterdayStr }, { enabled: isAdmin && preDawnTm, staleTime: 600000 });
  const preDawnHora = !!horaToday?.horas?.length && !horaToday.horas.some((h: any) => nowMs >= h.startMs && nowMs < h.endMs);
  const { data: horaYesterday } = trpc.masterMode.hora.useQuery({ date: yesterdayStr }, { enabled: isAdmin && preDawnHora, staleTime: 300000 });
  const tmCurrent = tmToday?.periods?.find((p: any) => nowMs >= p.startMs && nowMs < p.endMs)
    ?? tmYesterday?.periods?.find((p: any) => nowMs >= p.startMs && nowMs < p.endMs);
  const stampActivity = tmCurrent?.category ?? null;
  // Golden-hour readout for the brand line (private — only present when Time Master data is: golden
  // now, else a heads-up for the next golden window). Non-entitled users get no Time Master data → null.
  const golden = (tmToday as any)?.goldenNow ?? null;
  const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const horaCurrent = horaToday?.horas?.find((h: any) => nowMs >= h.startMs && nowMs < h.endMs)
    ?? horaYesterday?.horas?.find((h: any) => nowMs >= h.startMs && nowMs < h.endMs);
  const stampHoraLord = horaCurrent?.lord ?? null;
  const stampTime = stampDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // ONE SOURCE: the dateline word is today's movement (Golden Day / Action / Build /
  // Selective / Restraint / Caution) — the retired pipeline's mode/qualifier never render.
  const [fullSpectrum] = useFullSpectrum();
  const { theme } = useTheme();
  const todayCharacter = (headerCrown as any)?.days?.find((d: any) => d.date === stampDateStr)?.character ?? null;
  useEffect(() => { setDayAccent(todayCharacter, fullSpectrum); }, [todayCharacter, fullSpectrum, theme]); // theme dep: the dark lift remaps the accent on mode flip
  const todayMovementWord = todayCharacter?.movementWord ?? null;
  const stampModeLabel = todayMovementWord ?? "";
  void stampMode; void stampQualifier; // retired vocabulary — kept only so older code paths type-check


  // ── HERO LAYOUT (all pages) ────────────────────────────────────────────────
  const stateLabel = heroMode?.qualifier || null;

  return (
    <>
      {/* Fixed top bar — brand mark + utility row pinned to the viewport top so they survive
          page scroll (mirrors the fixed bottom-nav pattern; the body is the scroll container).
          The spacer below reserves the height it vacates so content isn't hidden underneath. */}
      <div ref={barRef} className="app-topbar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 45, paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="container" style={{ paddingTop: "0.9rem", paddingBottom: "0.25rem" }}>
          {/* Brand mark (left) + golden-hour readout (right, for balance). The golden chip is always
              on the logo line so the current/next golden window is visible from every page. */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <VeleaMark size={28} color="var(--brand-gold)" />
              <span style={{ fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--brand-gold)", lineHeight: 1 }}>
                Velea
              </span>
            </div>
            {golden && (golden.isGolden ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                <VeleaLorMark size={14} color="var(--brand-gold)" style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.55))", flexShrink: 0 }} />
                <span style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brand-gold)", whiteSpace: "nowrap", lineHeight: 1 }}>Veleal'or • golden moment{golden.untilMs ? ` until ${fmtClock(golden.untilMs)}` : ""}</span>
              </div>
            ) : golden.nextGoldenMs ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                <VeleaLorMark size={12} color="var(--brand-gold)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--brand-gold)", whiteSpace: "nowrap", lineHeight: 1 }}>Next veleal'or : {fmtClock(golden.nextGoldenPeakMs ?? golden.nextGoldenMs)}</span>
              </div>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)", whiteSpace: "nowrap", lineHeight: 1, opacity: 0.75 }}>No veleal'or left</span>
              </div>
            ))}
          </div>
          {/* Utility row: one combined dateline — date · time · qualifier-mode · activity + hora glyph.
              Date/time/mode read in the current date's mode color; the activity reads in its own Time
              Master color; the hora glyph is gold. THE STAGE sits on its own line under it. */}
          <div>
            {/* ONE line, JUSTIFIED edge-to-edge (space-between) so the date sits flush-left under
                "Velea" and the last segment sits flush-right under the golden-hour readout — the
                dateline spans the same width as the brand line above it. Each segment is grouped so
                its bullet stays attached to its word. Scrolls if a screen is too narrow to fit. */}
            <div className="no-scrollbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", whiteSpace: "nowrap", overflowX: "auto", overflowY: "hidden", gap: "0.3rem", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
              <span style={{ color: modeColor, flexShrink: 0 }}>{shortDateLabel}</span>
              <span style={{ color: modeColor, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{stampTime}</span>
              {stampModeLabel && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: modeColor }}>{stampModeLabel}</span>
                </span>
              )}
              {stampActivity && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: CAT_COLOR[stampActivity] ?? "inherit" }}>{stampActivity}</span>
                  {/* The hora lord wears its activity's color — one phrase, one voice (David). */}
                  {stampHoraLord && (<><span style={{ opacity: 0.4 }}>:</span><span style={{ color: stampActivity ? (CAT_COLOR[stampActivity] ?? "inherit") : modeColor }}>{stampHoraLord}</span></>)}
                </span>
              )}
            </div>
            {/* The Stage — under the dateline; opens the Stage pop-up. */}
            <button
              onClick={() => setStageSheetOpen(true)}
              className="flex items-center gap-1 px-1 py-1 rounded-full transition-all duration-150"
              style={{ marginTop: "0.3rem", color: modeColor, background: "transparent", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 16%, transparent)`;
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${modeColor} 45%, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <StageMark size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ letterSpacing: "0.03em" }}>
                THE STAGE
              </span>
              <ChevronDown size={10} />
            </button>
          </div>
        </div>
      </div>
      {/* Spacer — reserves the height the fixed bar vacated so content clears the pinned strip.
          The page's <main class="content-safe-area"> ALREADY offsets content by the top safe-area
          inset, and the fixed bar's own paddingTop reserves that same inset again inside barH — so
          subtract it here to avoid double-counting (that gap was the dead space above the greeting). */}
      {/* The spacer is EXACT — never shaved. Tightness comes from the bar's own real
          padding above, so the greeting can never slide under it (David's 2:21 AM clip). */}
      <div aria-hidden style={{ height: `calc(${barH}px - env(safe-area-inset-top, 0px))` }} />

      <div className="relative z-10" style={{ marginTop: "0.1rem" }}>
        {/* Large editorial greeting — the visual anchor, close under the dateline (David) */}
        <h1
          className="leading-tight"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 8vw, 2.75rem)",
            color: "var(--heading-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {greetingLine}
        </h1>

        {/* Check-in — right under the greeting, with a soft "How are you?" prompt beside the bubble.
            Opens the check-in sheet; shows time since last check-in, or "CURRENT STATE" if none today. */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span style={{ fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif", fontStyle: "italic", fontSize: "1rem", color: "var(--color-muted-foreground)", lineHeight: 1 }}>
              How are you?
            </span>
            <button
              data-tour="current-state"
              onClick={() => setCheckInSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150"
              style={{ color: modeColor, background: "transparent", border: `1px solid color-mix(in srgb, ${modeColor} 35%, transparent)` }}
              title="Update current state"
              onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 14%, transparent)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <RefreshCw size={12} />
              <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ letterSpacing: "0.03em" }}>
                {checkInStamp ?? "CURRENT STATE"}
              </span>
            </button>
          </div>
        )}

        {/* Profile switcher below greeting */}

        {/* Optional back link — sits directly above the page title */}
        {pageTitle && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold uppercase transition-colors"
            style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.06em", marginTop: "1.25rem" }}
            aria-label={`Back to ${backLabel}`}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--day-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted-foreground)"; }}
            onMouseDown={(e) => { e.currentTarget.style.color = "var(--day-accent)"; }}
            onMouseUp={(e) => { e.currentTarget.style.color = "var(--day-accent)"; }}
          >
            <ChevronLeft size={14} />
            {backLabel}
          </button>
        )}

        {/* Page title — serif, mode-colored, below profile switcher */}
        {pageTitle && (
          <h2
            style={{
              fontFamily: sansTitle
                ? "'Inter', ui-sans-serif, system-ui, sans-serif"
                : "'Playfair Display', 'Georgia', ui-serif, serif",
              fontWeight: sansTitle ? 700 : 600,
              fontSize: `calc(clamp(1.25rem, 4vw, 1.75rem) * ${titleScale})`,
              color: "var(--heading-ink)",
              letterSpacing: sansTitle ? "-0.02em" : "-0.01em",
              marginTop: onBack ? "0.4rem" : "1.25rem",
              lineHeight: 1.2,
            }}
          >
            {pageTitle}
          </h2>
        )}

        {/* Sign-in CTA for unauthenticated users */}
        {!isAuthenticated && (
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: "var(--border)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <LogIn size={12} />
            Sign in
          </a>
        )}
      </div>
      <LocationSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
      />
      <CheckInSheet
        open={checkInSheetOpen}
        onClose={() => setCheckInSheetOpen(false)}
      />
      <StageSheet open={stageSheetOpen} onClose={() => setStageSheetOpen(false)} />
    </>
  );
}
