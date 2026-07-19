import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import ManifestoIntro from "./ManifestoIntro";
import BrandSplash from "./BrandSplash";
import WelcomeScreen from "./WelcomeScreen";
import FirstRunWelcome from "./FirstRunWelcome";
import MorningBellNudge from "./MorningBellNudge";
import VeleaLoader from "./VeleaLoader";
import { startTour } from "./Onboarding";

/**
 * OVERLAY SEQUENCER — the ONE owner of every automatically-shown overlay (David, 2026-07-18:
 * "stop with the damn bandaids"). Before this, eleven surfaces each decided for themselves and
 * piled up. Now exactly one thing can be on screen, in this order, and nothing else may
 * self-fire:
 *
 *   Fresh login (velea_splash flag):
 *     veil (black + mark, while state loads) → manifesto (3 beats, once ever)
 *     → etymology splash → capture (birth data + current location, once ever) → app.
 *   Ordinary open (no flag): sunset greeting (sync-decided — no Today flash) → app.
 *   After the app is revealed: at most ONE nudge per session, only when idle
 *   (missing-location, else the Morning Bell), and only for onboarded accounts.
 *
 * The old fresh-signup path (App redirected "/" → /profiles and DISABLED the beats for
 * accounts without birth data — the "3 birth data cards" war) is dead: the capture card now
 * takes birth data inline, so a brand-new account completes everything inside the beats.
 */
