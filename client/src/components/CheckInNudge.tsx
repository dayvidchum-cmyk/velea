import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Stale-task check-in nudge (in-app stopgap). When a task has been open past ~3 hours and you
 * haven't checked in since you added it, offer a quick current-state check-in — a stalling task
 * is exactly when recalibrating your state helps.
 *
 * Honest limit: in-app, this can only fire when you REOPEN the app (it can't reach you while
 * away). The real "fires off at the 3-hour mark" version is the push-notification build.
 *
 * Respectful: only 8am–10pm, throttled to once every 2h, stands down once you check in, and a
 * dismissed task won't nag again.
 */

const CHECK_KEY = "velea-checkin-nudge-checked";     // last-fired timestamp (throttle)
const DISMISS_KEY = "velea-checkin-nudge-dismissed"; // task id the user said "not now" to
const THROTTLE_MS = 2 * 60 * 60 * 1000;              // at most once every 2h
const STALE_MS = 3 * 60 * 60 * 1000;                 // task open longer than 3h
const ACTIVE_FROM = 8;                               // 8am
const ACTIVE_TO = 22;                                // 10pm (exclusive)

export default function CheckInNudge() {
  const { data: tasks } = trpc.tasks.list.useQuery(undefined, {});
  const { data: checkInToday } = trpc.checkIn.today.useQuery();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !tasks) return;
    const hour = new Date().getHours();
    if (hour < ACTIVE_FROM || hour >= ACTIVE_TO) return; // no off-hours pings
    const last = Number(localStorage.getItem(CHECK_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;

    // The oldest still-open task
    const open = (tasks as any[]).filter((t) => !t.isCompleted && t.createdAt);
    if (!open.length) return;
    const oldest = open.reduce((a, b) =>
      new Date(a.createdAt).getTime() <= new Date(b.createdAt).getTime() ? a : b,
    );
    const createdMs = new Date(oldest.createdAt).getTime();
    const ageMs = Date.now() - createdMs;
    if (ageMs < STALE_MS) return; // not stale enough yet

    // Stand down if you've already checked in SINCE adding that task
    const lastCheckInMs = (checkInToday as any)?.recordedAt
      ? new Date((checkInToday as any).recordedAt).getTime()
      : 0;
    if (lastCheckInMs >= createdMs) return;

    if (localStorage.getItem(DISMISS_KEY) === String(oldest.id)) return; // dismissed for this task

    ran.current = true;
    localStorage.setItem(CHECK_KEY, String(Date.now()));
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    toast(`"${oldest.title}" has been open ${hours} hours.`, {
      description: "Where's your state now? A quick check-in can recalibrate the day.",
      duration: Infinity,
      action: {
        label: "Check in",
        onClick: () => window.dispatchEvent(new Event("velea-open-checkin")),
      },
      cancel: {
        label: "Not now",
        onClick: () => localStorage.setItem(DISMISS_KEY, String(oldest.id)),
      },
    });
  }, [tasks, checkInToday]);

  return null;
}
