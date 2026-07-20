// Local-friendly context.
// Reads the simple userId cookie set by auth.login (no Manus OAuth required).
// LOCAL_DEV mode still supported as a backdoor if needed.

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import type { AstrologySubject } from "../astrology-subject";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  subject: AstrologySubject | null;
};

// LOCAL_DEV bypasses auth entirely (one hardcoded user). It is force-disabled in
// production so a stray env var can never open the backdoor on a live deploy.
const LOCAL_DEV =
  process.env.LOCAL_DEV === "true" && process.env.NODE_ENV !== "production";
const LOCAL_USER_OPEN_ID = process.env.LOCAL_USER_OPEN_ID || "local-dev-user";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (LOCAL_DEV) {
    // Backdoor: skip login entirely, use a hardcoded local user
    user = (await db.getUserByOpenId(LOCAL_USER_OPEN_ID)) ?? null;
    if (!user) {
      await db.upsertUser({
        openId: LOCAL_USER_OPEN_ID,
        name: "Local Dev User",
        email: "local@dev.local",
        loginMethod: "local",
        lastSignedIn: new Date(),
      });
      user = (await db.getUserByOpenId(LOCAL_USER_OPEN_ID)) ?? null;
    }
  } else {
    // Read the random session token set by auth.login and resolve it to a user.
    // The cookie never contains the raw user id, so it can't be forged.
    const cookieHeader = opts.req.headers.cookie ?? "";
    const cookies = parseCookie(cookieHeader);
    const sessionToken = cookies[COOKIE_NAME];
    if (sessionToken) {
      const resolved = await db.getUserBySessionToken(sessionToken);
      user = resolved?.user ?? null;
      // SLIDING RENEWAL (v811): the row's expiry just moved, so the COOKIE has to move with it —
      // sliding the session alone would still leave the browser dropping the cookie on day 7 and
      // logging out a daily user. Re-issued only when the row actually slid (past halfway), so an
      // active session costs one Set-Cookie a day rather than one per request.
      if (resolved?.slid) {
        try {
          const { getSessionCookieOptions } = await import("./cookies.js");
          opts.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(opts.req), maxAge: db.SESSION_TTL_MS });
        } catch { /* a cookie we could not refresh is not worth losing the request over */ }
      }
    }
  }

  let subject: AstrologySubject | null = null;
  if (user) {
    try {
      const { resolveAstrologySubject } = await import("../astrology-subject.js");
      subject = await resolveAstrologySubject(user.id);
    } catch {
      subject = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    subject,
  };
}
