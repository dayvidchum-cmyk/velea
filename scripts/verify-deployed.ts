/**
 * DID IT ACTUALLY DEPLOY? (v830)
 *
 * On 2026-07-20 production sat frozen at v813 for FIFTEEN versions while thirty commit messages
 * said "deployed". The cause was a typecheck gate added to `npm run build`: nixpacks runs that
 * script, `typescript` is a devDependency, and a production install has no tsc — so every build
 * failed and every push went nowhere. Removing the gate unfroze it immediately, which is what
 * proved the cause.
 *
 * The real failure was not the gate. It was that "pushed" and "deployed" were the same word to me
 * for a whole day. This makes them different words: it asks the SERVER what it is running.
 *
 *   npx tsx scripts/verify-deployed.ts          → compare live sw.js to local APP_VERSION
 *   npx tsx scripts/verify-deployed.ts --wait   → poll until they match (or time out)
 */
const SITE = process.env.VELEA_SITE ?? "https://velealor.com";
const TIMEOUT_MS = 8 * 60 * 1000;

async function liveVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${SITE}/sw.js`, { cache: "no-store" as any });
    if (!res.ok) return null;
    const m = /const CACHE = "velea-cache-(v[\d.]+)"/.exec(await res.text());
    return m?.[1] ?? null;
  } catch { return null; }
}

/** A version number proves the BUILD shipped. It does not prove the FIX did. This asks the live API
 *  a question only the corrected code answers right — the house→mode map whose stale private copy
 *  was deleted in v810 while a public endpoint was still serving it (3 Build / 5 Selective / 9 Flex
 *  instead of 3 Selective / 5 Build / 9 Action). Cheap, unauthenticated, and it fails loudly if a
 *  deploy ever rolls back to the old table. */
async function verifyLiveFix(): Promise<boolean> {
  try {
    const res = await fetch(`${SITE}/api/trpc/diagnostics.config`, { cache: "no-store" as any });
    if (!res.ok) { console.error(`  live-fix check: HTTP ${res.status} from diagnostics.config`); return false; }
    const body: any = await res.json();
    const data = body?.result?.data?.json ?? body?.result?.data;
    const map = data?.houseToBaseMode;
    if (!map) { console.error("  live-fix check: no houseToBaseMode in the response"); return false; }
    const expected: Record<string, string> = { "3": "Selective", "5": "Build", "9": "Action" };
    const wrong = Object.entries(expected).filter(([h, v]) => map[h] !== v);
    if (wrong.length) {
      console.error(`  live-fix check FAILED — houses ${wrong.map(([h]) => h).join(", ")} are serving the STALE map:`);
      for (const [h, v] of wrong) console.error(`    house ${h}: live "${map[h]}", corrected "${v}"`);
      return false;
    }
    console.log("  live-fix check: the corrected house→mode map is being served (3 Selective / 5 Build / 9 Action).");
    return true;
  } catch (e: any) {
    console.error("  live-fix check: could not reach the API —", e?.message ?? e);
    return false;
  }
}

async function main() {
  const { APP_VERSION } = await import("../client/src/lib/version.js");
  const expected = "v" + String(APP_VERSION).split(".").pop();
  const wait = process.argv.includes("--wait");
  const started = Date.now();

  for (;;) {
    const live = await liveVersion();
    if (live === expected) {
      console.log(`DEPLOYED — ${SITE} is serving ${live}, matching APP_VERSION ${APP_VERSION}.`);
      // The version says the BUILD landed. This says a FIX landed with it.
      const fixOk = await verifyLiveFix();
      process.exit(fixOk ? 0 : 1);
    }
    const detail = live ? `serving ${live}, expected ${expected}` : `no version readable from ${SITE}/sw.js`;
    if (!wait) {
      console.error(`NOT DEPLOYED — ${detail}.`);
      console.error("Pushed is not deployed. Check the Railway build log before reporting this as shipped.");
      process.exit(1);
    }
    if (Date.now() - started > TIMEOUT_MS) {
      console.error(`TIMED OUT after ${Math.round((Date.now() - started) / 60000)}m — ${detail}.`);
      process.exit(1);
    }
    console.log(`waiting… ${detail}`);
    await new Promise((r) => setTimeout(r, 20_000));
  }
}
main();
