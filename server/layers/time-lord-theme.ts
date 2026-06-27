/**
 * LAYER 2 — Time Lord period theme.
 *
 * Pulls the current Mahadasha (MD) and Antardasha (AD) from the existing
 * Vimshottari dasha calculator and attaches a short, static interpretive theme
 * phrase for the MD/AD pair. The 81-entry table below is hand-authored (9 dasha
 * lords × 9), NOT generated at runtime.
 *
 * Pure aside from the dasha read; no I/O, no ephemeris.
 */

import type { Task } from "../../drizzle/schema";
import type { AstrologySubject } from "../astrology-subject";
import { calculateDashaTimeline } from "../dasha-calculator";
import type { TimeLordPeriod } from "./types";

export const DASHA_LORDS = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
] as const;
export type DashaLord = (typeof DASHA_LORDS)[number];

/**
 * THEME[mahaDasha][antarDasha] → 3–5 word phrase describing the operating theme
 * of the period. MD sets the engine; AD colors how it expresses. Phrases are
 * action-oriented (this app is about how to act), neutral-to-constructive.
 */
const THEME: Record<DashaLord, Record<DashaLord, string>> = {
  Sun: {
    Sun: "asserting clear authority",
    Moon: "leading with care",
    Mars: "decisive bold action",
    Mercury: "communicating with authority",
    Jupiter: "principled visible growth",
    Venus: "graceful public presence",
    Saturn: "disciplined leadership",
    Rahu: "ambitious self-promotion",
    Ketu: "detaching from recognition",
  },
  Moon: {
    Sun: "confident emotional clarity",
    Moon: "tending inner rhythms",
    Mars: "emotionally driven action",
    Mercury: "intuitive communication",
    Jupiter: "nurturing expansion",
    Venus: "caring for relationships",
    Saturn: "steadying the emotions",
    Rahu: "restless emotional seeking",
    Ketu: "emotional withdrawal, reflection",
  },
  Mars: {
    Sun: "bold authoritative drive",
    Moon: "passionate protective effort",
    Mars: "full-force execution",
    Mercury: "sharp tactical action",
    Jupiter: "righteous purposeful expansion",
    Venus: "energized creative pursuit",
    Saturn: "disciplined sustained effort",
    Rahu: "aggressive ambition",
    Ketu: "focused surgical cutting",
  },
  Mercury: {
    Sun: "articulate confident messaging",
    Moon: "adaptive intuitive thinking",
    Mars: "quick decisive analysis",
    Mercury: "sharp mental processing",
    Jupiter: "broad strategic thinking",
    Venus: "polished persuasive expression",
    Saturn: "rigorous detailed work",
    Rahu: "inventive unconventional ideas",
    Ketu: "abstract intuitive insight",
  },
  Jupiter: {
    Sun: "principled confident growth",
    Moon: "generous emotional expansion",
    Mars: "bold purposeful expansion",
    Mercury: "wise strategic planning",
    Jupiter: "broad optimistic growth",
    Venus: "abundant harmonious expansion",
    Saturn: "patient structured growth",
    Rahu: "expansive risk-taking",
    Ketu: "philosophical detachment",
  },
  Venus: {
    Sun: "refined self-expression",
    Moon: "nurturing connection",
    Mars: "passionate creative drive",
    Mercury: "elegant clear communication",
    Jupiter: "expanding value and joy",
    Venus: "cultivating beauty, harmony",
    Saturn: "refining structure",
    Rahu: "indulgent worldly ambition",
    Ketu: "detaching from pleasure",
  },
  Saturn: {
    Sun: "disciplined authority building",
    Moon: "steady emotional endurance",
    Mars: "controlled persistent effort",
    Mercury: "methodical detailed labor",
    Jupiter: "patient principled building",
    Venus: "structured refinement",
    Saturn: "rigorous discipline, endurance",
    Rahu: "relentless structured ambition",
    Ketu: "austere stripped-down focus",
  },
  Rahu: {
    Sun: "ambitious visibility push",
    Moon: "restless emotional ambition",
    Mars: "aggressive boundary-pushing",
    Mercury: "inventive unconventional schemes",
    Jupiter: "expansive risk-taking",
    Venus: "indulgent worldly ambition",
    Saturn: "relentless long-haul climbing",
    Rahu: "obsessive forward drive",
    Ketu: "destabilizing reorientation",
  },
  Ketu: {
    Sun: "dissolving ego attachments",
    Moon: "emotional withdrawal, introspection",
    Mars: "sharp detached action",
    Mercury: "intuitive non-linear insight",
    Jupiter: "spiritual seeking",
    Venus: "renouncing comforts",
    Saturn: "austere completion",
    Rahu: "turbulent inner shift",
    Ketu: "deep detachment, release",
  },
};

