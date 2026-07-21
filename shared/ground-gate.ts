// THE DOOR GATE'S RULE (David's ruling, 2026-07-21: the confirm happens at the door, before
// generation, "and it saves money").
//
// The rule lives here, apart from the database call that answers it, for the same reason the
// location chip's copy does: the vitest config collects server/ and shared/, and a rule that
// decides whether a paid reading generates is exactly the thing that must not ship unguarded.
// guardedGen holds the database and the money; this holds the decision.
export type GroundDecision = "confirmed" | "unasked" | "unknown";

/**
 * Should a billed generation be withheld?
 *
 * ONLY "unasked" withholds — the profile exists, the column exists, and no human has ever said
 * whether the ground is right.
 *
 * "unknown" deliberately does NOT withhold. It means the question could not be asked at all: no
 * database, or the migration has not been run and the column is absent. An infrastructure gap is
 * never a reason to withhold someone's reading — this repo has already lost a day to the opposite
 * instinct, when a cache column too narrow for its keys took down billed readings. The rule
 * written then holds here: a missing piece of bookkeeping never kills a read.
 *
 * "confirmed" covers BOTH answers. A decline is a decision and is remembered, so the door asks
 * once per profile and never again.
 */
export function withholdGeneration(decision: GroundDecision): boolean {
  return decision === "unasked";
}
