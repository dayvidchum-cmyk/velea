import { Toaster } from "@/components/ui/sonner";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Plus, RefreshCw } from "lucide-react";
import BrandSplash from "@/components/BrandSplash";
import WelcomeScreen from "@/components/WelcomeScreen";
import { PANCHANG_TO_TASK_MODE, type TaskMode } from "@shared/types";
import { trpc } from "@/lib/trpc";

import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider, useSettingsContext } from "./contexts/SettingsContext";
import { AddTaskProvider, useAddTask } from "./contexts/AddTaskContext";
import BottomNav from "./components/BottomNav";
import FullSpectrumController from "./components/FullSpectrumController";
import LocationNudge from "./components/LocationNudge";
import CheckInNudge from "./components/CheckInNudge";
import { APP_VERSION } from "./lib/version";
import AddTaskSheet from "./components/AddTaskSheet";
import Onboarding from "./components/Onboarding";
import Planner from "./pages/Planner";
import ProfectionYear from "./pages/ProfectionYear";
import Glossary from "./pages/Glossary";
import Settings from "./pages/Settings";
import About from "./pages/About";
import AdminPrompts from "./pages/AdminPrompts";
import ReflectionHistory from "./pages/ReflectionHistory";
import LifeAtlas from "@/pages/LifeAtlas";
import ReadingsArchive from "./pages/ReadingsArchive";
import Horoscope from "./pages/Horoscope";
import YearCalendar from "./pages/YearCalendar";
import Diagnostics from "./pages/Diagnostics";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Profiles from "./pages/Profiles";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/_core/hooks/useAuth";


