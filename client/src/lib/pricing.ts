/**
 * PRICING — single source for every price the UI shows.
 * Numbers are DAVID'S Phase-0 call (STRIPE_PLAN.md: "names/prices are David's call").
 * `null` = not announced yet: locked surfaces show the notify-me capture WITHOUT a number
 * (never an invented price). Set the string once here (e.g. "$8/month") and every locked
 * card updates.
 */
export const PREMIUM_PRICING: { monthly: string | null } = { monthly: null };
