import { AsyncLocalStorage } from "node:async_hooks";

/**
 * THE GENERATION METER — count API CALLS, not results (v806).
 *
 * The daily cap was counting one "event" per non-null generation. Two things were wrong with that,
 * in opposite directions:
 *
 *   · callGuarded makes up to THREE calls — the first attempt plus two corrective retries when a
 *     guard trips — and all three were counted as one. A 50/day cap was really up to 150 calls
 *     against a capped wallet.
 *   · A generation that came back null after burning those calls counted as ZERO, because the rule
 *     was "only count a REAL generation". A truncation on the third attempt is money spent with
 *     nothing to show; the cap has to see it, or the cap protects nothing at exactly the moment it
 *     matters.
 *
 * Counting the API calls themselves fixes both, and needs no special case for the dry wallet: when
 * there is no key the request is never made, so nothing is counted.
 *
 * AsyncLocalStorage rather than a module-level counter on purpose. Generations run concurrently for
 * different profiles; a global counter read before and after an await would attribute one profile's
 * retries to whoever happened to be measuring. The context travels with the async work instead.
 */
const meter = new AsyncLocalStorage<{ calls: number }>();

/** Run `fn` inside a meter and report how many model calls it actually made. */
export async function withMeter<T>(fn: () => Promise<T>): Promise<{ result: T; calls: number }> {
  const cell = { calls: 0 };
  const result = await meter.run(cell, fn);
  return { result, calls: cell.calls };
}

/** Called immediately before every request to the model. A no-op outside a meter (scripts, probes). */
export function countApiCall(): void {
  const cell = meter.getStore();
  if (cell) cell.calls += 1;
}
