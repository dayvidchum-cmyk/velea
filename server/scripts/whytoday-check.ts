/**
 * Verify panchang.whyToday end-to-end against a real profile via a server-side
 * tRPC caller (no HTTP/auth). Usage: npx tsx server/scripts/whytoday-check.ts [userId]
 */
import "dotenv/config";
import { appRouter } from "../routers.js";
import { resolveAstrologySubject } from "../astrology-subject.js";
import { getUserById } from "../db.js";

async function main() {
  const userId = Number(process.argv[2] ?? 2);
  const user = await getUserById(userId);
  const subject = await resolveAstrologySubject(userId);
  if (!user || !subject) throw new Error(`No user/subject for userId ${userId}`);
  console.log(`user=${user.email} profile=${subject.name} lagna=${subject.lagnaSign}`);

  const ctx: any = { user: { id: userId }, subject };
  const caller = appRouter.createCaller(ctx);
  const res = await caller.panchang.whyToday({});
  console.log(JSON.stringify(res, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
