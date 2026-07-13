import { MODE_OKLCH, type TaskMode } from "../../../shared/types";

const MODE_LABELS: Record<TaskMode, string> = {
  Restraint: "Restraint",
  Build: "Build",
  Selective: "Selective",
  Action: "Action",
};

// Darken an oklch color by scaling its lightness — the filled (active) orb's number is a dark
// tonal version of its own mode color, matching the calendar's filled coins.
const darken = (c: string, f: number) => {
  const m = c.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? `oklch(${(parseFloat(m[1]) * f).toFixed(3)} ${m[2]} ${m[3]})` : c;
};

interface ModeOrbProps {
  mode: TaskMode;
  count: number;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showCount?: boolean;
}

export default function ModeOrb({ mode, count, active = false, size = "md", onClick, showCount = true }: ModeOrbProps) {
  const sizeMap = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-18 h-18" };
  const textSize = size === "sm" ? "text-[12px]" : size === "md" ? "text-[12px]" : "text-xs";
  const color = MODE_OKLCH[mode];

  // Calendar-coin model (David): the CURRENT day mode is a FILLED orb with a dark tonal number;
  // every other mode is an OUTLINE — a ring in its mode color with the number that same color.
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 group transition-all duration-200 ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
          active ? "scale-110 orb-pulse" : "group-hover:scale-105"
        }`}
        style={{
          background: active ? color : "transparent",
          border: `2px solid ${color}`,
          color: active ? darken(color, 0.5) : color,
          // The current day's orb breathes a soft glow in its own mode color (David: bring the
          // pulse back). --orb-glow feeds the orb-pulse keyframe; reduced-motion disables it.
          ...(active ? { ["--orb-glow" as any]: `color-mix(in srgb, ${color} 55%, transparent)` } : {}),
        }}
      >
        <span className={size === "sm" ? "text-xs font-bold" : "text-sm font-bold"}>
          {!showCount ? (
            <span style={{ fontSize: size === "sm" ? "0.65rem" : "0.75rem", opacity: 0.85 }}>●</span>
          ) : count === 0 ? "+" : count}
        </span>
      </div>
      <span
        className={`${textSize} font-semibold tracking-wide uppercase`}
        style={{
          // Active mode's NAME matches its orb color (David); others stay muted.
          color: active ? color : "var(--color-muted-foreground)",
          letterSpacing: "0.04em",
        }}
      >
        {MODE_LABELS[mode]}
      </span>
    </button>
  );
}
