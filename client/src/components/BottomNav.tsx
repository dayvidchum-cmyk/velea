import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import {
  BookOpen,
  Library,
  Settings,
  Folder,
  Users,
  CircleDot,
} from "lucide-react";

const BASE_NAV = [
  { path: "/", label: "Today", icon: BookOpen },
  { path: "/projects", label: "Projects", icon: Folder },
  { path: "/profection", label: "Chart", icon: CircleDot },
  { path: "/glossary", label: "Glossary", icon: Library },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  // Active + hover accent follows today's day mode, so the nav reinforces
  // "today is a Build/Action/Restraint day" on every page.
  const accent = useDayModeColor();
  const isAdmin = user?.role === "admin";

  // Everything lives directly in the bar now. Users is admin-only, so a normal
  // user sees a clean single row of icons — no "More" sheet needed.
  const navItems = [
    ...BASE_NAV,
    ...(isAdmin ? [{ path: "/profiles", label: "Users", icon: Users }] : []),
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Projects tab active: exact match or any sub-route
  const isProjectsActive =
    location === "/projects" || location.startsWith("/projects/");

  return (
    <nav className="glass-nav">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = path === "/projects" ? isProjectsActive : location === path;
          return (
            <button
              key={path}
              data-tour={path === "/profection" ? "chart-nav" : undefined}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 px-2 py-3 flex-1 transition-all duration-200 relative"
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
      </div>
    </nav>
  );
}
