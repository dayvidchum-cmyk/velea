export type TaskMode = "Restraint" | "Build" | "Selective" | "Action";
export type TaskPriority = "High" | "Medium" | "Low";
export type PanchangMode = "ACTION" | "BUILD" | "RESTRAINT" | "SELECTIVE ACTION";

export const TASK_MODES: TaskMode[] = ["Restraint", "Build", "Selective", "Action"];
export const TASK_PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];

export const MODE_DISPLAY: Record<TaskMode, string> = {
  Restraint: "Restraint",
  Build: "Build",
  Selective: "Selective",
  Action: "Action",
};

export const MODE_COLOR_CLASS: Record<TaskMode, string> = {
  Restraint: "text-mode-restraint",
  Build: "text-mode-build",
  Selective: "text-mode-selective",
  Action: "text-mode-action",
};

export const MODE_BG_CLASS: Record<TaskMode, string> = {
  Restraint: "bg-mode-restraint/20",
  Build: "bg-mode-build/20",
  Selective: "bg-mode-selective/20",
  Action: "bg-mode-action/20",
};

export const MODE_BORDER_CLASS: Record<TaskMode, string> = {
  Restraint: "border-mode-restraint/40",
  Build: "border-mode-build/40",
  Selective: "border-mode-selective/40",
  Action: "border-mode-action/40",
};

export const MODE_ORB_CLASS: Record<TaskMode, string> = {
  Restraint: "orb-restraint",
  Build: "orb-build",
  Selective: "orb-selective",
  Action: "orb-action",
};

export const MODE_TAG_CLASS: Record<TaskMode, string> = {
  Restraint: "tag-restraint",
  Build: "tag-build",
  Selective: "tag-selective",
  Action: "tag-action",
};

export const PANCHANG_TO_TASK_MODE: Record<string, TaskMode> = {
  ACTION: "Action",
  BUILD: "Build",
  RESTRAINT: "Restraint",
  "SELECTIVE ACTION": "Selective",
  // Direct mode names (returned by interpreter)
  Action: "Action",
  Build: "Build",
  Restraint: "Restraint",
  Selective: "Selective",
  Flex: "Build",
  // Legacy names
  Activate: "Action",
  ACTIVATE: "Action",
};

export const TASK_TO_PANCHANG_MODE: Record<TaskMode, PanchangMode> = {
  Action: "ACTION",
  Build: "BUILD",
  Restraint: "RESTRAINT",
  Selective: "SELECTIVE ACTION",
};

/** Priority display: High = !!!, Medium = !!, Low = ! */
export const PRIORITY_EXCLAIM: Record<TaskPriority, string> = {
  High: "!!!",
  Medium: "!!",
  Low: "!",
};

/** Mode solid oklch color values for inline styles — canonical tokens (match CSS vars) */
export const MODE_OKLCH: Record<TaskMode, string> = {
  Restraint: "oklch(0.68 0.09 355)",   // softened mulberry (hue 355) — moved off red (hue ~10) so it stops clashing with the fire-engine caution red on the calendar (David 2026-07-13)
  Build: "oklch(0.767 0.139 91.1)",
  Selective: "oklch(0.68 0.08 225)",  // softened dusty blue — was 0.50/0.12, buzzed against the olive tint
  Action: "oklch(0.72 0.10 140)",  // #a3cd8f soft sage
};

/** Mode tinted background — transparent tint that works on any bg (light or dark) */
export const MODE_TINT: Record<TaskMode, string> = {
  Restraint: "oklch(0.54 0.14 355 / 0.12)",
  Build: "oklch(0.767 0.139 91.1 / 0.12)",
  Selective: "oklch(0.50 0.12 200 / 0.12)",
  Action: "oklch(0.72 0.10 140 / 0.12)",
};

