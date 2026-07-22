/**
 * PEEL THE TAKEAWAY — the one piece of display-side prose surgery left in the app.
 *
 * It lives in shared/ (not inside the page) because the reading-voice audit's own law is that the
 * SEAM gets guarded, not just the generation: any client code that splits, peels or truncates LLM
 * prose can behead a sentence the model wrote whole, and the vitest suite only collects
 * server/** and shared/**. A transformer no test can reach is how this one drifted.
 */
/**
 * Split a "why" string into placement detail (data) and a closing takeaway.
 * Peels at an explicit "— so …", or at a trailing em dash IF the tail begins a
 * NEW clause (a capital-letter sentence, or a quote/paren opener). This keeps
 * real closing lines ("— The year places belief inside service…") as takeaways
 * while leaving mid-sentence continuations ("— pulling the floor loose") attached.
 *
 * WHY A POSITIVE RULE, NOT A DENYLIST (audit 2026-07-22): the old guard peeled by
 * DEFAULT unless the tail's first word was in an enumerated FRAGMENT_STARTS set —
 * and no finite list can name every continuation word. A single trailing dash whose
 * tail began with an out-of-list participle or verb ("…his hand reaching back —
 * pulling the old belief loose.") slipped through and was rendered ALONE in gold: a
 * beheaded fragment, the one thing the reader sees. The model writes a genuine
 * standalone closer as a capitalised new sentence (control test: "— Both rooms keep
 * handing you the same question.") or via the explicit "— so …" connector; a
 * lowercase, non-"so" tail is a continuation of the prior clause. So we peel ONLY on
 * those two shapes and DECLINE otherwise — the safe direction is no takeaway, never a
 * broken one. This is also the invariant the suite already asserts (takeaway[0] is
 * [A-Z"'(]).
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
  if (!tail) return { data: text, takeaway: "" };
  // Peel ONLY when the tail is a genuine standalone closer: a "— so …" connector, or a new clause
  // the model capitalised / opened with a quote or paren. A lowercase, non-"so" tail continues the
  // prior clause (participle, compound predicate, appositive) — peeling it beheads the thought.
  const startsNewClause = /^["'(]/.test(tail) || /^[A-Z]/.test(tail);
  if (so || startsNewClause) {
    return { data: text.slice(0, idx).trim().replace(/[,;]\s*$/, ""), takeaway: tail };
  }
  return { data: text, takeaway: "" };
}
