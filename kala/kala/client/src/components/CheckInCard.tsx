import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import CheckInSheet from "@/components/CheckInSheet";
import { RefreshCw } from "lucide-react";
import { useDayModeColor } from "@/hooks/useDayModeColor";

// ── Interpretation logic ────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  physicalEnergy: "Physical Energy",
  mentalClarity: "Mental Clarity",
  emotionalStability: "Emotional Stability",
  creativeFlow: "Creative Flow",
  motivation: "Motivation",
};

type CheckInRow = {
  physicalEnergy: number;
  mentalClarity: number;
  emotionalStability: number;
  creativeFlow: number;
  motivation: number;
  recordedAt: Date;
};

function interpret(row: CheckInRow): { assets: string[]; constraints: string[] } {
  const scores: Record<string, number> = {
    physicalEnergy: row.physicalEnergy,
    mentalClarity: row.mentalClarity,
    emotionalStability: row.emotionalStability,
    creativeFlow: row.creativeFlow,
    motivation: row.motivation,
  };

  const values = Object.values(scores);
  const max = Math.max(...values);
  const min = Math.min(...values);

  // Assets: scores equal to the max AND >= 4
  const assets = Object.entries(scores)
    .filter(([, v]) => v === max && v >= 4)
    .map(([k]) => DIMENSION_LABELS[k]);

  // Constraints: scores equal to the min AND <= 2
  const constraints = Object.entries(scores)
    .filter(([, v]) => v === min && v <= 2)
    .map(([k]) => DIMENSION_LABELS[k]);

  return { assets, constraints };
}

// ── Main component ──────────────────────────────────────────────────────────

export default function CheckInCard() {
  const { isAuthenticated } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const dayLabelColor = useDayModeColor();

  const { data: checkIn, isLoading } = trpc.checkIn.today.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  const cardBg = "var(--card)";
  const borderColor = "var(--border)";

  // ── No check-in yet ──────────────────────────────────────────────────────
  if (!isLoading && !checkIn) {
    return (
      <>
        <div
          className="p-4 rounded-lg relative z-10"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <p
            className="text-sm font-bold uppercase mb-2"
            style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}
          >
            Current State
          </p>
          <p
            className="text-base mb-3 leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            No check-in recorded today.
          </p>
          <button
            onClick={() => setSheetOpen(true)}
            className="text-xs font-bold uppercase transition-opacity hover:opacity-70"
            style={{ color: "var(--foreground)", letterSpacing: "0.04em" }}
          >
            Record Check-In
          </button>
        </div>
        <CheckInSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  if (isLoading || !checkIn) return null;

  const { assets, constraints } = interpret(checkIn);

  const recordedLabel = new Date(checkIn.recordedAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const dimKeys: (keyof typeof DIMENSION_LABELS)[] = [
    "physicalEnergy",
    "mentalClarity",
    "emotionalStability",
    "creativeFlow",
    "motivation",
  ];

  return (
    <>
      <div
        className="p-4 rounded-lg relative z-10"
        style={{ background: cardBg, border: `1px solid ${borderColor}` }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-sm font-bold uppercase"
            style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}
          >
            Current State
          </p>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1 text-xs font-bold uppercase transition-opacity hover:opacity-70"
            style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.04em" }}
            title="Update check-in"
          >
            <RefreshCw size={10} />
            Update
          </button>
        </div>

        {/* Recorded timestamp */}
        <p
          className="text-xs mb-3 uppercase"
          style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}
        >
          <span className="font-bold">Recorded:</span> {recordedLabel}
        </p>

        {/* Score grid */}
        <div className="space-y-1.5 mb-4">
          {dimKeys.map((key) => {
            const score = checkIn[key as keyof CheckInRow] as number;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-base" style={{ color: "var(--color-foreground)" }}>
                  {DIMENSION_LABELS[key]}
                </span>
                <span
                  className="text-base font-semibold tabular-nums"
                  style={{
                    color:
                      score >= 4
                        ? "var(--foreground)"
                        : score <= 2
                        ? "var(--muted-foreground)"
                        : "var(--muted-foreground)",
                    minWidth: "1.5rem",
                    textAlign: "right",
                  }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Interpretation */}
        {(assets.length > 0 || constraints.length > 0) && (
          <div
            className="pt-3 space-y-2"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            {assets.length > 0 && (
              <div>
                <p
                  className="text-sm font-bold uppercase mb-1"
                  style={{ color: dayLabelColor, letterSpacing: "0.04em" }}
                >
                  Today's Assets
                </p>
                <ul className="space-y-0.5">
                  {assets.map((a) => (
                    <li
                      key={a}
                      className="text-base"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {constraints.length > 0 && (
              <div>
                <p
                  className="text-sm font-bold uppercase mb-1"
                  style={{ color: dayLabelColor, letterSpacing: "0.04em" }}
                >
                  Today's Constraint
                </p>
                <ul className="space-y-0.5">
                  {constraints.map((c) => (
                    <li
                      key={c}
                      className="text-base"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      • {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <CheckInSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
