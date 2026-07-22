import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

interface SecondaryPageHeaderProps {
  title: string;
  /** Optional right-side action element (e.g. a Save or New button) */
  rightAction?: React.ReactNode;
  /** Override back navigation path (defaults to browser back) */
  backPath?: string;
}

/**
 * Lightweight header for secondary/detail pages.
 * Shows: back arrow (left) | display serif title (center) | optional action (right)
 * Does NOT show greeting, date, location, or profile chip.
 */
export default function SecondaryPageHeader({
  title,
  rightAction,
  backPath,
}: SecondaryPageHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-3 mb-6"
      style={{ minHeight: "2.5rem" }}
    >
      {/* Back arrow */}
      <button
        onClick={handleBack}
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 active:scale-95"
        style={{
          background: "var(--color-secondary)",
          color: "var(--color-foreground)",
          border: "1px solid var(--color-border)",
        }}
        aria-label="Go back"
      >
        <ArrowLeft size={16} strokeWidth={2} />
      </button>

      {/* Page title — display serif, ~32px, foreground color, left-aligned */}
      <h1
        className="flex-1 text-left"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          lineHeight: 1.2,
          color: "var(--color-foreground)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>

      {/* Right action slot */}
      <div className="flex-shrink-0 flex items-center justify-end">
        {rightAction ?? null}
      </div>
    </div>
  );
}
