import { useState, useEffect, useRef } from "react";
import { LogIn, Users, ChevronDown, ChevronLeft, Check, Plus, Loader2, RefreshCw, Star } from "lucide-react";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { pickGreeting } from "@/lib/greeting";
import { MODE_SOLID } from "../../../shared/types";
import { useLocation } from "wouter";
import LocationSheet from "@/components/LocationSheet";
import CheckInSheet from "@/components/CheckInSheet";
import StageSheet from "@/components/StageSheet";
import VeleaMark from "./VeleaMark";
import VeleaLorMark from "./VeleaLorMark";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Classical planet glyphs for the live timestamp's hora lord.
const PLANET_GLYPH: Record<string, string> = {
  Sun: "☀", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

// Time Master hourly-category colors (mirrors MasterModeCard's CAT_COLOR) so the activity name in the
// dateline (Restore, Action, …) reads in its own color, matching the Time Master section.
const CAT_COLOR: Record<string, string> = {
  Succeed: "#D4AF37", Energize: "#86C440", Action: "#318a55", Restore: "#178F9E", Caution: "#B15F71",
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
  const modeColor = useDayModeColor();
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
  const [open, setOpen] = useState(false);
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
  const [switching, setSwitching] = useState<number | "own" | null>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

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

  const setActiveMutation = trpc.profiles.setActive.useMutation();

  async function invalidateAll() {
    // Almost every query derives its subject from the server-side ACTIVE profile, so its
    // React Query key carries no profile id — switching profiles doesn't change the key and
    // stale data (e.g. the Meridian, celestial, narrative reads) leaks across profiles. An
    // explicit allowlist always misses one (it missed meridian.current), so on a profile
    // switch we invalidate the ENTIRE cache — the only leak-proof option.
    await utils.invalidate();
  }

  async function handleSwitchProfile(profileId: number, name: string) {
    if (switching !== null) return;
    setSwitching(profileId);
    try {
      await setActiveMutation.mutateAsync({ id: profileId });
      await invalidateAll();
      toast.success(`Switched to ${name}`);
      setOpen(false);
      // The switch invalidates the whole cache; the page collapses to skeletons and
      // re-expands. Reset scroll to the top so the viewport-fixed nav re-welds cleanly
      // instead of riding a mid-scroll position (the switch-time "detach"). The nav CSS
      // itself is confirmed-good and untouched — see .nav-safe-area in index.css.
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to switch profile");
    } finally {
      setSwitching(null);
    }
  }

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
  const stampQualifier = heroMode?.qualifier ?? (headerPanchang as any)?.qualifier ?? null;
  const tmCurrent = tmToday?.periods?.find((p: any) => nowMs >= p.startMs && nowMs < p.endMs);
  const stampActivity = tmCurrent?.category ?? null;
  const stampGolden = Boolean((tmToday as any)?.goldenNow?.isGolden);
  const horaCurrent = horaToday?.horas?.find((h: any) => nowMs >= h.startMs && nowMs < h.endMs);
  const stampHoraGlyph = horaCurrent?.lord ? PLANET_GLYPH[horaCurrent.lord] ?? null : null;
  const stampHoraLord = horaCurrent?.lord ?? null;
  const stampTime = stampDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  // The qualifier is usually the FULL 2-word label ("Restrained Build"); only append the mode
  // when the qualifier doesn't already contain it — avoids "Restrained Build Build" / "Build Build".
  const stampModeLabel = stampQualifier
    ? (stampMode && !stampQualifier.toLowerCase().includes(stampMode.toLowerCase())
        ? `${stampQualifier} ${stampMode}`
        : stampQualifier)
    : (stampMode ?? "");

  // Profile switcher dropdown — shared between both layouts (only show for admins)
  const profileSwitcher = isAuthenticated && isAdmin ? (
    <div className="mt-3">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 outline-none"
            style={{
              background: "var(--color-secondary)",
              color: "var(--color-muted-foreground)",
              border: "1px solid var(--color-border)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#C9A84C"; e.currentTarget.style.borderColor = "#C9A84C"; }}
            onMouseDown={(e) => { e.currentTarget.style.color = "#C9A84C"; e.currentTarget.style.borderColor = "#C9A84C"; }}
            onMouseUp={(e) => { e.currentTarget.style.color = "#C9A84C"; e.currentTarget.style.borderColor = "#C9A84C"; }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-muted-foreground)";
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          >
            <Users size={13} />
            <span>{currentProfile ? currentProfile.name : "My Chart"}</span>
            <ChevronDown
              size={12}
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-[210px] p-1 rounded-xl"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 32px oklch(0 0 0 / 0.25)",
          }}
        >
          {[...profileList]
            .sort((a: any, b: any) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0))
            .map((profile: any) => {
              const isActive = profile.isActive;
              const isLoading = switching === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => !isActive && handleSwitchProfile(profile.id, profile.name)}
                  disabled={isActive || isLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-white/5 disabled:cursor-default"
                  style={{ color: isActive ? "var(--color-primary)" : "var(--color-foreground)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                    style={{
                      background: isActive ? "var(--color-primary)" : "var(--color-secondary)",
                      color: isActive ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                    }}
                  >
                    {isLoading
                      ? <Loader2 size={10} className="animate-spin" />
                      : profile.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.name}
                      {profile.isOwner && (
                        <span className="ml-1.5 text-[12px]" style={{ color: "var(--amber-gold)" }}>★ My Chart</span>
                      )}
                    </p>
                    {profile.lagnaSign && (
                      <p className="text-[13px] truncate" style={{ color: "var(--color-muted-foreground)" }}>
                        {profile.lagnaSign} lagna
                      </p>
                    )}
                  </div>
                  {isActive && <Check size={14} style={{ color: "var(--color-primary)" }} />}
                </button>
              );
            })}
          <DropdownMenuSeparator className="my-1" />
          <button
            onClick={() => { setOpen(false); navigate("/profiles"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            <Plus size={14} />
            <span>Manage profiles</span>
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  // ── HERO LAYOUT (all pages) ────────────────────────────────────────────────
  const stateLabel = heroMode?.qualifier || null;

  return (
    <>
      {/* Fixed top bar — brand mark + utility row pinned to the viewport top so they survive
          page scroll (mirrors the fixed bottom-nav pattern; the body is the scroll container).
          The spacer below reserves the height it vacates so content isn't hidden underneath. */}
      <div ref={barRef} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 45, background: "var(--background)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="container" style={{ paddingTop: "0.9rem", paddingBottom: "0.6rem" }}>
          {/* Brand mark — the Velea mark + wordmark (Khmer story lives in the login splash) */}
          <div className="flex items-center gap-2 mb-3">
            <VeleaMark size={28} color="var(--brand-gold)" />
            <span style={{ fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--brand-gold)" }}>
              Velea
            </span>
          </div>
          {/* Utility row: one combined dateline — date · time · qualifier-mode · activity + hora glyph.
              Date/time/mode read in the current date's mode color; the activity reads in its own Time
              Master color; the hora glyph is gold. THE STAGE sits on its own line under it. */}
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
              <span style={{ color: modeColor, whiteSpace: "nowrap" }}>{shortDateLabel}</span>
              <span style={{ color: modeColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{stampTime}</span>
              {stampModeLabel && (<><span style={{ opacity: 0.4 }}>•</span><span style={{ color: modeColor, whiteSpace: "nowrap" }}>{stampModeLabel}</span></>)}
              {stampActivity && (<><span style={{ opacity: 0.4 }}>•</span><span style={{ color: CAT_COLOR[stampActivity] ?? "inherit", whiteSpace: "nowrap" }}>{stampActivity}</span></>)}
              {stampHoraGlyph && <span title={stampHoraLord ?? undefined} style={{ fontSize: "0.8rem", color: "#C9A84C", lineHeight: 1, display: "inline-block", transform: "translateY(0.1em)" }}>{stampHoraGlyph}</span>}
              {stampGolden && <VeleaLorMark size={12} color="#D4AF37" style={{ filter: "drop-shadow(0 0 3px rgba(212,175,55,0.55))" }} />}
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
              <Star size={11} />
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
      <div aria-hidden style={{ height: `calc(${barH}px - env(safe-area-inset-top, 0px))` }} />

      <div className="relative z-10">
        {/* Large editorial greeting — the visual anchor */}
        <h1
          className="leading-tight"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 8vw, 2.75rem)",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          {greetingLine}
        </h1>

        {/* Check-in — moved here from the header, right under the greeting. Opens the check-in sheet;
            shows how long since your last check-in, or "CURRENT STATE" if you haven't today. */}
        {isAuthenticated && (
          <button
            data-tour="current-state"
            onClick={() => setCheckInSheetOpen(true)}
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full transition-all duration-150"
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
        )}

        {/* Profile switcher below greeting */}
        {profileSwitcher}

        {/* Optional back link — sits directly above the page title */}
        {pageTitle && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold uppercase transition-colors"
            style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.06em", marginTop: "1.25rem" }}
            aria-label={`Back to ${backLabel}`}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#C9A84C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted-foreground)"; }}
            onMouseDown={(e) => { e.currentTarget.style.color = "#C9A84C"; }}
            onMouseUp={(e) => { e.currentTarget.style.color = "#C9A84C"; }}
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
              color: "var(--foreground)",
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
