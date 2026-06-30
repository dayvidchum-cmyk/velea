import { Toaster } from "@/components/ui/sonner";
import React, { useRef, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Plus } from "lucide-react";
import { PANCHANG_TO_TASK_MODE, type TaskMode } from "@shared/types";
import { trpc } from "@/lib/trpc";

import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider, useSettingsContext } from "./contexts/SettingsContext";
import { AddTaskProvider, useAddTask } from "./contexts/AddTaskContext";
import BottomNav from "./components/BottomNav";
import AddTaskSheet from "./components/AddTaskSheet";
import Onboarding from "./components/Onboarding";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import DashaTimeline from "./pages/DashaTimeline";
import ProfectionYear from "./pages/ProfectionYear";
import Astrology from "./pages/Astrology";
import Glossary from "./pages/Glossary";
import Settings from "./pages/Settings";
import AdminPrompts from "./pages/AdminPrompts";
import ReflectionHistory from "./pages/ReflectionHistory";
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

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col star-bg">
      {/* Scrollable content area — single scroll container */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 content-safe-area">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/astrology" component={Astrology} />
          <Route path="/" component={Planner} />
          <Route path="/tasks"><Redirect to="/" /></Route>
          <Route path="/planner"><Redirect to="/" /></Route>
          <Route path="/dasha" component={DashaTimeline} />
          <Route path="/profection" component={ProfectionYear} />
          <Route path="/settings" component={Settings} />
          <Route path="/profiles" component={Profiles} />
          <Route path="/glossary" component={Glossary} />
          <Route path="/reflections" component={ReflectionHistory} />
          <Route path="/admin/prompts" component={AdminPrompts} />
          <Route path="/admin/users" component={Users} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:projectId" component={ProjectDetail} />
          <Route path="/diagnostics" component={Diagnostics} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Global add task sheet */}
      <AddTaskSheet
        open={quickAddMode !== null}
        onClose={() => setQuickAddMode(null)}
        initialMode={fabMode}
      />

      {/* FAB — floating add task button, above nav bar */}
      {showNav && (
        <button
          onClick={() => setQuickAddMode(fabMode)}
          aria-label="Add task"
          className="fixed z-[60] transition-all duration-200 active:scale-95"
          style={{
            bottom: `calc(72px + env(safe-area-inset-bottom, 0px) + 16px)`,
            right: '20px',
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
        active={!!user && !needsBirthData && !subjectLoading && location === "/"}
        userId={user?.id}
      />
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
