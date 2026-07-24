import { useState } from "react";
import { inkOf } from "@/lib/ink";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useDayModeColor, useDayModeInk, useDayModeGradient } from "@/hooks/useDayModeColor";

// ── Dimension config ────────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: "physicalEnergy", label: "Physical Energy" },
  { key: "mentalClarity", label: "Mental Clarity" },
  { key: "emotionalStability", label: "Emotional Stability" },
  { key: "creativeFlow", label: "Creative Flow" },
  { key: "motivation", label: "Motivation" },
] as const;

const SCORE_DEFINITIONS: Record<string, Record<number, string>> = {
  physicalEnergy: {
    1: "Exhausted — depleted, heavy, need rest",
    2: "Low — sluggish, moving slowly",
    3: "Moderate — steady, functional",
    4: "High — energized, capable",
    5: "Peak — vibrant, unstoppable",
  },
  mentalClarity: {
    1: "Foggy — scattered, can't focus",
    2: "Unclear — distracted, slow thinking",
    3: "Adequate — can concentrate",
    4: "Sharp — clear, quick thinking",
    5: "Crystal — laser-focused, brilliant",
  },
  emotionalStability: {
    1: "Overwhelmed — fragile, reactive",
    2: "Unsettled — anxious, irritable",
    3: "Balanced — steady, grounded",
    4: "Resilient — calm, centered",
    5: "Unshakeable — at peace, composed",
  },
  creativeFlow: {
    1: "Blocked — nothing flows, stuck",
    2: "Struggling — effort feels forced",
    3: "Present — ideas come naturally",
    4: "Flowing — ideas connect easily",
    5: "In flow — time disappears, magic happens",
  },
  motivation: {
    1: "Unmotivated — nothing appeals",
    2: "Low — hard to start",
    3: "Present — willing to engage",
    4: "Strong — eager to act",
    5: "Unstoppable — burning to move",
  },
};

type DimensionKey = (typeof DIMENSIONS)[number]["key"];
type Scores = Record<DimensionKey, number | null>;

// ── Score button row ────────────────────────────────────────────────────────

