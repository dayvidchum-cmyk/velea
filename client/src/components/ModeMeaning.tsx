import { useState } from "react";
import { ChevronDown, Check, Minus } from "lucide-react";
import type { TaskMode } from "@shared/types";
import { MODE_GUIDE } from "@/lib/modeGuide";

/**
 * In-hero "What does this mode mean?" disclosure for the Today page. Styled
 * white-on-gradient to sit inside the day-mode hero card. Explains the current
 * mode statically (essence + which tasks fit / hold off) to help task tagging.
 */
export default function ModeMeaning({ mode }: { mode: string }) {
  const [open, setOpen] = useState(false);
  const guide = MODE_GUIDE[mode as TaskMode];
  if (!guide) return null;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.98)", textDecoration: "underline",
          textUnderlineOffset: "3px", display: "flex", alignItems: "center", gap: "4px",
        }}
      >
        {open ? "HIDE" : `WHAT DOES ${mode.toUpperCase()} MEAN?`}
        <ChevronDown
          size={12}
          style={{ color: "rgba(255,255,255,0.98)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
        />
      </button>

      {open && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.55, color: "rgba(255,255,255,0.9)", marginBottom: "0.85rem" }}>
            {guide.essence}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                Best for
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {guide.bestFor.map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.92)" }}>
                    <Check size={13} style={{ color: "rgba(255,255,255,0.85)", flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                Ease off
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {guide.avoid.map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                    <Minus size={13} style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
