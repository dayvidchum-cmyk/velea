import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data } = trpc.masterMode.hora.useQuery({ date: dateStr }, { staleTime: 1000 * 60 * 5 });
  if (!data) return null;

  const nowMs = Date.now();
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const current = data.horas.find((h) => nowMs >= h.startMs && nowMs < h.endMs);

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      <button onClick={() => setExpanded((e) => !e)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
          Hora · planetary hour
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-gold)", opacity: 0.75 }}>private</span>
          {expanded ? <ChevronDown size={15} style={{ color: "var(--color-muted-foreground)" }} /> : <ChevronRight size={15} style={{ color: "var(--color-muted-foreground)" }} />}
        </span>
      </button>

      {current && (
        <div style={{ marginTop: "0.85rem", borderRadius: 12, padding: "0.85rem 1rem", background: `color-mix(in srgb, ${TONE_COLOR[current.tone]} 16%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${TONE_COLOR[current.tone]} 45%, transparent)` }}>
          <p style={{ margin: 0, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Now · {current.phase}</p>
          <p style={{ margin: "0.15rem 0 0", fontSize: "1.15rem", fontWeight: 800, color: TONE_COLOR[current.tone] }}>{current.lord} hora</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--foreground)" }}>{current.good}</p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>until {fmt(current.endMs)}</p>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "1px" }}>
          {data.horas.map((h, i) => {
            const isNow = current && h.startMs === current.startMs;
            const past = nowMs >= h.endMs;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.35rem 0.4rem", borderRadius: 8, background: isNow ? `color-mix(in srgb, ${TONE_COLOR[h.tone]} 12%, transparent)` : "transparent", opacity: past && !isNow ? 0.45 : 1 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: TONE_COLOR[h.tone], flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", width: "5.5rem", flexShrink: 0 }}>{fmt(h.startMs)}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: isNow ? 700 : 500, color: isNow ? TONE_COLOR[h.tone] : "var(--foreground)" }}>{h.lord}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", textTransform: "capitalize" }}>{h.phase}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
