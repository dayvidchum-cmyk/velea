import { useState } from "react";
import { MapPin, LogIn, Users, ChevronDown, ChevronLeft, Check, Plus, Loader2, RefreshCw, Star } from "lucide-react";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import LocationSheet from "@/components/LocationSheet";
import CheckInSheet from "@/components/CheckInSheet";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  /** Today-only: a "Stage" chip in the utility row (Golden Moment). */
  stage?: { count: number; open: boolean; onToggle: () => void };
}

/**
 * AppHeader — shared across all pages.
 * Pass `heroMode` on the Today page to get the Kala mockup layout:
 *   - Top utility row: date left, location + current state right
 *   - Large editorial serif greeting below
 * Other pages use the standard compact layout.
 */
export default function AppHeader({ heroMode, pageTitle, sansTitle, titleScale = 1, onBack, backLabel = "Back", stage }: AppHeaderProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const modeColor = useDayModeColor();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<number | "own" | null>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: profileList = [] } = trpc.profiles.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: locationData } = trpc.settings.getLocation.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const setActiveMutation = trpc.profiles.setActive.useMutation();

  async function invalidateAll() {
    await Promise.all([
      utils.profiles.list.invalidate(),
      utils.profiles.getActive.invalidate(),
      utils.profiles.getSubject.invalidate(),
      utils.panchang.today.invalidate(),
      utils.panchang.byDate.invalidate(),
      utils.panchang.byMonth.invalidate(),
      utils.panchang.timeLordInfluence.invalidate(),
      utils.dasha.timeline.invalidate(),
      utils.profection.current.invalidate(),
      utils.profection.timeLordTransits.invalidate(),
      utils.timeLordTransit.forDate.invalidate(),
      utils.timeLordTransit.forDateRange.invalidate(),
      utils.diagnostics.day.invalidate(),
      utils.diagnostics.range.invalidate(),
      utils.tasks.list.invalidate(),
      utils.tasks.pinnedForToday.invalidate(),
      utils.tasks.modeCounts.invalidate(),
      utils.tasks.rankedForToday.invalidate(),
      utils.projects.list.invalidate(),
      utils.projects.listAll.invalidate(),
    ]);
  }

  async function handleSwitchProfile(profileId: number, name: string) {
    if (switching !== null) return;
    setSwitching(profileId);
    try {
      await setActiveMutation.mutateAsync({ id: profileId });
      await invalidateAll();
      toast.success(`Switched to ${name}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to switch profile");
    } finally {
      setSwitching(null);
    }
  }

  const today = new Date();

  // Short uppercase date for hero utility row: "WED, JUNE 24, 2026"
  const heroDateLabel = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  // Long date for standard header
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    hour < 21 ? "Good evening" :
    "Good night";

  // Derive the currently active profile from the full list (includes owner)
  const currentProfile = profileList.find((p: any) => p.isActive) ?? null;
  // Use active profile name for greeting; fall back to auth user name
  const displayName = currentProfile?.name ?? user?.name;
  const firstName = displayName?.split(" ")[0] ?? null;

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
  const cityLabel = locationData?.city || "Location";
  const stateLabel = heroMode?.qualifier || null;

  return (
    <>
      <div className="relative z-10">
        {/* Brand mark — logo + wordmark (the full Khmer story lives in the login splash) */}
        <div className="flex items-center gap-2 mb-4">
          <span
            aria-hidden="true"
            style={{
              display: "inline-block", width: 30, height: 30,
              background: "var(--brand-gold)",
              WebkitMaskImage: "url(/velea-logo.png)", maskImage: "url(/velea-logo.png)",
              WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              WebkitMaskPosition: "center", maskPosition: "center",
            }}
          />
          <span style={{ fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--brand-gold)" }}>
            Velea
          </span>
        </div>
        {/* Utility row: date left, location + state right */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="text-[10px] font-bold tracking-wide whitespace-nowrap"
            style={{ color: modeColor, letterSpacing: "0.03em" }}
          >
            {heroDateLabel}
          </span>
          {stage && (
              <button
                onClick={stage.onToggle}
                className="flex items-center gap-1 px-1 py-1 rounded-full transition-all duration-150"
                style={{ color: modeColor, background: "transparent", border: "1px solid transparent" }}
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
                <ChevronDown size={10} style={{ transform: stage.open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
              </button>
            )}
            <button
              onClick={() => setLocationSheetOpen(true)}
              className="flex items-center gap-1 px-1 py-1 rounded-full transition-all duration-150"
              style={{ color: modeColor, background: "transparent", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 16%, transparent)`;
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${modeColor} 45%, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <MapPin size={11} />
              <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ letterSpacing: "0.03em" }}>
                {cityLabel}
              </span>
            </button>
            <button
                data-tour="current-state"
                onClick={() => setCheckInSheetOpen(true)}
                className="flex items-center gap-1 px-1 py-1 rounded-full transition-all duration-150"
                style={{ color: modeColor, background: "transparent", border: "1px solid transparent" }}
                title="Update current state"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 16%, transparent)`;
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${modeColor} 45%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <RefreshCw size={11} />
                <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ letterSpacing: "0.03em" }}>
                  CURRENT STATE
                </span>
              </button>
        </div>

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
          {isAuthenticated && firstName
            ? `${greeting}, ${firstName}.`
            : `${greeting}.`}
        </h1>

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
    </>
  );
}
