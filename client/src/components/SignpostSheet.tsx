import { X } from "lucide-react";
import { inkOf } from "@/lib/ink";
import LockedRead from "@/components/LockedRead";
import VeleaLoader from "@/components/VeleaLoader";
import { trpc } from "@/lib/trpc";
import GlossaryText from "@/components/GlossaryText";
import { MODE_OKLCH, MODE_SOLID, type TaskMode } from "../../../shared/types";

/**
 * THE CAST (labeled "The Cast"; was "The Read") — the cast behind the hero day-story.
 *
 * The story on the hero says WHAT today is; this says WHO is making it that way. The planets as
 * a cast on a stage: the LOUD ones (foreground — the 2–4 pulling the scene, each with its live
 * condition AND the lesson it points to) over THE CHAPTER (background — the natal Moon, the Sun,
 * the Time Lord and the dasha lords, the standing scenery the day plays on). PG-playful, pure
 * prose, glossary-linked. Generated lazily — the cast read fires only when this sheet opens.
 */

interface SignpostSheetProps {
  open: boolean;
  onClose: () => void;
  /** Day mode — drives the accent color. */
  mode?: TaskMode;
  /** Whose chart + which day the cast is read for. */
  profileId?: number;
  date?: string;
}

export default function SignpostSheet({ open, onClose, mode, profileId, date }: SignpostSheetProps) {
  const accent = mode ? MODE_OKLCH[mode] : "var(--color-foreground)";
  const accentSolid = mode ? MODE_SOLID[mode] : MODE_SOLID.Build;

  // Lazy: only fires while the sheet is open. Server-caches per (profile, date) — reopening is free.
  const { data, isFetching } = trpc.narrative.cast.useQuery(
    { profileId: profileId as number, date: date as string },
    { enabled: open && !!profileId, staleTime: 1000 * 60 * 30 },
  );
  const cast = (data as any)?.cast ?? null;

  if (!open) return null;

  return (
    /* Centered floating modal — sits in the middle of the screen (was a bottom-anchored sheet
       jammed against the nav bar). Tap the dimmed backdrop to close; the card stops propagation. */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)", padding: "1.25rem" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl flex flex-col"
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "82vh",
          overflow: "hidden",
          background: "var(--color-card)",
          border: "1px solid oklch(0 0 0 / 0.14)",
          boxShadow: "0 24px 70px oklch(0 0 0 / 0.45)",
          animation: "popIn 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes popIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="text-base tracking-wide" style={{ color: "var(--color-foreground)", fontWeight: 300, letterSpacing: "0.04em" }}>
              The Cast
            </h2>
            <p className="text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>
              Who&rsquo;s moving your story today
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: `color-mix(in oklch, ${accent} 20%, transparent)`, color: inkOf(accentSolid, 4.5, 20), border: `1px solid color-mix(in oklch, ${accent} 35%, transparent)` }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {(isFetching && !cast) ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--color-border)", opacity: 0.4 }} />
              ))}
              <VeleaLoader size={24} label="Calling the cast together — this can take up to a minute the first time…" />
            </div>
          ) : (data as any)?.locked ? (
            // guardedDate locks dates outside the free window; without this the gate read as
            // "check back in a moment" for something checking back can never open.
            <LockedRead accent="#B08D2E" title="Beyond your window" body="The cast reads for today and the days close to it. Reaching further is the pick-a-date reading." feature="pick-a-date" />
          ) : !cast?.read ? (
            <p className="text-[13px]" style={{ color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
              The cast isn&rsquo;t available right now. Check back in a moment.
            </p>
          ) : (
            /* One PG-playful paragraph — the characters moving today. Not sectioned by design. */
            <p className="text-[15px]" style={{ color: "var(--color-foreground)", lineHeight: 1.62 }}>
              <GlossaryText>{cast.read}</GlossaryText>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
