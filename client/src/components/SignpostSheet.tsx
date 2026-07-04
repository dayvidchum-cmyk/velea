import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MODE_OKLCH, MODE_SOLID, type TaskMode } from "../../../shared/types";

/**
 * SIGNPOST SHEET — the "Why this today?" destination behind the hero card.
 *
 * Answers "why is today shaped this way for ME" by stacking the three layers
 * the north-star names: the SKY now (universal) ⊗ YOUR CHART's filter on it
 * (tārabala / chandrabala / dasha) ⊗ YOU (the check-in) → "…so today reads
 * {Mode} for you." The sky/chart layers are deterministic chart math from the
 * server; the check-in layer is the user's own state.
 */

interface SignpostSheetProps {
  open: boolean;
  onClose: () => void;
  /** Day mode — drives the accent color. */
  mode?: TaskMode;
}

// ── Check-in interpretation (mirrors CheckInCard) ────────────────────────────
const DIMENSION_LABELS: Record<string, string> = {
  physicalEnergy: "Physical energy",
  mentalClarity: "Mental clarity",
  emotionalStability: "Emotional stability",
  creativeFlow: "Creative flow",
  motivation: "Motivation",
};
function interpretCheckIn(row: Record<string, number>): { assets: string[]; constraints: string[] } {
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
  const assets = Object.entries(scores).filter(([, v]) => v === max && v >= 4).map(([k]) => DIMENSION_LABELS[k]);
  const constraints = Object.entries(scores).filter(([, v]) => v === min && v <= 2).map(([k]) => DIMENSION_LABELS[k]);
  return { assets, constraints };
}

const QUALITY_DOT: Record<string, string> = {
  clean: "#3fb27f",
  mixed: "#c9a24b",
  rough: "#c96a4b",
};