/**
 * Curated keyword tags per dasha lord (domain vocabulary). A period's tags are
 * the union of its MD and AD lord tags plus the words in its theme phrase. These
 * are matched (case-insensitive, whole-word or phrase-substring) against a
 * task's title + projectName for the ×1.2 theme-alignment boost. Kept small and
 * deliberate — false positives dilute the signal.
 */
const PLANET_KEYWORDS: Record<DashaLord, string[]> = {
  Sun: ["leadership", "authority", "visibility", "launch", "present", "decision", "identity", "reputation"],
  Moon: ["care", "nurture", "home", "family", "wellbeing", "audience", "mood", "routine"],
  Mars: ["action", "execute", "ship", "build", "push", "fix", "drive", "compete", "deadline"],
  Mercury: ["write", "writing", "email", "communication", "analysis", "report", "docs", "research", "sales", "negotiate"],
  Jupiter: ["growth", "teach", "learn", "publish", "expand", "strategy", "plan", "mentor", "course"],
  Venus: ["design", "brand", "relationship", "client", "contract", "refine", "polish", "art", "partnership", "pricing"],
  Saturn: ["structure", "system", "process", "cleanup", "organize", "maintenance", "discipline", "audit", "admin", "review"],
  Rahu: ["ambition", "growth", "marketing", "scale", "experiment", "unconventional", "risk", "network"],
  Ketu: ["close", "complete", "release", "archive", "simplify", "reflect", "withdraw", "wind-down", "spiritual"],
};

const STOPWORDS = new Set([
  "with", "and", "the", "for", "from", "into", "of", "to", "in", "on", "a", "an",
]);

function phraseTokens(theme: string): string[] {
  return theme
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** All tags for an MD/AD period (planet domains + theme-phrase words). */
export function themeTags(md: DashaLord, ad: DashaLord): string[] {
  const theme = THEME[md]?.[ad] ?? "";
  return Array.from(
    new Set([...PLANET_KEYWORDS[md], ...PLANET_KEYWORDS[ad], ...phraseTokens(theme)])
  );
}

/** Tokenize a task's title + project name into a lowercase word set. */
function taskHaystack(task: Task & { projectName?: string | null }): { words: Set<string>; raw: string } {
  const raw = `${task.title ?? ""} ${task.projectName ?? ""}`.toLowerCase();
  const words = new Set(raw.split(/[^a-z]+/).filter(Boolean));
  return { words, raw };
}

/**
 * Does the task's title/project semantically align with the current period?
 * v1 keyword match: any period tag that is either a whole word in the task, or
 * (for multi-word tags) a substring of the task text.
 */
export function themeMatchesTask(
  period: TimeLordPeriod,
  task: Task & { projectName?: string | null }
): boolean {
  const md = period.mahaDasha as DashaLord;
  const ad = period.antarDasha as DashaLord;
  if (!THEME[md] || !THEME[md][ad]) return false;
  const tags = themeTags(md, ad);
  const { words, raw } = taskHaystack(task);
  for (const tag of tags) {
    if (tag.includes("-") || tag.includes(" ")) {
      if (raw.includes(tag)) return true;
    } else if (words.has(tag)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve the current Time Lord period for a profile. Returns null when birth /
 * Moon-nakshatra data is missing (graceful degradation — contributes ×1.0).
 */
export function getTimeLordPeriod(subject: AstrologySubject): TimeLordPeriod | null {
  const moon = subject.natalBodies.find((b) => b.planet === "Moon");
  if (!subject.birthDate || !moon?.nakshatra || !moon?.sign || !moon?.degree) {
    return null;
  }
  try {
    const today = new Date().toISOString().split("T")[0];
    const timeline = calculateDashaTimeline(
      subject.birthDate,
      moon.nakshatra,
      moon.sign,
      moon.degree,
      today,
      moon.longitude ?? null
    );
    const mahaDasha = timeline.currentMahadasha;
    const antarDasha = timeline.currentAntardasha;
    if (!mahaDasha || !antarDasha) return null;

    const theme = THEME[mahaDasha as DashaLord]?.[antarDasha as DashaLord] ?? "";
    return { mahaDasha, antarDasha, theme };
  } catch {
    return null;
  }
}
