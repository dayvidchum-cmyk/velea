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

const LOCAL_DEV = process.env.LOCAL_DEV === "true";
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
      user = (await db.getUserBySessionToken(sessionToken)) ?? null;
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
