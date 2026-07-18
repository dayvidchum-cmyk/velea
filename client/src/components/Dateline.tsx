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
 * Robust BY CONSTRUCTION (so it can't render wrong on any user's data):
 *  - It WRAPS, never clips (the "Jupiter cut off" fix) — any time-lord name, any segment count.
 *  - Each separator "•" TRAILS its segment (bundled in the same non-shrinking flex unit), so a
 *    segment that wraps to the next line never starts with a dangling leading bullet (the
 *    "· RESTORE" artifact from Simone's screenshot). The bullet stays at the end of the prior line.
 */
export default function Dateline({ dateLabel, time, modeColor, modeLabel, activity, activityColor, horaLord }: DatelineProps) {
  const segments: ReactNode[] = [];
  // Date + time are one group (no bullet between them), in the day-mode color.
  segments.push(
    <span key="dt" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ color: modeColor }}>{dateLabel}</span>
      <span style={{ color: modeColor, fontVariantNumeric: "tabular-nums" }}>{time}</span>
    </span>,
  );
  if (modeLabel) segments.push(<span key="mode" style={{ color: modeColor }}>{modeLabel}</span>);
  if (activity) segments.push(
    <span key="act" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
      <span style={{ color: activityColor ?? "inherit" }}>{activity}</span>
      {horaLord && <><span aria-hidden style={{ opacity: 0.4 }}>:</span><span style={{ color: activityColor ?? modeColor }}>{horaLord}</span></>}
    </span>,
  );

  return (
    <div className="no-scrollbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: "0.15rem", overflow: "hidden", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
      {segments.map((seg, i) => (
        // Segment + its TRAILING separator ride one non-shrinking unit, so on a wrap the "•" stays
        // at the end of the previous line and the next segment begins clean.
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
          {seg}
          {i < segments.length - 1 && <span aria-hidden style={{ opacity: 0.4 }}>•</span>}
        </span>
      ))}
    </div>
  );
}