export default function SignpostSheet({ open, onClose, mode }: SignpostSheetProps) {
  const accent = mode ? MODE_OKLCH[mode] : "var(--color-foreground)";
  const accentSolid = mode ? MODE_SOLID[mode] : MODE_SOLID.Build;

  const { data: why, isLoading } = trpc.panchang.whyToday.useQuery({}, { enabled: open });
  const { data: checkIn } = trpc.checkIn.today.useQuery(undefined, { enabled: open });

  if (!open) return null;

  const state = checkIn ? interpretCheckIn(checkIn as unknown as Record<string, number>) : null;

  const LayerLabel = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0"
        style={{ width: 18, height: 18, background: `color-mix(in oklch, ${accent} 22%, transparent)`, color: accentSolid }}
      >
        {n}
      </span>
      <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: "var(--color-muted-foreground)" }}>
        {children}
      </span>
    </div>
  );

  const Chip = ({ children, tone }: { children: React.ReactNode; tone?: "good" | "bad" | "neutral" }) => {
    const c = tone === "good" ? "#3fb27f" : tone === "bad" ? "#c96a4b" : "var(--color-muted-foreground)";
    return (
      <span
        className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: `color-mix(in oklch, ${c} 14%, transparent)`,
          color: c,
          border: `1px solid color-mix(in oklch, ${c} 28%, transparent)`,
          letterSpacing: "0.01em",
        }}
      >
        {children}
      </span>
    );
  };

  const Fuse = () => (
    <div className="flex items-center justify-center" style={{ margin: "2px 0" }}>
      <span style={{ color: "var(--color-muted-foreground)", opacity: 0.6, fontSize: "1.1rem", lineHeight: 1 }}>⊗</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          bottom: "72px",
          background: "var(--color-card)",
          border: "1px solid oklch(0 0 0 / 0.12)",
          borderBottom: "none",
          maxWidth: "480px",
          margin: "0 auto",
          maxHeight: "600px",
          animation: "slideUp 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="text-base tracking-wide" style={{ color: "var(--color-foreground)", fontWeight: 300, letterSpacing: "0.04em" }}>
              Why this today?
            </h2>
            <p className="text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>
              The three layers that shaped your day
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-muted-foreground)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading || !why ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--color-border)", opacity: 0.4 }} />
              ))}
            </div>
          ) : (
            <>
              {/* LAYER 1 — THE SKY */}
              <div
                className="rounded-xl p-3.5"
                style={{ background: "var(--color-input)", border: "1px solid var(--color-border)" }}
              >
                <LayerLabel n={1}>The sky now · everyone</LayerLabel>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span
                    className="inline-block rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: QUALITY_DOT[why.sky.quality] }}
                  />
                  <Chip>{why.sky.nakshatra}</Chip>
                  <Chip>{why.sky.tithi}</Chip>
                  <Chip>☽ {why.sky.moonSign}</Chip>
                </div>
                <p className="text-[13px]" style={{ color: "var(--color-foreground)", lineHeight: 1.5, opacity: 0.85 }}>
                  {why.sky.line}
                </p>
              </div>

              <Fuse />

              {/* LAYER 2 — YOUR CHART */}
              <div
                className="rounded-xl p-3.5"
                style={{ background: "var(--color-input)", border: "1px solid var(--color-border)" }}
              >
                <LayerLabel n={2}>Your chart's filter · yours alone</LayerLabel>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Chip>Moon in your {why.chart.house}th house</Chip>
                  <Chip tone={why.chart.tara.favorable ? "good" : why.chart.tara.quality === "bad" ? "bad" : "neutral"}>
                    {why.chart.tara.name} tāra
                  </Chip>
                  <Chip tone={why.chart.chandra.favorable ? "good" : why.chart.chandra.quality === "bad" ? "bad" : "neutral"}>
                    Moon {why.chart.chandra.houseLabel} from natal
                  </Chip>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Chip>Year lord: {why.chart.timeLord.lord} ({why.chart.timeLord.houseLabel} yr)</Chip>
                  {why.chart.dasha && <Chip>{why.chart.dasha.maha} → {why.chart.dasha.antar} dasha</Chip>}
                </div>
                {(why.chart.support.length > 0 || why.chart.affliction.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {why.chart.support.map((s) => <Chip key={s} tone="good">+ {s}</Chip>)}
                    {why.chart.affliction.map((s) => <Chip key={s} tone="bad">− {s}</Chip>)}
                  </div>
                )}
              </div>

              <Fuse />

              {/* LAYER 3 — YOU */}
              <div
                className="rounded-xl p-3.5"
                style={{ background: "var(--color-input)", border: "1px solid var(--color-border)" }}
              >
                <LayerLabel n={3}>You, right now · your state</LayerLabel>
                {!checkIn ? (
                  <p className="text-[13px]" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                    No check-in yet today. Check in on the Today page to fold your own state into the read.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {state && state.assets.length === 0 && state.constraints.length === 0 && (
                      <span className="text-[13px]" style={{ color: "var(--color-muted-foreground)" }}>Balanced across the board today.</span>
                    )}
                    {state?.assets.map((a) => <Chip key={a} tone="good">{a} strong</Chip>)}
                    {state?.constraints.map((c) => <Chip key={c} tone="bad">{c} low</Chip>)}
                  </div>
                )}
              </div>

              {/* THE FUSION — the verdict */}
              <div
                className="rounded-xl p-4 mt-4 text-center"
                style={{
                  background: `color-mix(in oklch, ${accent} 14%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${accent} 30%, transparent)`,
                }}
              >
                <p className="text-[11px] font-bold uppercase mb-1" style={{ letterSpacing: "0.12em", color: "var(--color-muted-foreground)" }}>
                  So today reads
                </p>
                <p style={{ fontFamily: "'Playfair Display', Georgia, ui-serif, serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1, color: accentSolid }}>
                  {why.mode}
                </p>
                {why.qualifier && (
                  <p className="text-[12px] mt-1.5" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.02em" }}>
                    {why.qualifier}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