/** Mode rgba equivalents for use in inline styles (derived from canonical oklch tokens) */
export const MODE_RGBA: Record<TaskMode, string> = {
  Restraint: "154, 78, 110",  // Mulberry #9A4E6E
  Build: "212, 175, 55",      // Gold #D4AF37
  Selective: "53, 126, 133",  // Teal #357E85
  Action: "163, 205, 143",    // Soft sage #a3cd8f
};

/**
 * Mode card background — primary color at 70% opacity (solid hex for colored task cards).
 * Build: #D4AF37, Action: #4B8451, Selective: #357E85, Restraint: #9A4E6E
 */
export const MODE_CARD_BG: Record<TaskMode, string> = {
  Build: "rgba(212, 175, 55, 0.70)",
  Action: "rgba(163, 205, 143, 0.70)",
  Selective: "rgba(53, 126, 133, 0.70)",
  Restraint: "rgba(154, 78, 110, 0.70)",
};

/** Mode solid hex — fully opaque primary color for borders, strips, and accents */
export const MODE_SOLID: Record<TaskMode, string> = {
  Build: "#D4AF37",
  Action: "#318a55",   // true green, matches the hero/dot family (was yellow-sage #a3cd8f)
  Selective: "#178F9E", // saturated teal — the old #357E85 read gray (low contrast on nav hover)
  Restraint: "#9A4E6E",
};

/** Mode card gradient — deeper variant of each mode family, dark enough to carry
 * white text. Matches the hero gradients' family (defined in index.css). */
export const MODE_CARD_GRADIENT: Record<TaskMode, string> = {
  Build: "var(--velea-build-card-gradient)",
  Action: "var(--velea-action-card-gradient)",
  Selective: "var(--velea-selective-card-gradient)",
  Restraint: "var(--velea-restraint-card-gradient)",
};

/** Mode dark hex — darkest stop of each mode gradient, for readable text on gradient backgrounds */
export const MODE_DARK: Record<TaskMode, string> = {
  Build: "#BC886F",      // --velea-build-shadow (ochre-rose)
  Action: "#5a8f4a",     // --velea-action-shadow (medium sage-green)
  Selective: "#123F46",  // --velea-selective-shadow (deep teal — was slate-indigo, read blue)
  Restraint: "#4A1A2E",  // --velea-restraint-shadow (deep plum-burgundy)
};

// ── Color legibility helpers ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Perceptual luminance (0–255). Above ~150 reads as a "light" color. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Auto-pick dark vs white text for legibility on a given solid color. */
export function autoTextColors(hex: string) {
  return luminance(hex) > 150
    ? { primary: "rgba(0,0,0,0.85)", muted: "rgba(0,0,0,0.6)", faint: "rgba(0,0,0,0.5)", isDark: true }
    : { primary: "rgba(255,255,255,0.95)", muted: "rgba(255,255,255,0.7)", faint: "rgba(255,255,255,0.6)", isDark: false };
}

/** Subtle ±12% vertical gradient so cards read as one family with gentle depth. */
export function subtleGradient(hex: string): string {
  return `linear-gradient(180deg, color-mix(in srgb, ${hex} 88%, #fff) 0%, ${hex} 50%, color-mix(in srgb, ${hex} 88%, #000) 100%)`;
}

/** Priority solid oklch color values for inline styles */
export const PRIORITY_OKLCH: Record<TaskPriority, string> = {
  High: "oklch(0.54 0.12 355)",    // Dusty rose for high priority
  Medium: "oklch(0.65 0.08 85)",   // Muted gold for medium priority
  Low: "oklch(0.50 0.10 200)",     // Dusty teal for low priority
};

/** Priority tinted background — transparent tint that works on any bg (light or dark) */
export const PRIORITY_TINT: Record<TaskPriority, string> = {
  High: "oklch(0.54 0.12 355 / 0.12)",    // Dusty rose tint
  Medium: "oklch(0.65 0.08 85 / 0.12)",   // Muted gold tint
  Low: "oklch(0.50 0.10 200 / 0.12)",     // Dusty teal tint
};
