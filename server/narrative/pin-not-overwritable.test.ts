import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A PINNED READING IS NOT OVERWRITABLE (v802).
 *
 * The pin was enforced only by the READ paths refusing to regenerate. upsertNarrativeCache — the
 * last line of defence, and the only code that actually touches the words — never looked at the
 * `locked` flag, so any path that reached generation for a locked row silently replaced prose the
 * user had explicitly kept. A pin exists so the words stop moving; the check belongs at the write.
 *
 * getDb() builds its connection from DATABASE_URL via drizzle, so the whole database is mocked at
 * that import and the REAL upsertNarrativeCache runs against it. Fails against the pre-v802 code,
 * which issued the insert unconditionally.
 */

const calls = { selected: 0, inserted: 0 };
let lockedRow: { locked: boolean } | null = null;

const selectChain = () => {
  const c: any = {};
  c.from = () => c;
  c.where = () => c;
  c.orderBy = () => c;
  c.limit = () => Promise.resolve(lockedRow ? [lockedRow] : []);
  return c;
};

const fakeDb = {
  select: (..._a: any[]) => { calls.selected++; return selectChain(); },
  insert: () => ({
    values: () => ({
      onDuplicateKeyUpdate: () => { calls.inserted++; return Promise.resolve(); },
    }),
  }),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fakeDb }));

describe("upsertNarrativeCache refuses to overwrite a pinned row", () => {
  let upsert: (typeof import("../db.js"))["upsertNarrativeCache"];

  beforeEach(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "mysql://test/test";
    calls.selected = 0;
    calls.inserted = 0;
    lockedRow = null;
    ({ upsertNarrativeCache: upsert } = await import("../db.js"));
  });

  it("writes normally when the row is not locked", async () => {
    lockedRow = { locked: false };
    const ok = await upsert(1, "day_read", "2026-07-20", "hash-a", "model", '{"narrative":"new"}');
    expect(calls.inserted).toBe(1);
    expect(ok).toBe(true);
  });

  it("writes normally when there is no row yet", async () => {
    lockedRow = null;
    const ok = await upsert(1, "day_read", "2026-07-20", "hash-a", "model", '{"narrative":"first"}');
    expect(calls.inserted).toBe(1);
    expect(ok).toBe(true);
  });

  it("DOES NOT write when the row is pinned", async () => {
    lockedRow = { locked: true };
    const ok = await upsert(1, "day_read", "2026-07-20", "hash-b", "model", '{"narrative":"overwrite"}');
    expect(calls.inserted).toBe(0);      // the pinned words are untouched
    expect(ok).toBe(true);               // a row IS present for this key — that is not a failure
  });

  it("looks at the lock before it ever reaches the insert", async () => {
    lockedRow = { locked: true };
    await upsert(1, "day_read", "2026-07-20", "hash-b", "model", "{}");
    expect(calls.selected).toBeGreaterThan(0);
  });

  it("does not park the rejected prose in memory either", async () => {
    // holding it would serve the new words from the in-process cache on the very next read,
    // defeating the pin from the other side.
    lockedRow = { locked: true };
    await upsert(7, "day_read", "2026-07-20", "hash-b", "model", '{"narrative":"held?"}');
    const { getNarrativeCache } = await import("../db.js");
    lockedRow = null; // the table now reports nothing; anything returned came from the held map
    const row: any = await getNarrativeCache(7, "day_read", "2026-07-20");
    expect(row).toBeUndefined();
  });
});
