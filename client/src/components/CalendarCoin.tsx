import type { ReactNode } from "react";
import PlanetMark, { PLANET_MARK_INK } from "@/components/PlanetMark";
import OctagramMark from "@/components/OctagramMark";
import CrownMark from "@/components/CrownMark";

const DOLLAR_INK = "#2E9B54"; // MARK_INK.dollar

export type CalendarCoinProps = {
  day: number;
  isToday?: boolean;
  isCrown?: boolean;
  isEclipse?: boolean;
  hasMode?: boolean;
  filled?: boolean;
  pulse?: "today" | "lakshmi" | null;
  // Resolved colors — the caller (Planner) computes these with its full palette logic, so this
  // component never re-derives them (zero color drift, zero regression risk on the live coin).
  border: string;
  numberColor: string;
  restingBg: string;
  hoverBg?: string;
  pressBg?: string;
  activeInk?: string;
  accent: string; // for the today square fill
  // Marks (planet names + flags) — the rail/center LAYOUT is computed here, so it's what /audit tests.
  stations?: string[];
  windows?: string[];
  moonPhase?: "full" | "new" | null;
  prosperity?: boolean;
  achievement?: boolean;
  /** THE BINDI LADDER (David 2026-07-18): up to 3 fixed tracks under the coin, one per rx planet.
   *  Dot COUNT = current strength (5 station · 4 window · 3 rx · 2 pre-shadow · 1 post-shadow);
   *  dot COLOR = the planet's own ink (identity = color + fixed row). null = the planet's track
   *  is empty today but keeps its slot, so rows never jump between days. */
  bindis?: Array<{ planet: string; strength: number } | null>;
};

/**
 * CalendarCoin — the calendar day coin's VISUAL, extracted from Planner so the SAME component
 * renders live (in the month grid) and on /audit (a matrix of mark combinations). No drift: what
 * the audit grid shows is exactly what the calendar shows.
 *
 * THE ONE TEMPLATE (David 2026-07-17): a MARK RAIL above (station/window planets, moon, €,
 * achievement ♛ — fixed count-scaled slots so it never spills the 32px coin) and the COIN below
 * (always the date NUMBER, except the two apex exceptions: crown octagram, eclipse disc). Today
 * wears a dark square fill with a white number.
 */
