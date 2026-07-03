import type { Paksha } from "./tables.js";

/**
 * Pancha Pakshi — the five activities, their strengths, and how a bird's activity maps
 * to a favorable/unfavorable quality. Strengths + the Krishna-paksha Walking reversal
 * are from the classic rule set (validated: David is Krishna paksha, and his app shows
 * Owl's Walking windows as favorable "Action", not a warning).
 */

export type Activity = "Ruling" | "Eating" | "Walking" | "Sleeping" | "Dying";
export const ACTIVITIES: Activity[] = ["Ruling", "Eating", "Walking", "Sleeping", "Dying"];

export const ACTIVITY_STRENGTH: Record<Activity, number> = {
  Ruling: 1.0, Eating: 0.8, Walking: 0.6, Sleeping: 0.4, Dying: 0.2,
};

// App-facing names, matching the reference app the user validates against.
export const ACTIVITY_LABEL: Record<Activity, string> = {
  Ruling: "Succeed", Eating: "Energize", Walking: "Action", Sleeping: "Rest", Dying: "Caution",
};

export type Quality = "golden" | "good" | "neutral" | "low" | "avoid";

/**
 * Favorability of a bird's activity. Golden rule with the dark-fortnight Walking
 * reversal: in Krishna paksha, Walking flips from neutral to favorable.
 */
export function quality(activity: Activity, paksha: Paksha): Quality {
  switch (activity) {
    case "Ruling": return "golden";
    case "Eating": return "good";
    case "Walking": return paksha === "Krishna" ? "good" : "neutral";
    case "Sleeping": return "low";
    case "Dying": return "avoid";
  }
}
