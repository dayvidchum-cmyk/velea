import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * ProfilePicker — pick which stored profile loads as the displayed Velea. Lives under Settings
 * (replaced the floating profile FAB). Tapping a profile makes it the ACTIVE profile server-side
 * and invalidates the whole cache so the entire app re-reads for that chart.
 */
export default function ProfilePicker() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [switching, setSwitching] = useState<number | null>(null);
  const { data: profileList = [] } = trpc.profiles.list.useQuery(undefined, { enabled: isAdmin });
  const setActive = trpc.profiles.setActive.useMutation();

  if (!isAdmin || profileList.length === 0) return null;

  async function switchTo(id: number, name: string) {
    if (switching !== null) return;
    setSwitching(id);
    try {
      await setActive.mutateAsync({ id });
      // Every query derives its subject from the server-side ACTIVE profile, so switching
      // profiles doesn't change any query key — invalidate the ENTIRE cache to avoid leaks.
      await utils.invalidate();
      toast.success(`Now showing ${name}`);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to switch profile");
    } finally {
      setSwitching(null);
    }
  }

  const sorted = [...profileList].sort((a: any, b: any) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));

  return (
    <div className="py-3">
      <div className="flex flex-col gap-1.5">
        {sorted.map((profile: any) => {
          const isActive = profile.isActive;
          const isLoading = switching === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => !isActive && switchTo(profile.id, profile.name)}
              disabled={isActive || isLoading}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{
                background: isActive ? "color-mix(in srgb, var(--color-primary) 15%, transparent)" : "var(--color-secondary)",
                border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                cursor: isActive ? "default" : "pointer",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{
                  background: isActive ? "var(--color-primary)" : "var(--color-card)",
                  color: isActive ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                }}
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : profile.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--color-foreground)" }}>
                  {profile.name}
                  {profile.isOwner && <span className="ml-1.5 text-xs" style={{ color: "var(--amber-gold)" }}>★ My Chart</span>}
                </p>
                {profile.lagnaSign && (
                  <p className="text-xs truncate" style={{ color: "var(--color-muted-foreground)" }}>{profile.lagnaSign} lagna</p>
                )}
              </div>
              {isActive ? (
                <span className="text-xs font-bold uppercase" style={{ color: "var(--color-primary)", letterSpacing: "0.05em" }}>Showing</span>
              ) : (
                <ChevronRight size={16} style={{ color: "var(--color-muted-foreground)" }} />
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate("/profiles")}
        className="w-full mt-2.5 text-sm font-semibold py-2.5 rounded-lg transition-colors"
        style={{ background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }}
      >
        Add or edit profiles
      </button>
    </div>
  );
}
