import VeleaMark from "./VeleaMark";

/**
 * VELEA'S SPINNING BEACH BALL (David 2026-07-16): the brand arc sweeping like a slow
 * clock-hand in the day's accent — time turning while the engine reads. Use everywhere
 * anything thinks; pass the surface's own whisper as the label.
 */
export default function VeleaLoader({ size = 30, label }: { size?: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 9, width: "100%", padding: "0.6rem 0" }}>
      <span className="velea-loader" style={{ display: "inline-flex", lineHeight: 0 }}>
        <VeleaMark size={size} color="var(--day-accent)" />
      </span>
      {label && (
        <span style={{ fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-muted-foreground)", textAlign: "center" }}>
          {label}
        </span>
      )}
    </span>
  );
}
