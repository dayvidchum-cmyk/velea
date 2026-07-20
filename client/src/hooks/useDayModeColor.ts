import { trpc } from "@/lib/trpc";
import { PANCHANG_TO_TASK_MODE, MODE_SOLID, type TaskMode } from "../../../shared/types";

/**
 * Returns the solid hex color for today's day mode.
 * Falls back to amber-gold (#D4AF37 / Build) while loading.
 * Use this for all-caps section labels so they change color with the day.
 */
export function useDayModeColor(): string {
  // THE DAY ACCENT (David 2026-07-15): every accent follows today's coin color — one
  // token, set from the same character the calendar runs on (AppHeader.setDayAccent).
  // Falls back to brand gold via the CSS var default; Full Spectrum removes the var.
  return "var(--day-accent)";
}

/**
 * The day accent as READABLE TEXT ink.
 *
 * useDayModeColor() returns the raw accent, which is correct for fills, tints, borders and marks.
 * It is NOT correct for text: measured against both card grounds, every day-mode accent misses the
 * 4.5:1 floor on one side or the other (see shared/accent-ink.ts). This returns the same hue moved
 * in lightness only until it clears the bar — identical when the accent already passes.
 *
 * Rule of thumb: `color:` → useDayModeInk(); `background`, `border`, `color-mix` → useDayModeColor().
 */
export function useDayModeInk(): string {
  return "var(--day-accent-ink)";
}

/**
 * Returns today's immersive hero gradient (same one the Today-page hero card uses).
 * Falls back to the Build gradient while loading.
 */
export function useDayModeGradient(): string {
  // The day accent descending into its own shadow — one voice with the hero card.
  return "linear-gradient(160deg, var(--day-accent) 0%, color-mix(in srgb, var(--day-accent) 72%, #2E2318) 100%)";
}
