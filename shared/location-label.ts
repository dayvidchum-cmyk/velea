// WHAT THE LOCATION CHIP MAY SAY ABOUT WHERE A READING WAS CAST.
//
// David's law, 2026-07-21: "nothing should be hardcoded unless the data that decides it is
// displayed where it is displayed, and what it says is accurate to the data." The chip's suffix is
// hardcoded copy chosen by `source`, so each branch has to be true to the tier that selected it —
// and the tiers do not all mean the same thing.
//
// The old label said "· not set for them" on every `current` and `default` tier. On the account
// holder's OWN chart the current tier is their own city, confirmed by the person whose phone it
// is; calling that "not set" is noise over a correct value. His ruling: "follows you" on someone
// else's chart, nothing at all on your own.
//
// `default` is a third state he did not name because it is not the one he was looking at: nobody
// set a location anywhere and the app default is speaking. That is neither "follows you" nor
// right, so it says what it is rather than borrowing either other label.
//
// The remaining tiers — override, hometown, birth — are the person's own stored ground. Nothing
// to disclose, so nothing is said.
export type DaySkySource = "override" | "current" | "hometown" | "birth" | "default";

export function locationSuffix(source: DaySkySource | null | undefined, isOwner: boolean, city: string | null): string | null {
  // No city to qualify — the chip already reads "set a location" and a suffix would double it.
  if (!city || !source) return null;
  if (source === "current") return isOwner ? null : "follows you";
  if (source === "default") return "no location set";
  return null;
}
