/**
 * THE TWENTY-SIX CIRCLES (David 2026-07-16, "its complete") — WHO a task touches.
 * Each circle lives in classical rooms (the open-window theme keys), so when a day's
 * convergence windows light those rooms, tasks touching that circle rise. Some circles
 * carry their own VOICE for the ranking reason (an enemy's lift shouldn't talk about
 * health & vitality — it should name the contest).
 */
export const CIRCLES = [
  "life_partner", "husband", "wife", "boyfriend", "girlfriend", "lover", "situationship",
  "children", "mother", "father", "family", "pets", "self",
  "inner_circle", "friends", "acquaintances",
  "boss", "business_partner", "mentors", "mentees", "coworkers", "clients", "helpers",
  "institutions", "powerful", "followers", "everyone_else", "enemies",
] as const;
export type TaskCircle = (typeof CIRCLES)[number];

export const CIRCLE_LABEL: Record<TaskCircle, string> = {
  life_partner: "Life partner", husband: "Husband", wife: "Wife",
  boyfriend: "Boyfriend", girlfriend: "Girlfriend", lover: "Lover", situationship: "Situationship",
  children: "Children", mother: "Mother", father: "Father", family: "Family", pets: "Pets", self: "Self",
  inner_circle: "Inner circle", friends: "Friends", acquaintances: "Acquaintances",
  boss: "Boss", business_partner: "Business partner", mentors: "Mentors", mentees: "Mentees",
  coworkers: "Co-workers", clients: "Clients", helpers: "Helpers",
  institutions: "Institutions", powerful: "The powerful", followers: "Followers",
  everyone_else: "Everyone else", enemies: "Enemies",
};

/** The five shelves — the picker's organization (never a flat bubble field). */
export const CIRCLE_SHELVES: { label: string; circles: TaskCircle[] }[] = [
  { label: "Love", circles: ["life_partner", "husband", "wife", "boyfriend", "girlfriend", "lover", "situationship"] },
  { label: "Yours", circles: ["self", "children", "mother", "father", "family", "pets"] },
  { label: "Chosen", circles: ["inner_circle", "friends", "acquaintances"] },
  { label: "Work", circles: ["boss", "business_partner", "mentors", "mentees", "coworkers", "clients", "helpers"] },
  { label: "The world", circles: ["institutions", "powerful", "followers", "everyone_else", "enemies"] },
];

/** circle → the life-theme rooms it lives in (open-window theme keys).
 *  Classical seats: union=7th · romance=5th · chosen family=3rd · guru=9th ·
 *  service/contest/small animals=6th · authority/rājya=10th · audience=11th. */
export const CIRCLE_THEMES: Record<TaskCircle, string[]> = {
  life_partner: ["marriage"], husband: ["marriage"], wife: ["marriage"],
  boyfriend: ["marriage"], girlfriend: ["marriage"],
  lover: ["children", "marriage"], situationship: ["marriage"],
  // Mother and father are PRECISE in the tradition (David: "specific to the tradition.
  // Very precise."): mother = the 4th (mātṛ, Moon) · father = the 9th (pitṛ, Sun).
  children: ["children"], mother: ["home", "parents"], father: ["parents"], family: ["parents", "home"], pets: ["health"],
  self: ["identity", "health"],
  inner_circle: ["siblings"], friends: ["siblings"], acquaintances: ["fame"],
  boss: ["career"], business_partner: ["marriage", "career"],
  mentors: ["parents"], mentees: ["children"],
  coworkers: ["career"], clients: ["wealth", "career"], helpers: ["health"],
  institutions: ["career"], powerful: ["fame", "career"], followers: ["fame"],
  everyone_else: ["fame", "identity"], enemies: ["health"],
};

/** Per-circle ranking voice — overrides the default "window is open" phrasing where
 *  the theme label would read wrong (an enemy is not "health & vitality"). */
export const CIRCLE_VOICE: Partial<Record<TaskCircle, string>> = {
  enemies: "The contest window is open — face them on your terms",
  helpers: "The service rooms are open — the people who serve you deliver today",
  pets: "The care rooms are open — the small companions are held",
  mentors: "The guru's room is open — seek the teaching",
  mentees: "The 5th's rooms are open — what you teach lands today",
  powerful: "The Sun's people are receptive — standing can be won today",
  institutions: "The authority rooms are open — paperwork and officials move",
  lover: "The romance rooms are open",
  situationship: "The union rooms are open — clarity favors you",
  mother: "The 4th's rooms are open — the ground she gave you is tended today",
  father: "The 9th's rooms are open — the line he carries meets you today",
};

/** The room named in lived words (default scorer reasons + whispers). */
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