export default function OverlaySequencer() {
  const { user } = useAuth();
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const tourState = trpc.settings.getTourState.useQuery(undefined, { enabled: !!user, staleTime: 60_000 });
  // The capture writes to the ACTIVE profile if one is set, else the OWNER ("My Chart") —
  // a brand-new account has an owner profile but nothing active, so getActive alone is null.
  const profileList = trpc.profiles.list.useQuery(undefined, { enabled: !!user, staleTime: 60_000 });
  const captureProfile = (profileList.data as any[] | undefined)?.find((p) => p.isActive) ?? (profileList.data as any[] | undefined)?.find((p) => p.isOwner) ?? null;
  const locationData = trpc.settings.getLocation.useQuery(undefined, { enabled: !!user, staleTime: 60_000 });
  const markSeen = trpc.settings.markTourSeen.useMutation({ onSuccess: () => utils.settings.getTourState.invalidate() });
  // Correct by construction: the capture beat NEEDS an owner profile, so if the list comes back
  // empty (a brand-new account whose list query raced profile creation), ensure it ourselves
  // (idempotent) and refetch — never depend on some other component's mutation timing.
  const ensureOwner = trpc.profiles.ensureOwnerProfile.useMutation({ onSuccess: () => utils.profiles.list.invalidate() });
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (!user || !profileList.isSuccess || (profileList.data as any[]).length > 0 || ensuredRef.current) return;
    ensuredRef.current = true;
    ensureOwner.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileList.isSuccess, profileList.data]);
  const completeWelcome = trpc.settings.completeWelcome.useMutation({ onSuccess: () => utils.settings.getTourState.invalidate() });

  // Per-load beat progress (server "seen" flags are the durable truth; these bridge mutation latency).
  const [manifestoDone, setManifestoDone] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [captureDone, setCaptureDone] = useState(false);
  const [veilTimedOut, setVeilTimedOut] = useState(false);
  // Sunset greeting: decided SYNCHRONOUSLY at first paint from device hints so Today can never
  // flash first. Hint = manifesto-seen (written below once tourState confirms it).
  const [greeting, setGreeting] = useState<"pending" | "showing" | "done">(() => {
    try {
      const authed = !!JSON.parse(localStorage.getItem("manus-runtime-user-info") || "null");
      const onboarded = localStorage.getItem("velea-onboarded") === "1";
      const freshLogin = sessionStorage.getItem("velea_splash") === "1";
      return authed && onboarded && !freshLogin ? "showing" : "done";
    } catch { return "done"; }
  });

  const seen = tourState.data?.seen ?? null;
  const freshLoginPending = (() => { try { return sessionStorage.getItem("velea_splash") === "1"; } catch { return false; } })();

  // Keep the device hint honest; fold the greeting away if the session actually expired.
  useEffect(() => {
    if (!seen) return;
    try {
      if (seen.includes("manifesto")) localStorage.setItem("velea-onboarded", "1");
      else localStorage.removeItem("velea-onboarded");
    } catch { /* ignore */ }
  }, [seen]);
  useEffect(() => {
    if (user === null && greeting === "showing") setGreeting("done");
  }, [user, greeting]);

  // Veil safety: a hung fetch may never hold the gate.
  const veilVisible = !!user && freshLoginPending && !seen && !veilTimedOut;
  useEffect(() => {
    if (!veilVisible) return;
    const t = setTimeout(() => setVeilTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [veilVisible]);

  // ── Nudge slot: at most one per session, only when idle, only post-onboarding ──
  const [nudge, setNudge] = useState<"none" | "location" | "bell">("none");
  const idle = !!user && !!seen && seen.includes("manifesto") && (captureDone || seen.includes("welcome")) && greeting !== "showing" && !freshLoginPending;
  const nudgeArmed = useRef(false);
  useEffect(() => {
    if (!idle || nudge !== "none" || nudgeArmed.current) return;
    try { if (sessionStorage.getItem("velea-nudged") || sessionStorage.getItem("velea-firstrun-session")) return; } catch { /* ignore */ }
    nudgeArmed.current = true;
    const t = setTimeout(() => {
      if (document.querySelector("[data-velea-welcome], [data-velea-overlay]")) return;
      try { sessionStorage.setItem("velea-nudged", "1"); } catch { /* ignore */ }
      const noLocation = locationData.data && !(locationData.data as any).lat;
      if (noLocation) {
        window.dispatchEvent(new CustomEvent("velea-open-location", { detail: { reason: "missing" } }));
      } else {
        setNudge("bell"); // MorningBellNudge applies its own 3rd-open + push-support rules
      }
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idle, nudge, locationData.data]);

  // ── Beat resolution (exactly one surface below renders) ──
  if (!user) return null;

  if (greeting === "showing") {
    return <WelcomeScreen firstName={user.name?.split(" ")[0] ?? null} onDone={() => setGreeting("done")} />;
  }

  if (veilVisible) {
    return (
      <div data-velea-overlay className="fixed inset-0 z-[125] flex items-center justify-center" style={{ background: "#000" }}>
        <VeleaLoader size={30} />
      </div>
    );
  }
  if (!seen || location !== "/") return nudge === "bell" ? <MorningBellNudge /> : null;

  if (!seen.includes("manifesto") && !manifestoDone) {
    try { sessionStorage.setItem("velea-firstrun-session", "1"); } catch { /* ignore */ }
    return <ManifestoIntro onBegin={() => { setManifestoDone(true); markSeen.mutate({ key: "manifesto" }); }} />;
  }

  if (freshLoginPending && !splashDone && !seen.includes("welcome")) {
    return <BrandSplash onDone={() => { try { sessionStorage.removeItem("velea_splash"); } catch { /* ignore */ } setSplashDone(true); }} />;
  }
  // Returning users' fresh login: consume the flag and play the splash once, alone.
  if (freshLoginPending && !splashDone && seen.includes("welcome")) {
    return <BrandSplash onDone={() => { try { sessionStorage.removeItem("velea_splash"); } catch { /* ignore */ } setSplashDone(true); }} />;
  }

  if (!seen.includes("welcome") && !captureDone) {
    const done = (tour: boolean) => {
      setCaptureDone(true);
      completeWelcome.mutate({ toursEnabled: tour }); // ONE atomic write — no seen[]-clobber race
      if (tour) startTour();
    };
    return (
      <FirstRunWelcome
        profile={captureProfile}
        locationSet={!!(locationData.data as any)?.city}
        locationLabel={(locationData.data as any)?.city ?? null}
        onTakeTour={() => done(true)}
        onExplore={() => done(false)}
        onDismiss={() => done(false)}
      />
    );
  }

  return nudge === "bell" ? <MorningBellNudge /> : null;
}
