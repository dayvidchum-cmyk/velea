import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import VeleaMark from "@/components/VeleaMark";

/**
 * A quiet Today-page line — shown ONLY when a slow planet is actively crossing your
 * MC/IC (a live Meridian chapter). Points to the full read on the Chart page. Renders
 * nothing the rest of the time, so it stays a rare, meaningful signal.
 */
export default function MeridianWhisper() {
  const [, navigate] = useLocation();
  const { data } = trpc.meridian.current.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  if (!data) return null;
  const current = (data.chapters ?? []).find((c) => c.status === "current");
  if (!current) return null;

  const realm = current.poleLabel === "outer voice" ? "public calling & dharma" : "roots & inner ground";
  return (
    <button
      onClick={() => navigate("/profection")}
      style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.85rem", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--brand-gold) 32%, var(--color-border))", background: "color-mix(in srgb, var(--brand-gold) 7%, var(--color-card))" }}
    >
      <VeleaMark size={16} color="var(--brand-gold)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.45 }}>
        <strong>{current.planet}</strong> is on your <strong>{current.poleLabel}</strong> — a chapter in your {realm} is live.
      </span>
      <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--brand-gold)", whiteSpace: "nowrap", flexShrink: 0 }}>read ›</span>
    </button>
  );
}
