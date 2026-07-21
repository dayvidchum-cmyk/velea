import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { getGenUsage, getGenUsageTotals, resetGenUsage, __recordUsageForTest } from "./generate";

/**
 * THE METER (v885).
 *
 * Velea made a model call on every reading and discarded the usage object every time, so the only
 * available answer to "what does a read cost" was watching the prepaid wallet — an instrument that
 * cannot separate a cache HIT from a cold cache WRITE, which is the whole question when the shared
 * BASE_PROMPT is 16,287 words.
 *
 * These fix the arithmetic, because a cost meter that is quietly wrong is worse than no meter: it
 * gets believed. Every expected number below is hand-computed from the published per-MTok prices.
 */
beforeEach(() => resetGenUsage());

const msg = (u: Record<string, number>, model = "claude-sonnet-4-6") => ({ model, usage: u });

describe("the meter", () => {
  it("records the four token classes separately", () => {
    __recordUsageForTest(msg({ input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 300, cache_creation_input_tokens: 400 }));
    const [u] = getGenUsage();
    expect(u.inputTokens).toBe(100);
    expect(u.outputTokens).toBe(200);
    expect(u.cacheReadTokens).toBe(300);
    expect(u.cacheWriteTokens).toBe(400);
    expect(u.model).toBe("claude-sonnet-4-6");
  });

  it("prices a call by hand-checkable arithmetic", () => {
    // sonnet-4-6 = $3 in / $15 out per MTok.
    // input     1_000_000 x 1.00 x $3  = $3.00
    // cacheRead 1_000_000 x 0.10 x $3  = $0.30
    // cacheWrite1_000_000 x 1.25 x $3  = $3.75
    // output    1_000_000 x        $15 = $15.00
    //                                    -------
    //                                    $22.05
    __recordUsageForTest(msg({
      input_tokens: 1_000_000, output_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000,
    }));
    expect(getGenUsage()[0].costUsd).toBeCloseTo(22.05, 6);
  });

  it("prices Opus above Sonnet on identical tokens — the comparison this exists for", () => {
    const tokens = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    __recordUsageForTest(msg(tokens, "claude-sonnet-4-6")); // $3 + $15  = $18
    __recordUsageForTest(msg(tokens, "claude-opus-4-8"));   // $5 + $25  = $30
    const [opus, sonnet] = getGenUsage(); // newest first
    expect(sonnet.costUsd).toBeCloseTo(18, 6);
    expect(opus.costUsd).toBeCloseTo(30, 6);
    // The sticker ratio, on identical token counts. The REAL ratio is worse, because Opus 4.8
    // tokenizes the same text to more tokens — which is exactly why this meter counts tokens
    // from the API instead of assuming they carry over between models.
    expect(opus.costUsd! / sonnet.costUsd!).toBeCloseTo(30 / 18, 6);
  });

  it("returns null rather than a plausible wrong number for an unpriced model", () => {
    __recordUsageForTest(msg({ input_tokens: 1000, output_tokens: 1000 }, "claude-not-a-real-model"));
    expect(getGenUsage()[0].costUsd).toBeNull();
    // ...and an unpriced call must not silently drag the total toward zero.
    expect(getGenUsageTotals().costUsd).toBeNull();
    expect(getGenUsageTotals().costedCalls).toBe(0);
  });

  it("cacheHitRate separates a warm read from a cold one", () => {
    __recordUsageForTest(msg({ cache_read_input_tokens: 0, cache_creation_input_tokens: 20_000 })); // cold
    expect(getGenUsageTotals().cacheHitRate).toBe(0);
    resetGenUsage();
    __recordUsageForTest(msg({ cache_read_input_tokens: 20_000, cache_creation_input_tokens: 0 })); // warm
    expect(getGenUsageTotals().cacheHitRate).toBe(1);
    resetGenUsage();
    // CONTROL — no cacheable traffic at all is not a 0% hit rate, it is "no answer".
    __recordUsageForTest(msg({ input_tokens: 500, output_tokens: 500 }));
    expect(getGenUsageTotals().cacheHitRate).toBeNull();
  });

  it("totals sum across calls and count them", () => {
    __recordUsageForTest(msg({ input_tokens: 10, output_tokens: 20 }));
    __recordUsageForTest(msg({ input_tokens: 30, output_tokens: 40 }));
    const t = getGenUsageTotals();
    expect(t.calls).toBe(2);
    expect(t.inputTokens).toBe(40);
    expect(t.outputTokens).toBe(60);
    expect(t.models).toEqual(["claude-sonnet-4-6"]);
  });

  it("a response with no usage object is ignored, not recorded as a free call", () => {
    __recordUsageForTest({ model: "claude-sonnet-4-6" });
    __recordUsageForTest(undefined);
    expect(getGenUsage()).toHaveLength(0);
    expect(getGenUsageTotals().calls).toBe(0);
  });

  it("the buffer is bounded so a long run cannot grow memory without limit", () => {
    for (let i = 0; i < 80; i++) __recordUsageForTest(msg({ input_tokens: 1, output_tokens: 1 }));
    expect(getGenUsage().length).toBeLessThanOrEqual(60);
  });

  it("the meter is WIRED to the client, not merely defined (the v884 lesson)", () => {
    // Every test above exercises the arithmetic directly. All eight would still pass if the
    // wrapper in client() were deleted and no real call were ever metered — which is precisely
    // how contacts.ts shipped green in v884 while being imported by nothing.
    //
    // The wrapper cannot be invoked here (it needs a live ANTHROPIC_API_KEY), so this asserts the
    // structure instead: the factory must wrap messages.create and route it through recordUsage.
    const SRC = readFileSync(new URL("./generate.ts", import.meta.url), "utf8");
    const factory = SRC.slice(SRC.indexOf("function client()"));
    expect(factory).toMatch(/const create = a\.messages\.create\.bind\(a\.messages\)/);
    expect(factory).toMatch(/\(a\.messages as any\)\.create = async/);
    expect(factory).toMatch(/recordUsage\(msg\)/);
    // And it must stay inside a try/catch — metering may never take down a billed read.
    expect(factory).toMatch(/try \{ recordUsage\(msg\); \} catch/);
  });
});
