import { trpc } from "@/lib/trpc";

/**
 * Master Mode — Pancha Pakshi hourly timing (your bird's golden/red windows). PRIVATE:
 * the endpoint returns null for anyone off the allowlist, so this renders nothing for
 * them. Single-track (bird's main activity per yama); the two-bird overlay comes later.
 */

const CAT_COLOR: Record<string, string> = {
  Succeed: "#2E8B57", Energize: "#5BA35B", Action: "#3C8DAE", Relax: "#C0862E", Caution: "#C0553E",
};
const CAT_NOTE: Record<string, string> = {
  Succeed: "Most auspicious — act.",
  Energize: "Second-strongest — push.",
  Action: "Effort & work — be on the move.",
  Relax: "Rest, self-care, slow down.",
  Caution: "Silence & letting go — not for action.",
};

export default function MasterModeCard() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data } = trpc.masterMode.today.useQuery({ date: dateStr }, { staleTime: 1000 * 60 * 10 });
  if (!data) return null;

  const nowMs = Date.now();
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const current = data.periods.find((p) => nowMs >= p.startMs && nowMs < p.endMs);

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: 0 }}>
          Master Mode · your bird: {data.bird}
        </p>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-gold)", opacity: 0.7 }}>private</span>
      </div>

      {current && (
        <div style={{ marginTop: "0.85rem", borderRadius: 12, padding: "0.85rem 1rem", background: `color-mix(in srgb, ${CAT_COLOR[current.category]} 16%, var(--color-card))`, border: `1px solid color-mix(in srgb, ${CAT_COLOR[current.category]} 45%, transparent)` }}>
          <p style={{ margin: 0, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>Now</p>
          <p style={{ margin: "0.15rem 0 0", fontSize: "1.15rem", fontWeight: 800, color: CAT_COLOR[current.category] }}>{current.category}</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--foreground)" }}>{CAT_NOTE[current.category]}</p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>until {fmt(current.endMs)}</p>
        </div>
      )}

      <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "1px" }}>
        {data.periods.map((p, i) => {
          const isNow = current && p.startMs === current.startMs;
          const past = nowMs >= p.endMs;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.35rem 0.4rem", borderRadius: 8, background: isNow ? `color-mix(in srgb, ${CAT_COLOR[p.category]} 12%, transparent)` : "transparent", opacity: past && !isNow ? 0.45 : 1 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: CAT_COLOR[p.category], flexShrink: 0 }} />
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", width: "5.5rem", flexShrink: 0 }}>{fmt(p.startMs)}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: isNow ? 700 : 500, color: isNow ? CAT_COLOR[p.category] : "var(--foreground)" }}>{p.category}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
