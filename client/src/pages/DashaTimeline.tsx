import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import GlossaryText from "@/components/GlossaryText";
import { useDayModeColor } from "@/hooks/useDayModeColor";

// ── CONSTANTS ─────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun:     "#D1A904",
  Moon:    "#C0C0C0",
  Mars:    "#BD0039",
  Mercury: "#85CDB5",
  Jupiter: "#E8BE4E",
  Venus:   "#F8A4AC",
  Saturn:  "#3F50AF",
  Ketu:    "#9A7B6C",
  Rahu:    "#5691A4",
};

// Hex versions for rgba mixing in backgrounds (same as PLANET_COLORS since we now use hex throughout)
const PLANET_HEX: Record<string, string> = {
  Sun:     "#D1A904",
  Moon:    "#C0C0C0",
  Mars:    "#BD0039",
  Mercury: "#85CDB5",
  Jupiter: "#E8BE4E",
  Venus:   "#F8A4AC",
  Saturn:  "#3F50AF",
  Ketu:    "#9A7B6C",
  Rahu:    "#5691A4",
};

const MAHADASHA_DURATIONS: Record<string, number> = {
  Mercury: 17, Ketu: 7, Venus: 20, Sun: 6, Moon: 10,
  Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19,
};


// ── HELPERS ───────────────────────────────────────────────────

interface DashaEntry {
  mahadasha: string;
  antardasha: string;
  startDate: string;
  endDate: string;
  startAge: string;
  duration: string;
  isCurrent: boolean;
}

function groupByMahadasha(data: DashaEntry[]) {
  const groups: { mahadasha: string; periods: DashaEntry[] }[] = [];
  let current: { mahadasha: string; periods: DashaEntry[] } | null = null;
  for (const d of data) {
    if (!current || current.mahadasha !== d.mahadasha) {
      current = { mahadasha: d.mahadasha, periods: [] };
      groups.push(current);
    }
    current.periods.push(d);
  }
  return groups;
}

/** Format YYYY-MM-DD as MM/DD/YYYY for display */
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

// ── SKELETON ──────────────────────────────────────────────────

function DashaSkeleton() {
  return (
    <div className="container py-6 space-y-5">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded animate-pulse" style={{ background: "var(--color-secondary)" }} />
        <div className="h-4 w-72 rounded animate-pulse" style={{ background: "var(--color-secondary)" }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-secondary)" }} />
      ))}
    </div>
  );
}

// ── COMPONENT ─────────────────────────────────────────────────

