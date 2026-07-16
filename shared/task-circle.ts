/**
 * THE NINE CIRCLES (David 2026-07-16: "make it specific for the user and the engine
 * knows what to do") — WHO a task touches. Each circle maps to the life-theme rooms
 * the convergence timeline already speaks (the same theme keys as the open windows),
 * so when a day's windows light those rooms, tasks touching that circle rise.
 */
export const CIRCLES = [
  "life_partner", "family", "best_friends", "inner_circle", "friends",
  "coworkers", "clients", "self", "everyone_else",
] as const;
export type TaskCircle = (typeof CIRCLES)[number];

export const CIRCLE_LABEL: Record<TaskCircle, string> = {
  life_partner: "Life partner",
  family: "Family",
  best_friends: "Best friends",
  inner_circle: "Inner circle",
  friends: "Friends",
  coworkers: "Co-workers",
  clients: "Clients",
  self: "Self",
  everyone_else: "Everyone else",
};

/** circle → the life-theme rooms it lives in (open-window theme keys).
 *  Siblings law: best friends / inner circle / friends = blood + CHOSEN family (3rd). */
export const CIRCLE_THEMES: Record<TaskCircle, string[]> = {
  life_partner: ["marriage"],
  family: ["parents", "home"],
  best_friends: ["siblings"],
  inner_circle: ["siblings"],
  friends: ["siblings"],
  coworkers: ["career"],
  clients: ["wealth", "career"],
  self: ["identity", "health"],
  everyone_else: ["fame", "identity"],
};

/** The room named in lived words (for scorer reasons + whispers). */
export const THEME_ROOM: Record<string, string> = {
  marriage: "marriage & union",
  children: "children & creations",
  career: "career & vocation",
  identity: "how you're received",
  fame: "recognition",
  wealth: "wealth & income",
  siblings: "the inner circle",
  parents: "parents & roots",
  home: "home & land",
  health: "health & vitality",
};
