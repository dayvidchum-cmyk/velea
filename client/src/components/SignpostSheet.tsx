import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import GlossaryText from "@/components/GlossaryText";
import { MODE_OKLCH, MODE_SOLID, type TaskMode } from "../../../shared/types";

/**
 * THE READ — the cast behind the hero day-story.
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          bottom: "72px",
          background: "var(--color-card)",
          border: "1px solid oklch(0 0 0 / 0.12)",
          borderBottom: "none",
          maxWidth: "480px",
          margin: "0 auto",
          maxHeight: "640px",
          animation: "slideUp 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="text-base tracking-wide" style={{ color: "var(--color-foreground)", fontWeight: 300, letterSpacing: "0.04em" }}>
              The Read
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
            style={{ background: `color-mix(in oklch, ${accent} 20%, transparent)`, color: accentSolid, border: `1px solid color-mix(in oklch, ${accent} 35%, transparent)` }}
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
              <p className="text-[12px] text-center pt-1" style={{ color: "var(--color-muted-foreground)" }}>
                Calling the cast together — this can take up to a minute the first time…
              </p>
            </div>
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
    </>
  );
}