export default function DashaTimeline() {
  const [expandedMaha, setExpandedMaha] = useState<string | null>(null);
  const dayLabelColor = useDayModeColor();

  const { data, isLoading, error } = trpc.dasha.timeline.useQuery(undefined, {
    retry: false,
  });

  // ── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return <DashaSkeleton />;
  }

  // ── Error / no birth data ────────────────────────────────────
  if (error || !data) {
    const msg = error?.message ?? "Unable to load dasha timeline.";
    const needsBirthData =
      msg.includes("Birth date not configured") ||
      msg.includes("Birth chart not calculated");

    return (
      <div className="container py-6 space-y-5">
        <AppHeader pageTitle="Dasha Timeline" />
        <div
          className="rounded-xl p-6 text-center space-y-3"
          style={{ border: `1.5px solid ${dayLabelColor}`, background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))` }}
        >
          <p className="text-sm" style={{ color: "var(--color-foreground)" }}>
            {needsBirthData
              ? "Your birth chart hasn't been calculated yet."
              : msg}
          </p>
          {needsBirthData && (
            <>
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                Go to Settings → Birth Chart to enter your birth details and calculate your chart.
              </p>
              <Link
                href="/settings"
                className="inline-block px-4 py-2 rounded-full text-xs"
                style={{
                  background: "var(--color-primary)",
                  color: "oklch(1 0 0)",
                  letterSpacing: "0.04em",
                }}
              >
                Open Settings
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────
  const groups = groupByMahadasha(data.entries);
  const currentPeriod = data.entries.find((d) => d.isCurrent);
  const currentMaha = currentPeriod?.mahadasha ?? null;

  return (
    <div className="container py-6 space-y-5">
      {/* Header */}
      <AppHeader pageTitle="Dasha Timeline" />
      <p className="text-xs -mt-4" style={{ color: "var(--color-muted-foreground)" }}>
        {data.userName ? `${data.userName} · ` : ""}
        {data.lagnaSign ? `${data.lagnaSign} Lagna · ` : ""}
        Moon in {data.moonNakshatra} · {data.startingDashaLord} Mahadasha at birth
      </p>

      {/* Context note */}
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
        <GlossaryText>The primary timing system in Jyotish. The 120-year cycle begins from the Moon's nakshatra at birth (</GlossaryText>
        {data.moonNakshatra} — {data.startingDashaLord}
        <GlossaryText> Mahadasha). Each Mahadasha is subdivided into 9 Antardashas.</GlossaryText>
      </p>

      {/* Active period banner — tapping expands that mahadasha */}
      {currentPeriod && (
        <button
          className="w-full text-left rounded-xl overflow-hidden"
          style={{
            border: `1.5px solid ${dayLabelColor}`,
            background: `color-mix(in srgb, ${dayLabelColor} 14%, var(--background))`,
          }}
          onClick={() =>
            setExpandedMaha(
              expandedMaha === currentMaha ? null : currentMaha
            )
          }
        >
          <div className="px-4 py-2 flex items-center gap-2" style={{ background: dayLabelColor }}>
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.8)" }}
            />
            <span
              className="text-sm font-bold uppercase"
              style={{ color: "#ffffff", letterSpacing: "0.08em" }}
            >
              Active Period
            </span>
          </div>
          <div className="p-4">
          <p className="text-base" style={{ color: "var(--color-foreground)" }}>
            <GlossaryText>{currentPeriod.mahadasha}</GlossaryText> / <GlossaryText>{currentPeriod.antardasha}</GlossaryText>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            Started {formatDate(currentPeriod.startDate)} · Duration {currentPeriod.duration}
          </p>
          </div>
        </button>
      )}

      {/* Mahadasha groups */}
      <div className="space-y-2 pb-24">
        {groups.map((g) => {
          const color = PLANET_COLORS[g.mahadasha] ?? "#888";
          const hex = PLANET_HEX[g.mahadasha] ?? "#888888";
          const isExpanded = expandedMaha === g.mahadasha;
          const hasActive = g.periods.some((p) => p.isCurrent);
          const dur = MAHADASHA_DURATIONS[g.mahadasha] ?? 10;

          return (
            <div
              key={g.mahadasha}
              className="rounded-xl overflow-hidden"
              style={{
                border: hasActive
                  ? `2px solid ${color}`
                  : `1px solid ${hex}99`,
                boxShadow: hasActive ? `0 0 20px ${color}44` : "none",
              }}
            >
              {/* Mahadasha header — planet color background, white text */}
              <button
                className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
                style={{
                  background: hasActive
                    ? `${hex}F0`   /* active/current: very rich, ~94% opacity — always darkest */
                    : `${hex}AA`,  /* inactive: solid mid-dark, ~67% opacity */
                }}
                onClick={() =>
                  setExpandedMaha(isExpanded ? null : g.mahadasha)
                }
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    boxShadow: hasActive ? `0 0 8px rgba(255,255,255,0.6)` : "none",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>
                      {g.mahadasha} Mahadasha
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {dur} yrs
                    </span>
                    {hasActive && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.20)",
                          color: "rgba(255,255,255,0.95)",
                          border: "1px solid rgba(255,255,255,0.40)",
                        }}
                      >
                        ◉ Active
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,255,255,0.60)" }}
                  >
                    {formatDate(g.periods[0].startDate)} · {g.periods.length} sub-periods
                  </div>
                </div>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Antardasha list */}
              {isExpanded && (
                <div
                  style={{
                    background: "var(--color-card)",
                    borderTop: `1px solid ${hex}55`,
                  }}
                >
                  {g.periods.map((period, i) => {
                    const antColor = PLANET_COLORS[period.antardasha] ?? "#888";
                    const antHex = PLANET_HEX[period.antardasha] ?? "#888888";
                    const isCurrent = !!period.isCurrent;
                    return (
                      <div
                        key={`${period.mahadasha}-${period.antardasha}-${i}`}
                        className="px-4 py-3"
                        style={{
                          borderBottom:
                            i < g.periods.length - 1
                              ? "1px solid var(--color-border)"
                              : "none",
                          background: isCurrent ? `${antHex}18` : "transparent",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: antColor }}
                          />
                          <span
                            className="text-sm flex-shrink-0"
                            style={{
                              color: isCurrent
                                ? "var(--color-foreground)"
                                : "var(--color-muted-foreground)",
                              minWidth: "80px",
                            }}
                          >
                            {period.antardasha}
                          </span>
                          {isCurrent && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: `${antHex}25`,
                                color: antColor,
                                border: `1px solid ${antHex}50`,
                              }}
                            >
                              NOW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 pl-5 flex-wrap">
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {formatDate(period.startDate)}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            · {period.duration}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            · {period.startAge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
