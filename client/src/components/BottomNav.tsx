import { useLocation } from "wouter";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import {
  BookOpen,
  Library,
  Settings,
  Folder,
} from "lucide-react";
import VeleaMark from "./VeleaMark";
import DotMark from "./DotMark";

const BASE_NAV = [
  { path: "/", label: "Today", icon: VeleaMark },
  { path: "/profection", label: "Chart", icon: BookOpen },
  { path: "/projects", label: "Projects", icon: Folder },
  { path: "/glossary", label: "Glossary", icon: Library },
  { path: "/horoscope", label: "Horoscope", icon: DotMark },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  // Active + hover accent follows today's day mode, so the nav reinforces
  // "today is a Build/Action/Restraint day" on every page.
  const accent = useDayModeColor();

  // Profiles/Users lives on the profile FAB now (its menu has "Manage profiles"),
  // so the nav stays a clean single row: Today · Chart · Projects · Glossary · Settings.
  const navItems = [
    ...BASE_NAV,
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Projects tab active: exact match or any sub-route
  const isProjectsActive =
    location === "/projects" || location.startsWith("/projects/");

  return (
    <nav className="glass-nav">
      <div className="flex items-stretch justify-between max-w-lg mx-auto px-4" style={{ height: 58 }}>
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = path === "/projects" ? isProjectsActive : location === path;
          return (
            <button
              key={path}
              data-tour={path === "/profection" ? "chart-nav" : path === "/settings" ? "settings-nav" : undefined}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative"
              style={{ minWidth: 0, overflow: "hidden", color: active ? accent : "var(--muted-foreground)" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = accent; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--muted-foreground)"; }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                style={active ? { filter: `drop-shadow(0 0 6px ${accent}66)` } : {}}
              />
              <span
                className="font-medium uppercase"
                style={{ fontSize: "9px", letterSpacing: "0", lineHeight: 1, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "clip" }}
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
