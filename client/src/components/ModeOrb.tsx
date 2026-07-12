import type { TaskMode } from "../../../shared/types";

const ORB_CLASSES: Record<TaskMode, string> = {
  Restraint: "orb-restraint",
  Build: "orb-build",
  Selective: "orb-selective",
  Action: "orb-action",
};

const MODE_LABELS: Record<TaskMode, string> = {
  Restraint: "Restraint",
  Build: "Build",
  Selective: "Selective",
  Action: "Action",
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
  const orbCls = ORB_CLASSES[mode];
  const sizeMap = { sm: "w-10 h-10 text-xs", md: "w-14 h-14 text-sm", lg: "w-18 h-18 text-base" };
  const textSize = size === "sm" ? "text-[12px]" : size === "md" ? "text-[12px]" : "text-xs";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 group transition-all duration-200 ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`${orbCls} ${sizeMap[size]} rounded-full flex items-center justify-center font-bold transition-all duration-200 relative ${
          active ? "scale-110" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
        }`}
        style={{
          color: "oklch(1 0 0)",
        }}
      >
        <span className={size === "sm" ? "text-xs font-bold" : "text-sm font-bold"}>
          {!showCount ? (
            <span style={{ fontSize: size === "sm" ? "0.65rem" : "0.75rem", opacity: 0.85 }}>●</span>
          ) : count === 0 ? "+" : count}
        </span>
        {/* (Pulsing "ping" ring on the active orb removed — David turned off the blink.) */}
      </div>
      <span
        className={`${textSize} font-semibold tracking-wide uppercase`}
        style={{
          color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
          letterSpacing: "0.04em",
        }}
      >
        {MODE_LABELS[mode]}
      </span>
    </button>
  );
}
