import { useLayoutEffect, useRef, useState } from "react";
import { inkOf } from "@/lib/ink";
import type { ReactNode } from "react";

export type DatelineProps = {
  dateLabel: string;
  time: string;
  modeColor: string;
  modeLabel?: string | null;
  activity?: string | null;
  activityColor?: string;
  horaLord?: string | null;
};

/**
 * Dateline — the header's data-driven meta line: DATE · TIME · MODE · ACTIVITY : HORA.
 *
 * ONE presentational component, rendered IDENTICALLY in AppHeader (live user data) and on the
 * /audit page (a matrix of states). Because both render the same component, the audit grid shows
 * exactly what every user sees — no drift, no need to check accounts one by one.
 *
 * ONE LINE BY CONSTRUCTION (David 2026-07-18: "spaced together neatly on one line, aligned
 * left" — the wrap was the band-aid): a hidden ghost copy of the line is measured at full size;
 * if it overflows the container, the visible line's font scales down JUST enough to fit — floored
 * at MIN_SCALE so it can never shrink into illegibility. The worst realistic line (RESTRAINT •
 * CONSOLIDATE : JUPITER on an iPhone mini) fits at ~0.75x, inside the floor. Only below the
 * floor does it fall back to wrapping, with each "•" trailing its segment so a wrapped line
 * never opens with a dangling bullet.
 */
const BASE_REM = 0.72;
const MIN_SCALE = 0.72;

export default function Dateline({ dateLabel, time, modeColor, modeLabel, activity, activityColor, horaLord }: DatelineProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current, ghost = ghostRef.current;
    if (!box || !ghost) return;
    const fit = () => {
      const need = ghost.scrollWidth;
      const have = box.clientWidth;
      if (!need || !have) return;
      setScale(need <= have ? 1 : Math.max(MIN_SCALE, have / need));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [dateLabel, time, modeLabel, activity, horaLord]);

  const segments: ReactNode[] = [];
  // Date + time are one group (no bullet between them), in the day-mode color.
  segments.push(
    <span key="dt" style={{ display: "inline-flex", alignItems: "center", gap: "0.55em" }}>
      <span style={{ color: inkOf(modeColor) }}>{dateLabel}</span>
      <span style={{ color: inkOf(modeColor), fontVariantNumeric: "tabular-nums" }}>{time}</span>
    </span>,
  );
  if (modeLabel) segments.push(<span key="mode" style={{ color: inkOf(modeColor) }}>{modeLabel}</span>);
  if (activity) segments.push(
    <span key="act" style={{ display: "inline-flex", alignItems: "center", gap: "0.42em" }}>
      <span style={{ color: activityColor ?? "inherit" }}>{activity}</span>
      {horaLord && <><span aria-hidden style={{ opacity: 0.4 }}>:</span><span style={{ color: activityColor ?? modeColor }}>{horaLord}</span></>}
    </span>,
  );

  // Gaps are in EM so they shrink in step with the type — the fitted line keeps its rhythm.
  const line = (extra?: React.CSSProperties) => (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        // Wrapping exists ONLY as the below-floor fallback; at or above the floor the fit
        // guarantees one line, so nowrap keeps measurement honest.
        flexWrap: scale > MIN_SCALE ? "nowrap" : "wrap",
        rowGap: "0.15rem", gap: "0.42em",
        fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase",
        color: "var(--color-muted-foreground)",
        whiteSpace: "nowrap",
        ...extra,
      }}
    >
      {segments.map((seg, i) => (
        // Segment + its TRAILING separator ride one non-shrinking unit, so if the fallback ever
        // wraps, the "•" stays at the end of the previous line and the next segment begins clean.
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.42em", flexShrink: 0 }}>
          {seg}
          {i < segments.length - 1 && <span aria-hidden style={{ opacity: 0.4 }}>•</span>}
        </span>
      ))}
    </div>
  );

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      {/* The ghost: full base size, nowrap, invisible — the honest measure of the line's true width. */}
      <div ref={ghostRef} aria-hidden style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none", width: "100%", overflow: "hidden" }}>
        {line({ fontSize: `${BASE_REM}rem`, flexWrap: "nowrap" })}
      </div>
      {line({ fontSize: `${(BASE_REM * scale).toFixed(4)}rem` })}
    </div>
  );
}
