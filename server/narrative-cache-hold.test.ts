import { describe, expect, it } from "vitest";
import { getNarrativeCache, upsertNarrativeCache, heldNarrativeCount } from "./db";

/**
 * CONTROL for the paid-reading-lost-on-a-failed-write leak.
 *
 * The 2026-07-17 outage law says a cache-write failure must never kill a generated reading — but
 * upsertNarrativeCache returned void, so no caller could tell a failed save from a successful one.
 * The reading was served, the row never landed, and the NEXT TAP regenerated the identical reading
 * and billed for it again. During that outage that was every tap of every surface, indefinitely.
 *
 * These run with no DATABASE_URL, which takes the same `getDb() === null` branch a broken table
 * takes. Against the old code every one of them fails: the upsert returned undefined (not false)
 * and getNarrativeCache returned undefined for a reading that had just been generated.
 */
describe("narrative cache — a paid reading survives a failed write", () => {
  it("reports FALSE when the row could not be persisted (was: void, indistinguishable from success)", async () => {
    const ok = await upsertNarrativeCache(9001, "day_read", "2026-07-20", "hash-a", "model-x", JSON.stringify({ story: "the tide is going out" }));
    expect(ok).toBe(false);
  });

  it("serves the held reading back, so the next tap does not regenerate and re-bill", async () => {
    await upsertNarrativeCache(9002, "day_read", "2026-07-20", "hash-b", "model-x", JSON.stringify({ story: "kept" }));
    const row: any = await getNarrativeCache(9002, "day_read", "2026-07-20");
    expect(row).toBeDefined();
    expect(row.inputHash).toBe("hash-b"); // the callers gate on this — a held row must carry it
    expect(JSON.parse(row.content).story).toBe("kept");
    expect(row.held).toBe(true); // marked, so it is never mistaken for a persisted row
  });

  it("does not serve a held row for a different profile, surface or date", async () => {
    await upsertNarrativeCache(9003, "day_read", "2026-07-20", "hash-c", "model-x", "{}");
    expect(await getNarrativeCache(9004, "day_read", "2026-07-20")).toBeUndefined();
    expect(await getNarrativeCache(9003, "deep", "2026-07-20")).toBeUndefined();
    expect(await getNarrativeCache(9003, "day_read", "2026-07-21")).toBeUndefined();
  });

  it("a stale held row misses on hash, exactly like a stale database row", async () => {
    await upsertNarrativeCache(9005, "day_read", "2026-07-20", "old-hash", "model-x", "{}");
    const row: any = await getNarrativeCache(9005, "day_read", "2026-07-20");
    // Callers serve only when row.locked || row.inputHash === hash — so a changed input misses.
    expect(row.inputHash).not.toBe("new-hash");
    expect(row.locked).toBe(false);
  });

  it("exposes a count, so a table that is rejecting writes is visible rather than silent", async () => {
    const before = heldNarrativeCount();
    await upsertNarrativeCache(9006, "day_read", "2026-07-20", "hash-d", "model-x", "{}");
    expect(heldNarrativeCount()).toBe(before + 1); // denominator: it actually moved
  });

  it("is bounded — a long outage cannot grow the process without limit", async () => {
    for (let i = 0; i < 120; i++) {
      await upsertNarrativeCache(9100 + i, "day_read", "2026-07-20", `h${i}`, "m", "{}");
    }
    expect(heldNarrativeCount()).toBeLessThanOrEqual(60);
  });
});
