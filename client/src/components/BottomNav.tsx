import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import {
  BookOpen,
  CalendarDays,
  Star,
  Orbit,
  Sun,
  Moon,
  Library,
  MoreHorizontal,
  Settings,
  Folder,
  Users,
  CircleDot,
} from "lucide-react";

const PRIMARY_NAV = [
  { path: "/astrology", label: "Chart", icon: CircleDot },
  { path: "/", label: "Today", icon: BookOpen },
  { path: "/planner", label: "Planner", icon: CalendarDays },
  { path: "/projects", label: "Projects", icon: Folder },
];

const EXPLORE_ITEMS = [
  { path: "/glossary", label: "Glossary", icon: Library },
  { path: "/profiles", label: "Profiles", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const [exploreOpen, setExploreOpen] = useState(false);
  const { user } = useAuth();
  // Active + hover accent follows today's day mode, so the nav reinforces
  // "today is a Build/Action/Restraint day" on every page.
  const accent = useDayModeColor();
  const isAdmin = user?.role === "admin";
  const visibleExploreItems = EXPLORE_ITEMS.filter(
    (item) => item.path !== "/profiles" || isAdmin
  );
  // ── Swipe-down to dismiss ──────────────────────────────────────────────────
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = useRef(false);

  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragCurrentY.current = clientY;
    isDragging.current = true;
  }, []);

  const onDragMove = useCallback((clientY: number) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = clientY - dragStartY.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  }, []);

  const onDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset > 60) {
      setExploreOpen(false);
    }
    setDragOffset(0);
    dragStartY.current = null;
  }, [dragOffset]);

  // Projects is now in primary nav — only flag explore paths for the More button active state
  const isExplorePath = EXPLORE_ITEMS.some((i) => i.path === location);
  // Projects tab active: exact match or any sub-route
  const isProjectsActive = location === "/projects" || location.startsWith("/projects/");

  function handleExploreNav(path: string) {
    navigate(path);
    setExploreOpen(false);
  }

  // Sheet sits just above the nav bar
  const sheetBottom = exploreOpen
    ? "calc(72px + 0px)"
    : "-300px";

  return (
    <>
      {/* Backdrop */}
      {exploreOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "oklch(0 0 0 / 0.35)" }}
          onClick={() => setExploreOpen(false)}
        />
      )}

      {/* Explore sheet */}
      <div
        className="fixed left-0 right-0 z-50"
        style={{
          bottom: sheetBottom,
          opacity: exploreOpen ? 1 : 0,
          pointerEvents: exploreOpen ? "auto" : "none",
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging.current
            ? "none"
            : "bottom 0.3s cubic-bezier(0.23,1,0.32,1), opacity 0.3s ease, transform 0.25s cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <div
          className="mx-auto max-w-lg rounded-t-2xl overflow-hidden"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderBottom: "none",
            boxShadow: "0 -8px 32px oklch(0 0 0 / 0.15)",
          }}
          /* Touch events */
          onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
          onTouchEnd={onDragEnd}
          /* Mouse events (desktop fallback) */
          onMouseDown={(e) => onDragStart(e.clientY)}
          onMouseMove={(e) => { if (isDragging.current) onDragMove(e.clientY); }}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "var(--color-border)" }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-2">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{
                color: "var(--color-muted-foreground)",
              }}
            >
              Explore
            </span>
          </div>

          {/* Explore nav items */}
          <div className="flex items-stretch px-4 pb-4 gap-3">
            {visibleExploreItems.map(({ path, label, icon: Icon }) => {
              const active = location === path;
              return (
                <button
                  key={path}
                  onClick={() => handleExploreNav(path)}
                  className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl transition-all duration-200"
                  style={{
                    background: active
                      ? "var(--filter-pill-bg-active)"
                      : "var(--color-secondary)",
                    color: active ? "var(--color-primary)" : "var(--color-foreground)",
                    border: active
                      ? `1px solid var(--filter-pill-border-active)`
                      : "1px solid var(--color-border)",
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = "var(--color-foreground)"; e.currentTarget.style.borderColor = "var(--color-border)"; } }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span
                    className="text-xs font-medium"
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>


        </div>
      </div>

      {/* Main nav bar */}
      <nav className="glass-nav">
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {PRIMARY_NAV.map(({ path, label, icon: Icon }) => {
            const active = path === "/projects" ? isProjectsActive : location === path;
            return (
              <button
                key={path}
                data-tour={path === "/astrology" ? "chart-nav" : undefined}
                onClick={() => {
                  setExploreOpen(false);
                  navigate(path);
                }}
                className="flex flex-col items-center gap-0.5 px-3 py-3 flex-1 transition-all duration-200 relative"
                style={active ? { color: accent } : { color: "var(--muted-foreground)" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = accent; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                  <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={active ? { filter: `drop-shadow(0 0 6px ${accent}66)` } : {}}
                />
                <span
                  className="text-[10px] font-medium tracking-wide uppercase"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-6 h-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}99` }} />
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setExploreOpen((v) => !v)}
            className="flex flex-col items-center gap-0.5 px-3 py-3 flex-1 transition-all duration-200 relative"
            style={
              isExplorePath || exploreOpen
                ? { color: accent }
                : { color: "var(--muted-foreground)" }
            }
            onMouseEnter={(e) => { if (!(isExplorePath || exploreOpen)) e.currentTarget.style.color = accent; }}
            onMouseLeave={(e) => { if (!(isExplorePath || exploreOpen)) e.currentTarget.style.color = "var(--muted-foreground)"; }}
          >
            <MoreHorizontal
              size={22}
              strokeWidth={isExplorePath || exploreOpen ? 2.5 : 1.8}
              style={isExplorePath || exploreOpen ? { filter: `drop-shadow(0 0 6px ${accent}66)` } : {}}
            />
            <span
              className="text-[10px] font-medium tracking-wide uppercase"
              style={{ letterSpacing: "0.04em" }}
            >
              More
            </span>
            {(isExplorePath || exploreOpen) && (
              <span className="absolute bottom-0 w-6 h-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}99` }} />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
