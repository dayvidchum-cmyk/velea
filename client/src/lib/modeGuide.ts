import type { TaskMode } from "@shared/types";

/**
 * Static, user-facing reference for what each day mode means and which tasks
 * fit it. Source of truth for the Today-page "What does this mode mean?"
 * disclosure and the Glossary "Modes" section. Mirrors the engine's intent
 * (server/panchang/interpreter.ts MODE_BASE_INSTRUCTIONS) in plain language —
 * the day mode answers "what kind of work is favored today?".
 */
export interface ModeGuide {
  /** One-line essence — what the day favors. */
  essence: string;
  /** Task types that fit this mode. */
  bestFor: string[];
  /** Task types to hold off on. */
  avoid: string[];
}

export const MODE_GUIDE: Record<TaskMode, ModeGuide> = {
  Action: {
    essence:
      "Visible movement. The day favors initiating, publishing, reaching out, and making decisions.",
    bestFor: [
      "Publishing or launching",
      "Outreach and first contact",
      "Making decisions and committing",
      "Starting something new",
    ],
    avoid: ["Endless prep", "Waiting for perfect conditions", "Second-guessing"],
  },
  Build: {
    essence:
      "Preparation and systems. The day favors strengthening the container — drafting, editing, and setup — over going public.",
    bestFor: [
      "Drafting and editing",
      "Setup, systems, and organizing",
      "Planning and research",
      "Fixing what's broken",
    ],
    avoid: ["Launching or big public asks", "Forcing visibility", "Cold outreach"],
  },
  Selective: {
    essence:
      "Advance, don't initiate. The day favors moving existing threads forward — warm leads, live conversations, follow-ups — not brand-new fronts.",
    bestFor: [
      "Following up on warm leads",
      "Active conversations",
      "Advancing work already in motion",
      "Choosing one thing and finishing it",
    ],
    avoid: ["Cold starts", "Opening many new fronts", "Broad untargeted outreach"],
  },
  Restraint: {
    essence:
      "Contain and stabilize. The day favors repair, rest, and reducing exposure — finish rather than start, and don't force outcomes.",
    bestFor: [
      "Repair and cleanup",
      "Resting and recovering",
      "Finishing rather than starting",
      "Quiet behind-the-scenes work",
    ],
    avoid: ["Launching or going public", "Confrontation or high-stakes asks", "Forcing outcomes"],
  },
};