function AppLayoutContent() {
  const [location] = useLocation();
const { user, loading } = useAuth();
  const { quickAddMode, setQuickAddMode } = useAddTask();
  // Post-login brand splash — the grand etymology, shown once when "velea_splash" is set by login.
  const [showSplash, setShowSplash] = useState(false);
  // Welcome moment on EVERY app open (any time of day): the sunset shell image + the viewer's own
  // personalized greeting. Fresh login gets the etymology splash instead; every other open gets this.
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeChecked = useRef(false);

  useEffect(() => {
    if (!user || welcomeChecked.current) return;
    welcomeChecked.current = true; // decide once per app load, not on every user-ref change
    try {
      if (sessionStorage.getItem("velea_splash") === "1") {
        sessionStorage.removeItem("velea_splash");
        setShowSplash(true);  // fresh login → the etymology splash
      } else {
        setShowWelcome(true); // returning open → sunset shell + greeting
      }
    } catch { setShowWelcome(true); }
  }, [user]);
  const showNav = !location.startsWith("/404") && !location.startsWith("/login");

  // Ensure the owner's "My Chart" profile exists (idempotent migration)
  const ensureOwnerProfile = trpc.profiles.ensureOwnerProfile.useMutation();
  const hasEnsured = useRef(false);
  useEffect(() => {
    if (user && !hasEnsured.current) {
      hasEnsured.current = true;
      ensureOwnerProfile.mutate();
    }
  }, [user]);

  // New users have an (empty) owner profile but no birth data yet. Until they
  // add it, the astrology features are blank — so route them to Profiles to
  // finish onboarding instead of dropping them on a half-empty Home.
  const { data: subject, isLoading: subjectLoading } = trpc.profiles.getSubject.useQuery(undefined, {
    enabled: !!user,
  });
  const needsBirthData = !!user && !subjectLoading && !subject?.birthDate;

  // Derive today's mode for FAB pre-tagging
  const { data: todayPanchang } = trpc.panchang.today.useQuery(undefined, {
    enabled: !!user,
  });
  const todayMode = todayPanchang?.mode;
  const fabMode: TaskMode =
    (todayMode && PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]) ||
    "Action";

  // ── Draggable FAB ──────────────────────────────────────────────────
  // Persisted position (viewport pixels, left/top). null = default corner.
  const FAB_SIZE = 48;
  const FAB_NAV_CLEARANCE = 80; // keep clear of the bottom nav
  const FAB_MARGIN = 8;
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const [fabDragging, setFabDragging] = useState(false);
  const fabDragRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const clampFabPos = useCallback((x: number, y: number) => {
    const maxX = Math.max(FAB_MARGIN, window.innerWidth - FAB_SIZE - FAB_MARGIN);
    const maxY = Math.max(FAB_MARGIN, window.innerHeight - FAB_SIZE - FAB_NAV_CLEARANCE);
    return {
      x: Math.min(Math.max(x, FAB_MARGIN), maxX),
      y: Math.min(Math.max(y, FAB_MARGIN), maxY),
    };
  }, []);

  // Load persisted position on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("velea_fab_pos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setFabPos(clampFabPos(parsed.x, parsed.y));
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }, [clampFabPos]);

  // Re-clamp on viewport resize so the FAB can't end up off-screen.
  useEffect(() => {
    const onResize = () => {
      setFabPos((prev) => (prev ? clampFabPos(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampFabPos]);

  const handleFabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    fabDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleFabPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = fabDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > 6) {
        drag.moved = true;
        setFabDragging(true);
      }
      if (drag.moved) {
        setFabPos(clampFabPos(e.clientX - drag.offsetX, e.clientY - drag.offsetY));
      }
    },
    [clampFabPos],
  );

  const handleFabPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = fabDragRef.current;
      fabDragRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (drag?.moved) {
        // Persist the dragged position.
        setFabPos((prev) => {
          if (prev) {
            try {
              localStorage.setItem("velea_fab_pos", JSON.stringify(prev));
            } catch {
              /* ignore storage failure */
            }
          }
          return prev;
        });
        setFabDragging(false);
      } else {
        // Treat as a tap → open the add sheet.
        setQuickAddMode(fabMode);
      }
    },
    [fabMode, setQuickAddMode],
  );

  // The bottom nav is pinned via CSS (position: fixed; bottom: 0 + safe-area padding).
  // We deliberately do NOT drive its position from visualViewport: on iOS Safari that
  // reads the dynamic toolbar as if it were the keyboard, pushing the nav up and
  // doubling the apparent footer. The keyboard is handled by AddTaskSheet itself.


  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user && !location.startsWith("/login")) {
    return <Redirect to="/login" />;
  }

  // Redirect from login to home if authenticated
  if (user && location.startsWith("/login")) {
    return <Redirect to="/" />;
  }

  // New user with no birth data → onboard via Profiles (only intercept Home,
  // so they can still reach Settings/other pages if they want).
  if (needsBirthData && location === "/") {
    return <Redirect to="/profiles" />;
  }

  const hardRefresh = async () => {
    try {
      if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); }
      if ("serviceWorker" in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.update())); }
    } catch { /* best-effort */ }
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground star-bg">
      {showSplash && <BrandSplash onDone={() => setShowSplash(false)} />}
      {showWelcome && <WelcomeScreen firstName={user?.name?.split(" ")[0] ?? null} onDone={() => setShowWelcome(false)} />}
      {/* Normal document flow — the page scrolls, the nav is fixed to the viewport bottom. */}
      <main className="overflow-x-hidden relative z-10 content-safe-area">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/" component={Planner} />
          <Route path="/tasks"><Redirect to="/" /></Route>
          <Route path="/planner"><Redirect to="/" /></Route>
          <Route path="/profection" component={ProfectionYear} />
          <Route path="/settings" component={Settings} />
          <Route path="/about" component={About} />
          <Route path="/profiles" component={Profiles} />
          <Route path="/glossary" component={Glossary} />
          <Route path="/reflections" component={ReflectionHistory} />
          <Route path="/readings" component={ReadingsArchive} />
          <Route path="/atlas" component={LifeAtlas} />
        <Route path="/horoscope" component={Horoscope} />
          <Route path="/year" component={YearCalendar} />
          <Route path="/admin/prompts" component={AdminPrompts} />
          <Route path="/admin/users" component={Users} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:projectId" component={ProjectDetail} />
          <Route path="/diagnostics" component={Diagnostics} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>

        {/* Version tag — bottom of every page's scroll, clearing the fixed nav */}
        {showNav && (
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
              padding: "1.25rem 0 calc(88px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <button
              onClick={hardRefresh}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.5rem 1rem", borderRadius: 999, background: "transparent", border: "1px solid var(--heading-ink)", color: "var(--heading-ink)", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}
            >
              <RefreshCw size={15} /> Refresh app
            </button>
            <span style={{ fontSize: "0.66rem", letterSpacing: "0.1em", color: "var(--color-muted-foreground)", opacity: 0.6 }}>
              Velea v{APP_VERSION}
            </span>
          </div>
        )}
      </main>

      {/* Global add task sheet (the FAB). fabMode pre-tags today's mode as a SOFT default, but
          openWithSuggestion lets the mode suggestion bloom and override it — so the FAB add
          behaves like the Projects/Tasks add (suggested mode + why + tap another). */}
      <AddTaskSheet
        open={quickAddMode !== null}
        onClose={() => setQuickAddMode(null)}
        initialMode={fabMode}
        openWithSuggestion
      />

      {/* FAB — floating add task button, above nav bar */}
      {showNav && (
        <button
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          aria-label="Add task"
          data-tour="add-fab"
          className={`fixed z-[60] active:scale-95 ${fabDragging ? "" : "transition-all duration-200"}`}
          style={{
            ...(fabPos
              ? { left: `${fabPos.x}px`, top: `${fabPos.y}px` }
              : {
                  bottom: `calc(72px + env(safe-area-inset-bottom, 0px) + 16px)`,
                  right: '20px',
                }),
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--foreground)',
            color: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px oklch(0 0 0 / 0.35)',
            border: 'none',
            touchAction: 'none',
            cursor: fabDragging ? 'grabbing' : 'pointer',
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Fixed nav bar — always above scroll container */}
      {showNav && (
        <div className="nav-safe-area">
          <BottomNav />
        </div>
      )}

      {/* First-run onboarding for newcomers (intro cards + guided tour) */}
      <Onboarding
        active={!!user && !needsBirthData && !subjectLoading}
        userId={user?.id}
      />

      {/* Full Spectrum — paints every surface today's day-mode color when enabled */}
      {user && <FullSpectrumController />}

      {/* "Looks like you've moved" — offers a location update when the device drifts far */}
      {user && <LocationNudge />}

      {/* Stale-task check-in nudge — a task open >3h with no check-in since offers a current-state check-in */}
      {user && <CheckInNudge />}
    </div>
  );
}

/**
 * AppWithTheme — reads appearance setting and passes it to ThemeProvider.
 * Must be inside SettingsProvider.
 */
function AppWithTheme() {
  const { settings } = useSettingsContext();

  return (
    <ThemeProvider preference={settings.appearance} defaultTheme="dark" switchable={true}>
      <AddTaskProvider>
        <TooltipProvider>
          <Toaster />
          <AppLayoutContent />
        </TooltipProvider>
      </AddTaskProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppWithTheme />
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
