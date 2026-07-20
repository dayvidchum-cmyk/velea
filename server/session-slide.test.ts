import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A SESSION MUST DIE FROM DISUSE, NOT FROM AGE (v811).
 *
 * The TTL was fixed at login and never extended, so a session expired exactly seven days after
 * sign-in no matter how much the person used the app. On day 8 the installed PWA opened on the
 * marketing site — whose "unlisted app" design means there is deliberately no login link anywhere —
 * and the only way back in was knowing to type /login. A daily user was being logged out weekly by
 * a timer that never noticed them.
 *
 * getDb() builds its connection from DATABASE_URL via drizzle, so the database is mocked at that
 * import and the REAL getUserBySessionToken runs against it.
 */

const DAY = 24 * 60 * 60 * 1000;
const calls = { updates: 0, deletes: 0 };
let sessionRow: { token: string; userId: number; expiresAt: Date } | null = null;
let userRow: any = { id: 7, name: "David" };

const selectChain = (rows: any[]) => {
  const c: any = {};
  c.from = () => c; c.where = () => c; c.orderBy = () => c;
  c.limit = () => Promise.resolve(rows);
  return c;
};

let selectCall = 0;
const fakeDb = {
  select: () => {
    // first select = the session, any later select = the user lookup
    selectCall += 1;
    return selectChain(selectCall === 1 ? (sessionRow ? [sessionRow] : []) : (userRow ? [userRow] : []));
  },
  update: () => ({ set: () => ({ where: () => { calls.updates++; return Promise.resolve(); } }) }),
  delete: () => ({ where: () => { calls.deletes++; return Promise.resolve(); } }),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fakeDb }));

describe("session sliding renewal", () => {
  let getUserBySessionToken: any;
  let SESSION_TTL_MS: number;

  beforeEach(async () => {
    vi.resetModules();
    process.env.DATABASE_URL = "mysql://test/test";
    calls.updates = 0; calls.deletes = 0; selectCall = 0; userRow = { id: 7, name: "David" };
    ({ getUserBySessionToken, SESSION_TTL_MS } = await import("./db.js"));
  });

  it("extends a session that is past halfway, and says so", async () => {
    sessionRow = { token: "t", userId: 7, expiresAt: new Date(Date.now() + 2 * DAY) }; // 5 days used
    const res = await getUserBySessionToken("t");
    expect(res?.user?.id).toBe(7);
    expect(res?.slid).toBe(true);
    expect(calls.updates).toBe(1);
  });

  it("does NOT write on every request — a fresh session is left alone", async () => {
    // The denominator: without this, "sliding" would mean a DB write and a Set-Cookie per request.
    sessionRow = { token: "t", userId: 7, expiresAt: new Date(Date.now() + 6 * DAY) };
    const res = await getUserBySessionToken("t");
    expect(res?.slid).toBe(false);
    expect(calls.updates).toBe(0);
  });

  it("still expires a session nobody used", async () => {
    // The whole point of a TTL. Sliding must not become immortality.
    sessionRow = { token: "t", userId: 7, expiresAt: new Date(Date.now() - 1000) };
    const res = await getUserBySessionToken("t");
    expect(res).toBeNull();
    expect(calls.deletes).toBe(1);
    expect(calls.updates).toBe(0);
  });

  it("returns null for a token that does not exist", async () => {
    sessionRow = null;
    expect(await getUserBySessionToken("nope")).toBeNull();
  });

  it("keeps the window at seven days — this changes WHEN it counts from, not how long", () => {
    expect(SESSION_TTL_MS).toBe(7 * DAY);
  });

  it("survives a failed slide rather than dropping a valid session", async () => {
    sessionRow = { token: "t", userId: 7, expiresAt: new Date(Date.now() + 1 * DAY) };
    (fakeDb as any).update = () => ({ set: () => ({ where: () => Promise.reject(new Error("db down")) }) });
    const res = await getUserBySessionToken("t");
    expect(res?.user?.id).toBe(7);   // the user is still signed in
    expect(res?.slid).toBe(false);   // and the caller is told not to re-issue a cookie
    (fakeDb as any).update = () => ({ set: () => ({ where: () => { calls.updates++; return Promise.resolve(); } }) });
  });
});
