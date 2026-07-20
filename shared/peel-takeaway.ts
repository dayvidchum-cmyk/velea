/**
 * PEEL THE TAKEAWAY — the one piece of display-side prose surgery left in the app.
 *
 * It lives in shared/ (not inside the page) because the reading-voice audit's own law is that the
 * SEAM gets guarded, not just the generation: any client code that splits, peels or truncates LLM
 * prose can behead a sentence the model wrote whole, and the vitest suite only collects
 * server/** and shared/**. A transformer no test can reach is how this one drifted.
 */
// Words that signal a continuation/appositive fragment, not a standalone closing
// thought — so we never peel a mid-sentence em dash into a dangling takeaway.
export const FRAGMENT_STARTS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "and", "but", "or", "nor",
  "which", "that", "who", "whom", "whose", "where", "when", "while", "because",
  "though", "although", "yet", "if", "as",
  // verbs that begin the TAIL of a subject the peel cut away (David's "broken thought":
  // "Have to be worked through that craft floor…")
  "have", "has", "had", "having", "means", "meaning", "makes", "making",
  "needs", "needing", "wants", "gets", "getting", "comes", "coming", "goes", "going",
]);

/**
 * Split a "why" string into placement detail (data) and a closing takeaway.
 * Peels at an explicit "— so …", or at a trailing em dash IF the tail reads as a
 * complete sentence (doesn't begin with a fragment/connector word). This keeps
 * real closing lines ("— the year places belief inside service…") as takeaways
 * while leaving mid-sentence appositives ("— is where…") attached.
 */
export function peelTakeaway(text: string): { data: string; takeaway: string } {
  // THE ONE HARD RULE (audit 2026-07-20): this may DECLINE to peel, but it must never behead a
  // sentence the model wrote whole — the takeaway is rendered ALONE in gold, so a bad peel is the
  // only thing the reader sees. The appositive-pair guard below was written for the trailing-dash
  // branch only and had two holes, both reproduced against real prose shapes:
  //   · the "— so" branch matched the FIRST occurrence anywhere, so an aside that happened to
  //     contain "— so much of what arrives…" was peeled at its OPENING dash and the word "so"
  //     eaten: "much of what arrives this year arrives through what you already own — and Ketu…"
  //   · the guard only recognised an aside shorter than 140 characters with no sentence mark in
  //     it, so a long aside sailed through: "…the standing up early and the staying late when the
  //     studio has gone cold — every week of this year." peeled to "every week of this year."
  // Both are now covered by one rule instead of a widening list of exceptions: peel only at a dash
  // that is UNAMBIGUOUSLY a closing clause — the last em dash in the text, with no earlier one to
  // pair it with. Prose with a mid-sentence aside keeps its whole thought and simply gets no
  // takeaway, which is the safe direction.
  const dashes = [...text.matchAll(/—/g)].map((m) => m.index!);
  if (dashes.length !== 1) return { data: text, takeaway: "" };
  const idx = dashes[0];
  if (idx <= text.length * 0.4) return { data: text, takeaway: "" };
  let tail = text.slice(idx + 1).trim();
  // "— so X" reads as a closing clause with a connector; keep X, as before.
  const so = tail.match(/^so[,\s]+/i);
  if (so) tail = tail.slice(so[0].length).trim();
  const first = (tail.split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z]/g, "");
  if (tail && (so || !FRAGMENT_STARTS.has(first))) {
    return { data: text.slice(0, idx).trim().replace(/[,;]\s*$/, ""), takeaway: tail };
  }
  return { data: text, takeaway: "" };
}
