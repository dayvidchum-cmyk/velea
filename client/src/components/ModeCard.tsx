import { useDayModeColor } from "@/hooks/useDayModeColor";

interface ModeCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Optional right element in the header (e.g. chevron button) */
  headerRight?: React.ReactNode;
  /** If true, the header is a clickable button */
  onHeaderClick?: () => void;
  /** Extra content below the title in the header */
  headerSub?: React.ReactNode;
}

/**
 * A card with:
 * - Mode-colored full-opacity header strip + white text
 * - Very subtle mode-tinted body background (5% opacity)
 * - Mode-colored border
 *
 * Use on all secondary pages to replace plain white cards.
 */
export function ModeCard({
  title,
  children,
  className = "",
  headerRight,
  onHeaderClick,
  headerSub,
}: ModeCardProps) {
  const modeColor = useDayModeColor();

  const headerStyle: React.CSSProperties = {
    background: modeColor,
    padding: "0.65rem 1.25rem",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.5rem",
    cursor: onHeaderClick ? "pointer" : undefined,
    border: "none",
    width: "100%",
    textAlign: "left",
  };

  const titleEl = (
    <div style={{ flex: 1 }}>
      <span
        style={{
          color: "#ffffff",
          fontSize: "0.8rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      {headerSub && (
        <div style={{ marginTop: "0.2rem" }}>{headerSub}</div>
      )}
    </div>
  );

  return (
    <div
      className={className}
      style={{
        border: `1.5px solid ${modeColor}`,
        borderRadius: "0.75rem",
        overflow: "hidden",
        marginBottom: "1.25rem",
        background: `color-mix(in srgb, ${modeColor} 14%, var(--background))`,
      }}
    >
      {onHeaderClick ? (
        <button onClick={onHeaderClick} style={headerStyle}>
          {titleEl}
          {headerRight}
        </button>
      ) : (
        <div style={headerStyle}>
          {titleEl}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
