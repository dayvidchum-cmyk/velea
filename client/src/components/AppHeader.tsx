import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { LogIn, Users, ChevronDown, ChevronLeft, Check, Plus, Loader2, RefreshCw } from "lucide-react";

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

  // ── Draggable profile FAB (mirrors the "+" FAB in App.tsx) ────────────────
  const [profFabPos, setProfFabPos] = useState<{ x: number; y: number } | null>(null);
  const [profDragging, setProfDragging] = useState(false);
  const profDragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressProfClickRef = useRef(false);
  const clampProfPos = (x: number, y: number) => {
    const SIZE = 48, MARGIN = 8, NAV = 80;
    const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - SIZE - NAV);
    return { x: Math.min(Math.max(x, MARGIN), maxX), y: Math.min(Math.max(y, MARGIN), maxY) };
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem("velea_profile_fab_pos");
      if (raw) { const p = JSON.parse(raw); if (typeof p?.x === "number" && typeof p?.y === "number") setProfFabPos(clampProfPos(p.x, p.y)); }
    } catch { /* ignore malformed storage */ }
  }, []);
  useEffect(() => {
    const onResize = () => setProfFabPos((prev) => (prev ? clampProfPos(prev.x, prev.y) : prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const onProfDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    profDragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onProfMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = profDragRef.current; if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; setProfDragging(true); }
    if (d.moved) setProfFabPos(clampProfPos(e.clientX - d.offsetX, e.clientY - d.offsetY));
  };
  const onProfUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = profDragRef.current; profDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) {
      setProfDragging(false);
      suppressProfClickRef.current = true; // swallow the click so the menu doesn't open right after a drag
      setProfFabPos((prev) => { if (prev) { try { localStorage.setItem("velea_profile_fab_pos", JSON.stringify(prev)); } catch { /* ignore */ } } return prev; });
    }
  };
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
  // Golden-hour readout for the brand line (private — only present when Time Master data is: golden
  // now, else a heads-up for the next golden window). Non-entitled users get no Time Master data → null.
  const golden = (tmToday as any)?.goldenNow ?? null;
  const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const horaCurrent = horaToday?.horas?.find((h: any) => nowMs >= h.startMs && nowMs < h.endMs);
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
    <div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {/* Profile switcher as a draggable FAB (Users icon) — default bottom-left, clear of the
              bottom-right "+" FAB. Drag to reposition (persisted); tap to open the switcher. */}
          <button
            aria-label="Switch profile"
            title={currentProfile ? currentProfile.name : "Profiles"}
            onPointerDown={onProfDown}
            onPointerMove={onProfMove}
            onPointerUp={onProfUp}
            onClickCapture={(e) => { if (suppressProfClickRef.current) { e.preventDefault(); e.stopPropagation(); suppressProfClickRef.current = false; } }}
            className={`active:scale-95 outline-none ${profDragging ? "" : "transition-all"}`}
            style={{
              position: "fixed",
              ...(profFabPos
                ? { left: `${profFabPos.x}px`, top: `${profFabPos.y}px` }
                : { left: "16px", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 16px)" }),
              zIndex: 40,
              width: 48,
              height: 48,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-card)",
              color: "var(--color-muted-foreground)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 16px oklch(0 0 0 / 0.22)",
              touchAction: "none",
              cursor: profDragging ? "grabbing" : "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#C9A84C"; e.currentTarget.style.borderColor = "#C9A84C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted-foreground)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            <Users size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
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
      <div ref={barRef} className="app-topbar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 45, paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="container" style={{ paddingTop: "0.9rem", paddingBottom: "0.6rem" }}>
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
                <VeleaLorMark size={14} color="#D4AF37" style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.55))", flexShrink: 0 }} />
                <span style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#D4AF37", whiteSpace: "nowrap", lineHeight: 1 }}>Golden hour{golden.untilMs ? ` until ${fmtClock(golden.untilMs)}` : ""}</span>
              </div>
            ) : golden.nextGoldenMs ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                <VeleaLorMark size={12} color="#C9A84C" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#C9A84C", whiteSpace: "nowrap", lineHeight: 1 }}>Next golden hour : {fmtClock(golden.nextGoldenMs)}</span>
              </div>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)", whiteSpace: "nowrap", lineHeight: 1, opacity: 0.75 }}>No golden hours left</span>
              </div>
            ))}
          </div>
          {/* Utility row: one combined dateline — date · time · qualifier-mode · activity + hora glyph.
              Date/time/mode read in the current date's mode color; the activity reads in its own Time
              Master color; the hora glyph is gold. THE STAGE sits on its own line under it. */}
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
              <span style={{ color: modeColor, whiteSpace: "nowrap" }}>{shortDateLabel}</span>
              <span style={{ color: modeColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{stampTime}</span>
              {stampModeLabel && (<><span style={{ opacity: 0.4 }}>•</span><span style={{ color: modeColor, whiteSpace: "nowrap" }}>{stampModeLabel}</span></>)}
              {stampActivity && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: CAT_COLOR[stampActivity] ?? "inherit" }}>{stampActivity}</span>
                  {stampHoraLord && (<><span style={{ opacity: 0.4 }}>:</span><span style={{ color: "#C9A84C" }}>{stampHoraLord}</span></>)}
                </span>
              )}
              {/* The golden bullseye lives up on the brand line as "GOLDEN HOUR" — no duplicate mark
                  trailing the dateline (it was wrapping onto its own line and reading as a stray dot). */}
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
