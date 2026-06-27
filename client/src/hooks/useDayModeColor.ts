import { trpc } from "@/lib/trpc";
import { PANCHANG_TO_TASK_MODE, MODE_SOLID, type TaskMode } from "../../../shared/types";

/**
 * Returns the solid hex color for today's day mode.
 * Falls back to amber-gold (#D4AF37 / Build) while loading.
 * Use this for all-caps section labels so they change color with the day.
 */
export function useDayModeColor(): string {
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode
    ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  return taskMode ? MODE_SOLID[taskMode] : MODE_SOLID.Build;
}

/**
 * Returns today's immersive hero gradient (same one the Today-page hero card uses).
 * Falls back to the Build gradient while loading.
 */
export function useDayModeGradient(): string {
  const { data: todayPanchang } = trpc.panchang.today.useQuery();
  const todayMode = todayPanchang?.mode;
  const taskMode: TaskMode | undefined = todayMode
    ? PANCHANG_TO_TASK_MODE[todayMode as keyof typeof PANCHANG_TO_TASK_MODE]
    : undefined;
  const key = (taskMode ?? "Build").toLowerCase();
  return `var(--kala-${key}-gradient)`;
}
