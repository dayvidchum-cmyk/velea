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
  /** SHADOW THRESHOLDS: planets whose shadow OPENS or CLOSES today — their glyph rides the rail
   *  (full ink, like every glyph; the signal is that it appears ONLY on the threshold days). */
  shadows?: string[];
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
    hoverBg, pressBg, activeInk, accent, stations = [], windows = [], moonPhase, prosperity, achievement, bindis, shadows = [] } = p;
  const hasBindis = !!bindis?.some(Boolean);

  // TODAY IS THE SQUARE (David's 18-coin screenshot: "sloppy… the edges of the circle poking
  // out") — a circle behind a slightly-larger square always leaks its curve at the edge
  // midpoints, and the round pulse ring haloed past the corners. So today the coin BECOMES the
  // square: one shape, dark mode-mix fill, white number; the pulse's box-shadow follows the
  // square's radius. Hover/press bg swaps are skipped for today (they'd flash the round tint).
  const todayBg = `color-mix(in srgb, ${accent} 55%, #191109)`;
  return (
    <div
      className={`flex items-center justify-center${pulse === "today" ? " today-pulse" : pulse === "lakshmi" ? " lakshmi-pulse" : ""}`}
      style={{
        position: "relative", width: "32px", height: "32px", borderRadius: isToday ? 7 : 999,
        transition: "background 150ms", color: numberColor, background: isToday ? todayBg : restingBg, border,
      }}
      onMouseEnter={(e) => { if (isToday) return; if (!window.matchMedia("(hover: hover)").matches) return; if (hoverBg) e.currentTarget.style.background = hoverBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
      onMouseLeave={(e) => { if (isToday) return; e.currentTarget.style.background = restingBg; e.currentTarget.style.color = numberColor; }}
      onMouseDown={(e) => { if (isToday) return; if (pressBg) e.currentTarget.style.background = pressBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
      onMouseUp={(e) => { if (isToday) return; if (hoverBg) e.currentTarget.style.background = hoverBg; if (hasMode && activeInk) e.currentTarget.style.color = activeInk; }}
    >

      {/* THE MARK RAIL — all secondary marks, one aligned rail above the coin. */}
      {(stations.length > 0 || windows.length > 0 || shadows.length > 0 || !!moonPhase || !!prosperity || !!achievement) && (() => {
        const others: ReactNode[] = [];
        // David's 12/14 catch (2026-07-18): the old scaling shrank SLOTS faster than GLYPHS — at
        // 3 marks a 12px glyph sat in an 11px slot, so neighbors overlapped by a pixel and the
        // trio read cramped/odd. LAW: a glyph NEVER exceeds its slot (glyph = slot width). The
        // real width budget is the CELL (~44px on a phone), not the 32px coin — so 3 marks get
        // honest 12px slots (36px total) instead of being crushed into the coin.
        // 2026-07-20, EYES ON IT at true phone width: the rail overflowed into the NEIGHBOURING
        // day and two loaded days ran together into one illegible strip of glyphs. Two causes,
        // both structural:
        //   (a) the CROWN was never in the width budget. It renders inside this same row at 17px,
        //       but slotW was chosen from markCount alone — so "5 marks + ♛" asked for 5×8+17 =
        //       57px inside a ~48px cell, and "3 marks + ♛" asked for 53px.
        //   (b) nothing CLAMPED the row to the cell. It is absolutely positioned with nowrap, so
        //       any excess silently spills both ways into the days either side.
        // THE RAIL BUDGET is now a hard ceiling and the slot width is SOLVED from it, crown
        // included. The measured phone cell is 48.8px (390px viewport), so a 40px rail leaves
        // ~4.4px of air on each side — nearly a glyph of gutter between two fully-loaded
        // neighbours, which is what makes them read as two days instead of one strip.
        // The glyph = its slot (the standing law) still holds.
        //
        // WHAT THIS FIXED BUDGET ASSUMES, stated rather than left silent (threshold-honesty):
        // the cell is (viewport - 32px page padding - 16px card padding) / 7, so
        //   430px → 54.6   ·   390px → 48.8   ·   375px → 46.7   ·   360px → 44.6   ✓ all clear
        //   320px → 38.9   ✗ narrower than the budget
        // Solving (W - 48)/7 = 40 puts the break-even viewport at 328px. Every iPhone from the
        // SE 2nd-gen (375px) up is clear with room; the only common device below the line is the
        // 2016 SE / iPhone 5 at 320px, where a FULLY loaded rail (5 marks, or 4 + a crown) could
        // touch its neighbour again. A pure-CSS responsive scale is not expressible here (the
        // ratio would need a length divided by a length), so if a 320px user ever matters this
        // wants a measured cell width passed in, not a smaller constant for everybody.
        const RAIL_BUDGET = 40;
        const hasCrown = !!achievement;
        // With a crown in the row, one fewer slotted mark — the build order below IS the priority
        // order, so the quietest mark yields rather than every glyph shrinking to a smudge.
        const maxSlots = hasCrown ? 4 : 5;
        const rawCount = stations.length + windows.length + shadows.length + (moonPhase ? 1 : 0) + (prosperity ? 1 : 0);
        const markCount = Math.min(rawCount, maxSlots);
        // A crown ALONE keeps its full 17px (the common achievement day is unchanged); it yields to
        // 14 only when it has to share the rail with glyphs.
        const crownW = !hasCrown ? 0 : markCount === 0 ? 17 : 14;
        const slotW = markCount === 0 ? 0
          : Math.max(7, Math.min(13, Math.floor((RAIL_BUDGET - crownW) / markCount)));
        const g = slotW;
        // Moon dot and € ride their slot too — a 9px dot in a 7px slot is the same overlap bug.
        const dotSz = Math.max(6, Math.min(9, slotW - 1));
        for (const pl of stations) others.push(<PlanetMark key={`st-${pl}`} planet={pl} size={g} strokeWidth={2.1} />);
        // Shadow thresholds: the glyph, FULL ink like every rail glyph (David 2026-07-18: "the
        // glyph does not need to change opacity ever" — the quiet is that it appears ONLY on the
        // threshold days, not a ghost treatment most people would never register).
        for (const pl of shadows) others.push(<PlanetMark key={`sh-${pl}`} planet={pl} size={g} strokeWidth={2.1} />);
        if (moonPhase) others.push(
          <span key="moon" style={{ width: dotSz, height: dotSz, borderRadius: 999, alignSelf: "center",
            background: moonPhase === "full" ? "#FDFBF3" : "#160f26",
            border: moonPhase === "full" ? "1px solid #8a8264" : "1px solid #160f26", display: "inline-block" }} />
        );
        if (prosperity) others.push(<span key="$" style={{ fontFamily: "Georgia, serif", fontSize: `${g}px`, fontWeight: 600, color: DOLLAR_INK, alignSelf: "center", lineHeight: 1 }}>€</span>);
        for (const pl of windows) others.push(<PlanetMark key={pl} planet={pl} size={g} strokeWidth={2.1} />);
        const slot = (node: ReactNode, key: React.Key) => (
          <span key={key} style={{ width: slotW, display: "flex", justifyContent: "center", alignItems: "center" }}>{node}</span>
        );
        // AUDIT LOW (2026-07-18): unbounded mark counts (2 stations + windows + moon + € + crown)
        // could outgrow the cell. Hard cap at maxSlots — the build order above IS the priority
        // order (stations first), so the least-loud marks are the ones that yield.
        const slotted = others.slice(0, maxSlots).map((n, i) => slot(n, i));
        const mid = Math.floor(slotted.length / 2); // split the SLOTTED marks, not the pre-cap list
        return (
          <span style={{ position: "absolute", top: -17, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
            {hasCrown ? (
              // David's 11/16 catch: the old 1fr|auto|1fr grid hard-pinned the crown to the coin's
              // axis and split flanks floor/ceil — an ODD mark count dumped the extra glyph on the
              // right and the cluster never re-centered. Now the WHOLE cluster (crown mid, marks
              // around) centers as one unit; with even flanks the crown still sits exactly on-axis.
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, whiteSpace: "nowrap" }}>
                {slotted.slice(0, mid)}
                <CrownMark size={crownW} style={{ transform: "translateY(-2px)", flexShrink: 0 }} />
                {slotted.slice(mid)}
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
        // ONE AXIS (David 2026-07-18, the day-26 screenshot): glyphs, coin, and ribbons all center
        // on the CELL's centerline. The earlier left-anchor made an 8-dot row grow rightward only,
        // shoving the ribbon block's center off the coin's. Now a full station row (8 · ~38px)
        // spans the true cell width symmetrically, and shorter ribbons shrink toward center —
        // the coin sits centered above the ribbons and below the glyphs, always.
        // Ladder: 8 station · 6 window · 4 mid-rx · 2 pre-shadow · 1 post-shadow.
        <span aria-hidden style={{ position: "absolute", top: "calc(100% + 3px)", left: "50%", transform: "translateX(-50%)", width: "max-content", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pointerEvents: "none", zIndex: 1 }}>
          {bindis!.map((t, row) => {
            const DOTS: Record<number, number> = { 5: 8, 4: 6, 3: 4, 2: 2, 1: 1 };
            const n = t ? (DOTS[Math.max(1, Math.min(5, t.strength))] ?? 0) : 0;
            return (
              <span key={row} style={{ display: "flex", gap: 2, height: 3, alignItems: "center", justifyContent: "center" }}>
                {t && Array.from({ length: n }, (_, i) => (
                  <span key={i} style={{ width: 3, height: 3, borderRadius: 999, background: PLANET_MARK_INK[t.planet] ?? "currentColor", display: "inline-block" }} />
                ))}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
