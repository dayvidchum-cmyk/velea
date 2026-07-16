// THE SEVEN KINDS — the classical task vocabulary (David 2026-07-15: "7 to be precise",
// "flip all the tasks to the proper color on its own… funnel and organize them for me
// automatically"). Kinds are the seven nakshatra NATURES from canon/muhurta-tables.json —
// a task is classified by WHAT KIND OF ACT it is, so the day's character can say which
// acts it supports. Classification is LIVE (computed at read time, nothing stored): the
// old four-mode tag stays on the row untouched and keeps the scorer/rest-gate bridge
// working. A stored, user-overridable kind is a later schema decision (David's pause-point).
export type TaskKind = "fixed" | "movable" | "swift" | "tender" | "sharp" | "fierce" | "mixed";

export const KIND_ORDER: TaskKind[] = ["fixed", "movable", "swift", "tender", "sharp", "fierce", "mixed"];

// One vocabulary per kind, straight from the canon supports lists.
const KIND_PATTERNS: Array<[TaskKind, RegExp]> = [
  // movable — travel, moves and relocations, vehicles
  ["movable", /\b(travel|trip|flight|fly(ing)?|drive|road ?trip|mov(e|ing) (out|in|house|apartment)|relocat\w*|vehicle|car (service|wash|repair|registration)|commute|shuttle)/i],
  // swift — quick errands, trade and sales, learning
  ["swift", /\b(errand|buy|order|pick ?up|drop ?off|email|text|call|reply|respond|send|pay(ment)?|invoice|bill(s)?|sell|sale|list(ing)?|post|book(ing)?|schedul\w*|renew|register|sign ?up|submit|learn|study|read (the|a)|course|lesson|research)/i],
  // fixed — foundations, lasting commitments, construction
  ["fixed", /\b(build|foundation|set ?up|install|assemble|construct\w*|plant(ing)?|contract|lease|incorporat\w*|establish|launch plan|open (an? )?(account|studio|shop)|infrastructure|renovat\w*)/i],
  // tender — love and union, friendship and reconciliation, art and music
  ["tender", /\b(date night|dinner with|coffee with|visit|friend|family|mom|dad|mother|father|sister|brother|partner|husband|wife|love|anniversary|wedding|gift|celebrat\w*|reconcil\w*|apolog\w*|art|draw(ing)?|paint(ing)?|sketch|music|song|sing|compose|design|photo(shoot)?|writ(e|ing) (the )?(poem|story|letter))/i],
  // sharp — decisive cuts, incisive procedures, clean endings and separations
  ["sharp", /\b(cancel|end (the|my)|quit|unsubscribe|cut (off|ties)|delete|remove|close (the )?(account|card)|break ?up|resign|let go|fire|return(s)?|refund|purge|declutter|throw (out|away)|donate (old|the)|surgery|dental|dentist|extraction|biopsy|trim|prune)/i],
  // fierce — force, demolition, hard confrontation
  ["fierce", /\b(demolish|demolition|tear (down|out|up)|rip (out|up)|deep ?clean|scrub|power ?wash|haul|junk removal|gym|workout|lift(ing)?|train(ing)? (hard|session)|confront\w*|dispute|contest|argue|negotiate|collections|chase (down|payment))/i],
];

/** Classify a task into its kind — keyword vocabulary first, old mode tag as the funnel's
 *  fallback, Steady (mixed: routine, day-to-day duties) as the resting default. */
export function kindOfTask(t: { title?: string | null; description?: string | null; mode?: string | null }): TaskKind {
  const text = `${t.title ?? ""} ${t.description ?? ""}`;
  for (const [k, re] of KIND_PATTERNS) if (re.test(text)) return k;
  switch (t.mode) {
    case "Action": return "swift";     // outward, quick — the errand family
    case "Build": return "fixed";      // tending what lasts
    // Selective's careful/finishing work is mostly day-to-day tending, not endings —
    // Cutting is reserved for tasks whose own words say so (David: "a ton of cutting").
    default: return "mixed";           // Selective, Restraint & untagged — day-to-day duties
  }
}

/** The kind's display word — one voice with the orbs. */
export const KIND_WORD: Record<TaskKind, string> = {
  fixed: "Ground", movable: "Motion", swift: "Swift", tender: "Tender",
  sharp: "Cutting", fierce: "Force", mixed: "Steady",
};
