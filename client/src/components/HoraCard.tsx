import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import LockedFeatureCard from "./LockedFeatureCard";

/**
 * Hora — the planetary hour, the intraday layer next to Master Mode. PRIVATE
 * (endpoint returns null off the allowlist → card renders nothing). Collapsible:
 * the current hora always shows; the 24-hora timeline expands on tap.
 * Answers "is this hour good, within today's focus?" — it modifies timing, never
 * the day's mode.
 */

// Planet tone → color (benefic gold/teal, neutral slate, malefic rose).
const TONE_COLOR: Record<string, string> = {
  benefic: "#D4AF37",
  neutral: "#7C8AA0",
  malefic: "#B15F71",
};

export default function HoraCard() {
  const [expanded, setExpanded] = useState(false);
  const { data: access } = trpc.masterMode.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data } = trpc.masterMode.hora.useQuery({ date: dateStr }, { staleTime: 1000 * 60 * 5, enabled: entitled });

  // Public but locked: non-entitled users see the tile with a lock + explainer popup.
  if (access && !entitled) {
    return (
      <LockedFeatureCard
        title="Hora"
        teaser="The planetary hour — which lord holds this hour, and what it favors."
        detail="Every hour of the day is ruled by a planet; Hora tracks which lord holds the current hour and what it's good for, so you can time the small moves. Part of the Time Master layer — not yet unlocked on your account."
      />
    );
  }
  if (!data) return null;

  const nowMs = Date.now();
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const current = data.horas.find((h) => nowMs >= h.startMs && nowMs < h.endMs);

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "0.85rem 0.9rem", display: "flex", flexDirection: "column", height: "100%" }}>
      <button onClick={() => setExpanded((e) => !e)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground)", whiteSpace: "nowrap" }}>Hora</span>
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} style={{ color: "var(--color-muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--color-muted-foreground)" }} />}
        </span>
      </button>
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.56rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>planetary hour</p>

      {expanded && current && (
        <div style={{ marginTop: "0.6rem" }}>
          <p style={{ margin: 0, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Now · {current.phase}</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "1rem", fontWeight: 800, color: TONE_COLOR[current.tone], lineHeight: 1.1 }}>{current.lord} hora</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.66rem", color: "var(--color-muted-foreground)" }}>until {fmt(current.endMs)}</p>
          {!expanded && <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "var(--foreground)", lineHeight: 1.3 }}>{current.good}</p>}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "0.7rem" }}>
          {current && <p style={{ margin: "0 0 0.55rem", fontSize: "0.72rem", color: "var(--foreground)", lineHeight: 1.35 }}>{current.good}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {data.horas.map((h, i) => {
              const isNow = current && h.startMs === current.startMs;
              const past = nowMs >= h.endMs;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.2rem", borderRadius: 8, background: isNow ? `color-mix(in srgb, ${TONE_COLOR[h.tone]} 12%, transparent)` : "transparent", opacity: past && !isNow ? 0.45 : 1 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: TONE_COLOR[h.tone], flexShrink: 0 }} />
                  <span style={{ fontSize: "0.66rem", color: "var(--color-muted-foreground)", width: "3.9rem", flexShrink: 0 }}>{fmt(h.startMs)}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: isNow ? 700 : 500, color: isNow ? TONE_COLOR[h.tone] : "var(--foreground)" }}>{h.lord}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
