import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  dimensionKey: string;
}) {
  const [showDefinitions, setShowDefinitions] = useState(false);
  const selectedDefinition = value ? SCORE_DEFINITIONS[dimensionKey]?.[value] : null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowDefinitions(!showDefinitions)}
        className="text-left transition-opacity hover:opacity-70"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <p
          className="text-xs tracking-wide uppercase"
          style={{
            color: "var(--color-muted-foreground)",
            letterSpacing: "0.04em",
            fontWeight: 300,
          }}
        >
          {label}
        </p>
      </button>
      {showDefinitions && (
        <div
          className="text-xs space-y-1 p-2 rounded-lg mb-2"
          style={{
            background: "var(--input)",
            color: "var(--color-muted-foreground)",
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex gap-2">
              <span style={{ fontWeight: 600, minWidth: "12px" }}>{n}</span>
              <span>{SCORE_DEFINITIONS[dimensionKey]?.[n]}</span>
            </div>
          ))}
        </div>
      )}
      {selectedDefinition && (
        <p
          className="text-xs italic"
          style={{
            color: "var(--color-muted-foreground)",
          }}
        >
          Selected: {value} — {selectedDefinition}
        </p>
      )}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95"
              style={{
                background: selected
                  ? "var(--border)"
                  : "var(--border)",
                color: selected
                  ? "var(--foreground)"
                  : "var(--color-foreground)",
                border: selected
                  ? "1px solid var(--border)"
                  : "1px solid var(--border)",
              }}
              aria-label={`${label} ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface CheckInSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CheckInSheet({ open, onClose, onSaved }: CheckInSheetProps) {

  const utils = trpc.useUtils();

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
      // Reset for next time
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

  const allFilled = DIMENSIONS.every((d) => scores[d.key] !== null);

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
        className="rounded-t-2xl pb-10"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle
            className="text-left text-base tracking-wide uppercase"
            style={{
              color: "var(--color-foreground)",
              letterSpacing: "0.04em",
              fontWeight: 300,
            }}
          >
            Current State
          </SheetTitle>
          <p
            className="text-xs text-left"
            style={{
              color: "var(--color-muted-foreground)",
            }}
          >
            Rate each dimension from 1 (very low) to 5 (very high).
          </p>
        </SheetHeader>

        <div className="space-y-5">
          {DIMENSIONS.map((d) => (
            <ScoreRow
              key={d.key}
              label={d.label}
              value={scores[d.key]}
              onChange={(v) => setScores((prev) => ({ ...prev, [d.key]: v }))}

              dimensionKey={d.key}
            />
          ))}
        </div>

        <div className="mt-8">
          <Button
            onClick={handleSubmit}
            disabled={!allFilled || createMutation.isPending}
            className="w-full h-11 text-sm font-semibold tracking-wide uppercase"
            style={{
              background: allFilled ? "var(--border)" : undefined,
              color: allFilled ? "var(--foreground)" : undefined,
              letterSpacing: "0.04em",
            }}
          >
            {createMutation.isPending ? "Saving…" : "Save Current State"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