function ScoreRow({
  label,
  value,
  onChange,
  dimensionKey,
  modeColor,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  dimensionKey: string;
  modeColor: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Hovering a number previews its meaning; otherwise show the chosen one.
  const shownNumber = hovered ?? value;
  const shownDefinition = shownNumber ? SCORE_DEFINITIONS[dimensionKey]?.[shownNumber] : null;
  const shownText = shownDefinition ? (shownDefinition.split("—")[1]?.trim() ?? shownDefinition) : null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--color-card)",
        border: `1px solid ${value ? `color-mix(in srgb, ${modeColor} 35%, transparent)` : "var(--color-border)"}`,
      }}
    >
      <p
        className="text-xs uppercase mb-3"
        style={{ color: "var(--color-foreground)", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        {label}
      </p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
              style={{
                background: selected ? modeColor : "var(--color-secondary)",
                color: selected ? "#FDFDFD" : "var(--color-muted-foreground)",
                border: `1px solid ${selected ? modeColor : "var(--color-border)"}`,
                boxShadow: selected ? `0 2px 10px color-mix(in srgb, ${modeColor} 40%, transparent)` : "none",
              }}
              onMouseEnter={(e) => {
                setHovered(n);
                if (selected) return;
                e.currentTarget.style.background = `color-mix(in srgb, ${modeColor} 22%, var(--color-secondary))`;
                e.currentTarget.style.borderColor = modeColor;
                e.currentTarget.style.color = modeColor;
              }}
              onMouseLeave={(e) => {
                setHovered(null);
                if (selected) return;
                e.currentTarget.style.background = "var(--color-secondary)";
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-muted-foreground)";
              }}
              aria-label={`${label} ${n}: ${SCORE_DEFINITIONS[dimensionKey]?.[n] ?? ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Live explanation — reserves space so the layout doesn't jump */}
      <p className="text-xs mt-3 leading-snug" style={{ color: "var(--color-muted-foreground)", minHeight: "2.1em" }}>
        {shownText ? (
          <>
            <span style={{ color: inkOf(modeColor), fontWeight: 700 }}>{shownNumber}</span>
            {" — "}
            {shownText}
          </>
        ) : (
          " "
        )}
      </p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface CheckInSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/** "3h ago" / "yesterday" — a light relative stamp for the last check-in. */
function timeAgo(date: Date | string): string {
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default function CheckInSheet({ open, onClose, onSaved }: CheckInSheetProps) {
  const utils = trpc.useUtils();
  const modeColor = useDayModeColor();
  const modeColorInk = useDayModeInk();
  const heroGradient = useDayModeGradient();
  const { data: lastCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: open });

  const [scores, setScores] = useState<Scores>({
    physicalEnergy: null,
    mentalClarity: null,
    emotionalStability: null,
    creativeFlow: null,
    motivation: null,
  });

  const createMutation = trpc.checkIn.create.useMutation({
    onSuccess: () => {
      utils.checkIn.today.invalidate();
      // Re-rank the Today task list immediately so Current State influence is visible
      utils.tasks.rankedForToday.invalidate();
      toast.success("Current state saved", { duration: 1200 });
      onSaved?.();
      onClose();
      setScores({
        physicalEnergy: null,
        mentalClarity: null,
        emotionalStability: null,
        creativeFlow: null,
        motivation: null,
      });
    },
    onError: () => {
      toast.error("Could not save check-in");
    },
  });

  const filledCount = DIMENSIONS.filter((d) => scores[d.key] !== null).length;
  const allFilled = filledCount === DIMENSIONS.length;

  function handleSubmit() {
    if (!allFilled) return;
    createMutation.mutate({
      physicalEnergy: scores.physicalEnergy!,
      mentalClarity: scores.mentalClarity!,
      emotionalStability: scores.emotionalStability!,
      creativeFlow: scores.creativeFlow!,
      motivation: scores.motivation!,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0"
        style={{
          background: "var(--background)",
          border: "none",
          borderTop: `6px solid ${modeColor}`,
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4">
          <SheetHeader className="mb-5">
            <span
              className="text-left text-[0.75rem] font-bold uppercase"
              style={{ color: modeColorInk, letterSpacing: "0.16em" }}
            >
              Check-In
            </span>
            <SheetTitle
              className="text-left"
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "var(--color-foreground)",
                lineHeight: 1.1,
              }}
            >
              How are you right now?
            </SheetTitle>
            <p className="text-xs text-left mt-1" style={{ color: "var(--color-muted-foreground)" }}>
              Rate each from 1 (very low) to 5 (very high). This tunes which tasks surface today.
            </p>
            <p className="text-xs text-left mt-2 font-semibold" style={{ color: lastCheckIn ? "var(--color-muted-foreground)" : modeColor }}>
              {lastCheckIn ? `Last checked in ${timeAgo(lastCheckIn.recordedAt as unknown as string)}` : "No check-in yet today"}
            </p>
          </SheetHeader>

          <div className="space-y-3">
            {DIMENSIONS.map((d) => (
              <ScoreRow
                key={d.key}
                label={d.label}
                value={scores[d.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [d.key]: v }))}
                dimensionKey={d.key}
                modeColor={modeColor}
              />
            ))}
          </div>
        </div>

        {/* Fixed footer — anchored to the bottom, carrying the day's ombre gradient */}
        <div
          className="flex-shrink-0 px-4 pt-4 pb-8"
          style={{ background: heroGradient }}
        >
          <button
            onClick={handleSubmit}
            disabled={!allFilled || createMutation.isPending}
            className="w-full h-12 rounded-2xl text-sm font-bold uppercase transition-all active:scale-[0.99] disabled:cursor-not-allowed"
            style={{
              // Lines, not a white slab (David: "glaring white button EWWWWW") —
              // the outline-pill grammar, at home on the gradient ground.
              background: "transparent",
              color: allFilled ? "#FDF9EE" : "rgba(255,255,255,0.75)",
              letterSpacing: "0.08em",
              border: allFilled ? "1.5px solid rgba(255,255,255,0.85)" : "1px solid rgba(255,255,255,0.3)",
              opacity: createMutation.isPending ? 0.7 : 1,
            }}
          >
            {createMutation.isPending
              ? "Saving…"
              : allFilled
              ? "Save Current State"
              : `${filledCount} / ${DIMENSIONS.length} rated`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
