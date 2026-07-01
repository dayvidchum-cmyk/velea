import { Loader2 } from "lucide-react";

/**
 * Loading signal shown while the narrative engine is generating prose (the LLM read
 * can take a few seconds uncached). Spinner + a quiet label. `color` adapts it to
 * light-on-gradient (hero) or dark-on-card contexts.
 */
export default function ProseLoading({
  color = "rgba(255,255,255,0.92)",
  label = "Reading your chart…",
}: { color?: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0", color }}>
      <Loader2 size={18} className="animate-spin" style={{ color }} />
      <span style={{ fontSize: "0.85rem", fontStyle: "italic", opacity: 0.85 }}>{label}</span>
    </div>
  );
}
