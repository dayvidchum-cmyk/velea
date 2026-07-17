import { APP_VERSION } from "./version";

/**
 * THE STALE-INSTANCE GUARD (2026-07-17 outage postmortem): iOS keeps a PWA's JS alive in
 * memory for DAYS across suspensions. A resumed instance can be many builds behind the
 * server — its old code then calls the new API and crashes or renders quiet surfaces
 * (this looked like a total readings outage; the crash stack named a bundle ~50 builds
 * old). On every return to the foreground, compare our build number against the server's
 * sw.js cache line and reload ONCE if we're behind. Offline or fetch failure = do nothing
 * (never punish a user for being offline); sessionStorage marker prevents reload loops.
 */
const mine = Number(APP_VERSION.split(".")[2] ?? 0);
let checking = false;

async function checkFreshness() {
  if (checking || !Number.isFinite(mine) || mine <= 0) return;
  checking = true;
  try {
    const res = await fetch("/sw.js", { cache: "no-store" });
    if (!res.ok) return;
    const m = (await res.text()).match(/velea-cache-v(\d+)/);
    const server = m ? Number(m[1]) : 0;
    if (server > mine && sessionStorage.getItem("velea-stale-reload") !== String(server)) {
      sessionStorage.setItem("velea-stale-reload", String(server));
      window.location.reload();
    }
  } catch {
    /* offline — the cached shell is the right thing to keep serving */
  } finally {
    checking = false;
  }
}

export function installStaleGuard() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkFreshness();
  });
}
