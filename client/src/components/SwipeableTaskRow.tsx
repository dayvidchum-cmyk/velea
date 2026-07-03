import { useRef, useState } from "react";
import { CheckCircle2, Pin, Trash2 } from "lucide-react";

interface SwipeableTaskRowProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;   // complete / uncomplete
  onSwipeRight: () => void;  // pin/unpin, or delete (see rightMode)
  isCompleted: boolean;
  isPinned: boolean;
  modeColor?: string;
  /** What the right-swipe does, visually: "pin" (default) or "delete" (red + trash). */
  rightMode?: "pin" | "delete";
  /** When true, swipe gestures are disabled so subtask controls work freely */
  isExpanded?: boolean;
}

const THRESHOLD = 72; // px to trigger action
const MAX_REVEAL = 80; // max px the row slides

export default function SwipeableTaskRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  isCompleted,
  isPinned,
  modeColor = "var(--foreground)",
  rightMode = "pin",
  isExpanded = false,
}: SwipeableTaskRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [triggered, setTriggered] = useState<"left" | "right" | null>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const isScrolling = useRef<boolean | null>(null); // null = undecided

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpanded) return; // subtask controls take priority
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
    isScrolling.current = null;
    setTriggered(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;

    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Decide once: is this a horizontal swipe or a vertical scroll?
    if (isScrolling.current === null) {
      if (Math.abs(dy) > Math.abs(dx) + 4) {
        isScrolling.current = true;
        return;
      }
      if (Math.abs(dx) > 6) {
        isScrolling.current = false;
      } else {
        return; // not yet decided
      }
    }

    if (isScrolling.current) return;

    // Horizontal swipe — prevent page scroll
    e.preventDefault();
    isDragging.current = true;

    const clamped = clamp(dx, -MAX_REVEAL, MAX_REVEAL);
    setTranslateX(clamped);

    if (clamped <= -THRESHOLD) {
      setTriggered("left");
    } else if (clamped >= THRESHOLD) {
      setTriggered("right");
    } else {
      setTriggered(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) {
      setTranslateX(0);
      return;
    }

    if (triggered === "left") {
      onSwipeLeft();
    } else if (triggered === "right") {
      onSwipeRight();
    }

    // Snap back with a spring feel
    setTranslateX(0);
    setTriggered(null);
    isDragging.current = false;
    isScrolling.current = null;
  };

  const leftColor = isCompleted ? "var(--color-muted-foreground)" : "oklch(0.72 0.16 145)";
  const rightColor = rightMode === "delete" ? "oklch(0.62 0.22 25)" : (isPinned ? "var(--color-muted-foreground)" : modeColor);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left reveal: complete (swipe left) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 rounded-r-xl transition-opacity duration-150"
        style={{
          width: MAX_REVEAL,
          background: `color-mix(in oklch, ${leftColor} 20%, transparent)`,
          opacity: translateX < 0 ? Math.min(1, Math.abs(translateX) / THRESHOLD) : 0,
        }}
        aria-hidden
      >
        <CheckCircle2
          size={20}
          style={{
            color: leftColor,
            transform: triggered === "left" ? "scale(1.2)" : "scale(1)",
            transition: "transform 150ms ease-out",
          }}
        />
      </div>

      {/* Right reveal: pin (swipe right) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 rounded-l-xl transition-opacity duration-150"
        style={{
          width: MAX_REVEAL,
          background: `color-mix(in oklch, ${rightColor} 20%, transparent)`,
          opacity: translateX > 0 ? Math.min(1, translateX / THRESHOLD) : 0,
        }}
        aria-hidden
      >
        {rightMode === "delete" ? (
          <Trash2 size={18} style={{ color: rightColor, transform: triggered === "right" ? "scale(1.2)" : "scale(1)", transition: "transform 150ms ease-out" }} />
        ) : (
          <Pin size={18} style={{ color: rightColor, transform: triggered === "right" ? "scale(1.2)" : "scale(1)", transition: "transform 150ms ease-out" }} />
        )}
      </div>

      {/* Draggable row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? "none" : "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