export default function CalendarCoin(p: CalendarCoinProps) {
  const { day, isToday, isCrown, isEclipse, hasMode, filled, pulse, border, numberColor, restingBg,
    hoverBg, pressBg, activeInk, accent, stations = [], windows = [], moonPhase, prosperity, achievement, bindis } = p;
  const hasBindis = !!bindis?.some(Boolean);

  return (
    <div
      className={`flex items-center justify-center${pulse === "today" ? " today-pulse" : pulse === "lakshmi" ? " lakshmi-pulse" : ""}`}
      style={{
        position: "relative", width: "32px", height: "32px", borderRadius: 999,
        transition: "background 150ms", color: numberColor, background: restingBg, border,
      }}
      onMouseEnter={(e) => { if (!window.matchMedia("(hover: hover)").matches) return; if (hoverBg) e.currentTarget.style.background = hoverBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = restingBg; e.currentTarget.style.color = numberColor; }}
      onMouseDown={(e) => { if (pressBg) e.currentTarget.style.background = pressBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
      onMouseUp={(e) => { if (hoverBg) e.currentTarget.style.background = hoverBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
    >
      {/* TODAY: a matching-color SQUARE FILL darker than the coin, white number reading on it. */}
      {isToday && (
        <span aria-hidden style={{ position: "absolute", inset: -1, background: `color-mix(in srgb, ${accent} 55%, #191109)`, borderRadius: 6, pointerEvents: "none", zIndex: 0 }} />
      )}

      {/* THE MARK RAIL — all secondary marks, one aligned rail above the coin. */}
      {(stations.length > 0 || windows.length > 0 || !!moonPhase || !!prosperity || !!achievement) && (() => {
        const others: ReactNode[] = [];
        const markCount = stations.length + windows.length + (moonPhase ? 1 : 0) + (prosperity ? 1 : 0);
        const g = markCount >= 4 ? 10 : markCount === 3 ? 12 : 13;
        const dotSz = markCount >= 4 ? 7 : 9;
        const slotW = markCount >= 4 ? Math.max(7, Math.floor(32 / markCount)) : markCount === 3 ? 11 : 12;
        for (const pl of stations) others.push(<PlanetMark key={`st-${pl}`} planet={pl} size={g} strokeWidth={2.1} />);
        if (moonPhase) others.push(
          <span key="moon" style={{ width: dotSz, height: dotSz, borderRadius: 999, alignSelf: "center",
            background: moonPhase === "full" ? "#FDFBF3" : "#160f26",
            border: moonPhase === "full" ? "1px solid #8a8264" : "1px solid #160f26", display: "inline-block" }} />
        );
        if (prosperity) others.push(<span key="$" style={{ fontFamily: "Georgia, serif", fontSize: `${g + 1}px`, fontWeight: 600, color: DOLLAR_INK, alignSelf: "center", lineHeight: 1 }}>€</span>);
        for (const pl of windows) others.push(<PlanetMark key={pl} planet={pl} size={g} strokeWidth={2.1} />);
        const hasCrownMark = !!achievement;
        const mid = Math.floor(others.length / 2);
        const slot = (node: ReactNode, key: React.Key) => (
          <span key={key} style={{ width: slotW, display: "flex", justifyContent: "center", alignItems: "center" }}>{node}</span>
        );
        const slotted = others.map((n, i) => slot(n, i));
        return (
          <span style={{ position: "absolute", top: -17, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
            {hasCrownMark ? (
              <span style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%", lineHeight: 1, whiteSpace: "nowrap" }}>
                <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>{slotted.slice(0, mid)}</span>
                <CrownMark size={17} style={{ transform: "translateY(-2px)" }} />
                <span style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>{slotted.slice(mid)}</span>
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", lineHeight: 1, whiteSpace: "nowrap" }}>{slotted}</span>
            )}
          </span>
        );
      })()}

      {/* THE COIN CENTER — crown octagram / eclipse disc / else the date number. */}
      {isCrown ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0, pointerEvents: "none" }}><OctagramMark size={25} color="#D4AF37" strokeWidth={1.3} style={{ filter: "drop-shadow(0 0 3px rgba(212,175,55,0.6))" }} /></span>
      ) : isEclipse ? (
        <span style={{ width: 20, height: 20, borderRadius: 999, background: "#160f26", border: "1.25px solid #F2C21C", boxShadow: "0 0 6px rgba(242,194,28,0.55)", pointerEvents: "none", display: "inline-block" }} />
      ) : (
        <span style={{ color: isToday ? "#FBF7ED" : "inherit", fontWeight: filled ? 700 : 600, fontSize: "1.15rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
          {day}
        </span>
      )}

      {/* THE BINDI LADDER — the rail's mirror, below the coin. Each rx planet holds a FIXED track;
          its dots (in its own ink) count the movement's strength today. Empty tracks keep their
          3px slot so a planet's line never jumps rows across the month. Quiet by design: a slow
          planet's months-long rx reads as a soft line of dots, never a glyph-per-day shout. */}
      {hasBindis && (
        {/* Left-aligned (David 2026-07-18): every ribbon drains from the same origin — the coin's
            left edge — so the count reads comparably across days, like a bar emptying. */}
        <span aria-hidden style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, pointerEvents: "none", zIndex: 1 }}>
          {bindis!.map((t, row) => (
            <span key={row} style={{ display: "flex", gap: 2, height: 3, alignItems: "center", justifyContent: "flex-start" }}>
              {t && Array.from({ length: Math.max(0, Math.min(5, t.strength)) }, (_, i) => (
                <span key={i} style={{ width: 3, height: 3, borderRadius: 999, background: PLANET_MARK_INK[t.planet] ?? "currentColor", display: "inline-block" }} />
              ))}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
