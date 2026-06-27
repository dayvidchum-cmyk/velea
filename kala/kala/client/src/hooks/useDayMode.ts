import { trpc } from "@/lib/trpc";
import { PANCHANG_TO_TASK_MODE, MODE_SOLID, MODE_OKLCH, MODE_RGBA, MODE_TINT, type TaskMode } from "../../../shared/types";

export interface DayModeInfo {
  mode: TaskMode;
  solid: string;   // hex solid color
  oklch: string;   // oklch color
  rgba: string;    // "r, g, b" string for rgba()
  tint: string;    // transparent tint
}

const FALLBACK: DayModeInfo = {
  mode: "Build",
  solid: MODE_SOLID.Build,
  oklch: MODE_OKLCH.Build,
  rgba: MODE_RGBA.Build,
  tint: MODE_TINT.Build,
};

/**
 * Returns full mode info for today's day mode.
 * Falls back to Build (gold) while loading.
 */
export function useDayMode(): DayModeInfo {
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode
    ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  if (!taskMode) return FALLBACK;
  return {
    mode: taskMode,
    solid: MODE_SOLID[taskMode],
    oklch: MODE_OKLCH[taskMode],
    rgba: MODE_RGBA[taskMode],
    tint: MODE_TINT[taskMode],
  };
}
