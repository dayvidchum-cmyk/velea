/**
 * PRICING — single source for every price the UI shows.
 * THE LOCKED PRICE LIST (David, 2026-07-18, ratified; surfaced 2026-07-22): price = distance of
 * sight (the time-gate doctrine made commercial). One elegant rule, not a feature grab-bag.
 *
 *   · near-sight $2.99/mo — the near future, rented: moment refresh · House / Chapter Reader ·
 *     Time Master + Hora · the special readings (eclipse / Mercury rx / month / slow reviews) ·
 *     kept readings · sight through the end of next month.
 *   · all-access $4.99/mo — year-sight: EVERYTHING, plus the Year page · Life Atlas · a second
 *     chart (and the combined reading it opens) · The Verdict. Half of Align27's headline, no
 *     add-ons — the honest ceiling.
 *   · pick-a-date $1.49 each — the telescope: one date pierced à la carte, no sub required.
 *
 * `null` = not announced yet: a locked surface then shows the notify-me capture WITHOUT a number
 * (never an invented price). Set/clear a tier here and every card that routes to it updates.
 * Nothing CHARGES yet (Stripe waits on Mercury) — these strings only make the numbers legible.
 */
export const PREMIUM_PRICING: {
  /** $2.99/mo — the near-sight sub (the impulse anchor that travels by word of mouth). */
  nearSight: string | null;
  /** $4.99/mo — all-access (year-sight, the second chart, the Verdict; the competitive ceiling). */
  allAccess: string | null;
  /** $1.49 each — pick-a-date, à la carte (exists BECAUSE the sub only sees to next month). */
  pickADate: string | null;
} = {
  nearSight: "$2.99 / mo",
  allAccess: "$4.99 / mo",
  pickADate: "$1.49",
};
