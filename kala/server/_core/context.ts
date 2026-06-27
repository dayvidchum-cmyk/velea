import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { AstrologySubject } from "../astrology-subject";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Resolved once per request — the active profile (or owner profile). Null if no birth data. */
  subject: AstrologySubject | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Resolve the active astrology subject once per request.
  // This is the single source of truth for "whose chart are we using?"
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
