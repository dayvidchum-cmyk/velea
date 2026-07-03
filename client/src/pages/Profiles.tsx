import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  User,
  Plus,
  Check,
  Pencil,
  Trash2,
  ChevronLeft,
  Star,
  Orbit,
  Search,
  Loader2,
  X,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Timezone list ─────────────────────────────────────────────────────────────
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Kathmandu",
  "Asia/Karachi",
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Taipei",
  "Asia/Kuala_Lumpur",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

// ── Profile form ──────────────────────────────────────────────────────────────

interface ProfileFormData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocationCity: string;
  birthLocationLat: string;
  birthLocationLon: string;
  birthTimezone: string;
  notes: string;
}

const EMPTY_FORM: ProfileFormData = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthLocationCity: "",
  birthLocationLat: "",
  birthLocationLon:"",
birthTimezone: "",

  notes: "",
};

interface ProfileFormProps {
  initial?: Partial<ProfileFormData>;
  onSave: (data: ProfileFormData, makeActive: boolean) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
  showMakeActive?: boolean; // only meaningful when another profile exists to switch away from
}

function ProfileForm({ initial, onSave, onCancel, saving, isNew, showMakeActive }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileFormData>({ ...EMPTY_FORM, ...initial });
  const [makeActive, setMakeActive] = useState(isNew ?? false);
  const [geocoding, setGeocoding] = useState(false);
  const utils = trpc.useUtils();

  const set = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleGeocode() {
    const query = form.birthLocationCity.trim();
    if (!query) return;
    setGeocoding(true);
    try {
      // OpenStreetMap Nominatim — free, no key. Rate limit ~1 req/sec; this is a
      // one-shot button press, so we stay well under it. CORS is allowed.
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "1");

      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Geocoder error (${res.status})`);
      const data = await res.json();
      const hit = Array.isArray(data) ? data[0] : null;

      if (!hit) {
        toast.error("Location not found. Try a more specific city name.");
        return;
      }

      const lat = parseFloat(hit.lat).toFixed(6);
      const lon = parseFloat(hit.lon).toFixed(6);
      const shortName =
        typeof hit.display_name === "string"
          ? hit.display_name.split(",").slice(0, 2).join(",").trim()
          : query;

      setForm((f) => ({
        ...f,
        birthLocationLat: lat,
        birthLocationLon: lon,
        birthLocationCity: shortName || f.birthLocationCity,
      }));
      toast.success(`Coordinates found: ${lat}, ${lon}`);

      // Auto-fill the timezone from the resolved coordinates (offline lookup).
      try {
        const { timezone } = await utils.settings.resolveTimezone.fetch({ lat, lon });
        if (timezone) {
          setForm((f) => ({ ...f, birthTimezone: timezone }));
          toast.success(`Timezone set: ${timezone}`, { duration: 1500 });
        }
      } catch {
        // Non-fatal — the user can still pick a timezone manually.
      }
    } catch (err: any) {
      toast.error(err?.message || "Geocoding failed. Check your connection.");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Name <span className="text-destructive">*</span></Label>
        <Input id="pf-name" value={form.name} onChange={set("name")} placeholder="e.g. Mom, Client A, David" />
      </div>

      {/* Birth date + time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-date">Birth Date</Label>
          <Input id="pf-date" type="date" autoComplete="off" value={form.birthDate} onChange={set("birthDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-time">Birth Time</Label>
          <Input id="pf-time" type="time" autoComplete="off" value={form.birthTime} onChange={set("birthTime")} />
        </div>
      </div>

      {/* City + geocode */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-city">Birth City</Label>
        <div className="flex gap-2">
          <Input
            id="pf-city"
            value={form.birthLocationCity}
            onChange={set("birthLocationCity")}
            placeholder="Search for city"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeocode}
            disabled={geocoding || !form.birthLocationCity.trim()}
            className="shrink-0 px-3"
          >
            {geocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span className="ml-1.5 text-xs">Find</span>
          </Button>
        </div>
      </div>

      {/* Lat / Lon */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-lat">Latitude</Label>
          <Input id="pf-lat" value={form.birthLocationLat} onChange={set("birthLocationLat")} placeholder="Latitude" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-lon">Longitude</Label>
          <Input id="pf-lon" value={form.birthLocationLon} onChange={set("birthLocationLon")} placeholder="Longitude" />
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-tz">Timezone</Label>
        <select
          id="pf-tz"
          value={form.birthTimezone}
          onChange={set("birthTimezone")}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {(form.birthTimezone && !COMMON_TIMEZONES.includes(form.birthTimezone)
            ? [form.birthTimezone, ...COMMON_TIMEZONES]
            : COMMON_TIMEZONES
          ).map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-notes">Notes (optional)</Label>
        <textarea
          id="pf-notes"
          value={form.notes}
          onChange={set("notes")}
          placeholder="e.g. Client — focus on career timing"
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Make active toggle — only shown when there's another profile to switch away from.
          With a single profile it's the active one by definition, so the toggle is noise. */}
      {showMakeActive && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setMakeActive((v) => !v)}
            className="w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5"
            style={{ background: makeActive ? "var(--color-primary)" : "var(--color-border)" }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: makeActive ? "translateX(16px)" : "translateX(0)" }}
            />
          </div>
          <span className="text-sm">Set as active profile after saving</span>
        </label>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={() => onSave(form, makeActive)}
          disabled={saving || !form.name.trim()}
          className="flex-1"
        >
          {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
          {form.birthDate ? "Save & Calculate Chart" : "Save Profile"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Create login modal ────────────────────────────────────────────────────────

interface CreateLoginModalProps {
  profile: any;
  onClose: () => void;
  onCreated: () => void;
}

function CreateLoginModal({ profile, onClose, onCreated }: CreateLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const createLoginMutation = trpc.auth.createProfileUser.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createLoginMutation.mutateAsync({ profileId: profile.id, email, password });
      toast.success(`Login created for ${profile.name}`);
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create login");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 0.5)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Set up login</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{profile.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lang@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-xs" style={{ color: "#B15F71" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={createLoginMutation.isPending}>
              {createLoginMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Create Login
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: any;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLoginCreated: () => void;
}

function ProfileCard({ profile, onSelect, onEdit, onDelete, onLoginCreated }: ProfileCardProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const isActive = profile.isActive;
  const isOwner = profile.isOwner;
  const hasLogin = !!profile.linkedUserId;

  return (
    <div
      className="rounded-xl p-4 border transition-all duration-200"
      style={{
        background: isActive ? "var(--filter-pill-bg-active)" : "var(--color-card)",
        borderColor: isActive ? "var(--filter-pill-border-active)" : "var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: isOwner ? "var(--amber-gold, #c9a84c)" : isActive ? "var(--color-primary)" : "var(--color-secondary)",
            color: isOwner ? "#1a1a1a" : isActive ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
          }}
        >
          {isOwner ? <Star size={18} /> : <User size={18} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{profile.name}</span>
            {isOwner && (
              <Badge variant="outline" className="text-[12px] py-0 px-1.5 shrink-0" style={{ borderColor: "var(--amber-gold, #c9a84c)", color: "var(--amber-gold, #c9a84c)" }}>
                My Chart
              </Badge>
            )}
            {isActive && (
              <Badge variant="outline" className="text-[12px] py-0 px-1.5 shrink-0" style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
                Active
              </Badge>
            )}
          </div>
          {profile.birthDate && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
              {profile.birthDate}
              {profile.birthLocationCity ? ` · ${profile.birthLocationCity}` : ""}
            </p>
          )}
          {profile.lagnaSign && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-muted-foreground)" }}>
                <Orbit size={11} />
                Lagna: <span className="font-medium" style={{ color: "var(--color-foreground)" }}>{profile.lagnaSign}</span>
              </span>
            </div>
          )}
          {profile.notes && (
            <p className="text-xs mt-1 italic" style={{ color: "var(--color-muted-foreground)" }}>
              {profile.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelect}
              className="h-8 px-2 text-xs"
              title="Set as active"
            >
              <Check size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2"
            title="Edit"
          >
            <Pencil size={14} />
          </Button>
          {!isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLoginModal(true)}
              className="h-8 px-2"
              title={hasLogin ? "Login active" : "Set up login"}
              style={hasLogin ? { color: "var(--amber-gold, #c9a84c)" } : {}}
            >
              {hasLogin ? <ShieldCheck size={14} /> : <KeyRound size={14} />}
            </Button>
          )}
          {!isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{profile.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the profile and its natal chart data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>

      {/* Login status row */}
      {!isOwner && hasLogin && (
        <div className="mt-2 ml-[52px] flex items-center gap-1.5">
          <ShieldCheck size={11} style={{ color: "var(--amber-gold, #c9a84c)" }} />
          <span className="text-[13px]" style={{ color: "var(--color-muted-foreground)" }}>Login active</span>
        </div>
      )}

      {showLoginModal && (
        <CreateLoginModal
          profile={profile}
          onClose={() => setShowLoginModal(false)}
          onCreated={() => { setShowLoginModal(false); onLoginCreated(); }}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Profiles() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: profileList = [], isLoading } = trpc.profiles.list.useQuery();

  // True for a brand-new user whose profile(s) have no birth date yet.
  const needsBirthData = !isLoading && !profileList.some((p: any) => p.birthDate);

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const createMutation = trpc.profiles.create.useMutation();
  const updateMutation = trpc.profiles.update.useMutation();
  const calculateMutation = trpc.profiles.calculateChart.useMutation();
  const setActiveMutation = trpc.profiles.setActive.useMutation();
  const deleteMutation = trpc.profiles.delete.useMutation();

  async function handleCreate(data: ProfileFormData, makeActive: boolean) {
    if (!data.name.trim()) return;
    setSaving(true);
    try {
      const result = await createMutation.mutateAsync({
        name: data.name,
        birthDate: data.birthDate || undefined,
        birthTime: data.birthTime || undefined,
        birthLocationCity: data.birthLocationCity || undefined,
        birthLocationLat: data.birthLocationLat || undefined,
        birthLocationLon: data.birthLocationLon || undefined,
        birthTimezone: data.birthTimezone || undefined,
        notes: data.notes || undefined,
        makeActive,
      });

      // If birth data is complete, calculate the chart
      if (data.birthDate && data.birthTime && result.id) {
        try {
          await calculateMutation.mutateAsync({
            id: result.id,
            birthDate: data.birthDate,
            birthTime: data.birthTime,
            birthLocationCity: data.birthLocationCity,
            birthLocationLat: data.birthLocationLat || undefined,
            birthLocationLon: data.birthLocationLon || undefined,
            birthTimezone: data.birthTimezone || undefined,
          });
          toast.success(`${data.name} created with birth chart calculated`);
        } catch {
          toast.success(`${data.name} created (chart calculation failed — try editing the profile)`);
        }
      } else {
        toast.success(`${data.name} created`);
      }

      await utils.profiles.list.invalidate();
      await utils.profiles.getActive.invalidate();
      await utils.profiles.getSubject.invalidate();
      if (makeActive) {
        await Promise.all([
          utils.settings.getBirthChart.invalidate(),
          utils.panchang.today.invalidate(),
          utils.panchang.byDate.invalidate(),
          utils.panchang.byMonth.invalidate(),
          utils.panchang.timeLordInfluence.invalidate(),
          utils.dasha.timeline.invalidate(),
          utils.profection.current.invalidate(),
          utils.profection.timeLordTransits.invalidate(),
          utils.timeLordTransit.forDate.invalidate(),
          utils.narrative.deepRead.invalidate(),
          utils.narrative.currentTransits.invalidate(),
          utils.diagnostics.day.invalidate(),
          utils.diagnostics.range.invalidate(),
        ]);
      }
      setMode("list");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: ProfileFormData, makeActive: boolean) {
    if (!editingProfile || !data.name.trim()) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: editingProfile.id,
        name: data.name,
        birthDate: data.birthDate || undefined,
        birthTime: data.birthTime || undefined,
        birthLocationCity: data.birthLocationCity || undefined,
        birthLocationLat: data.birthLocationLat || undefined,
        birthLocationLon: data.birthLocationLon || undefined,
        birthTimezone: data.birthTimezone || undefined,
        notes: data.notes || undefined,
      });

      // Recalculate chart if birth data is present
      if (data.birthDate && data.birthTime) {
        try {
          await calculateMutation.mutateAsync({
            id: editingProfile.id,
            birthDate: data.birthDate,
            birthTime: data.birthTime,
            birthLocationCity: data.birthLocationCity,
            birthLocationLat: data.birthLocationLat || undefined,
            birthLocationLon: data.birthLocationLon || undefined,
            birthTimezone: data.birthTimezone || undefined,
          });
        } catch {
          // Chart calc failed — not fatal
        }
      }

      if (makeActive) {
        await setActiveMutation.mutateAsync({ id: editingProfile.id });
      }

      await Promise.all([
        utils.profiles.list.invalidate(),
        utils.profiles.getActive.invalidate(),
        utils.profiles.getSubject.invalidate(),   // the natal chart reads this — was missing, so edits looked "stuck"
        utils.settings.getBirthChart.invalidate(),
        utils.panchang.today.invalidate(),
        utils.panchang.byDate.invalidate(),
        utils.panchang.byMonth.invalidate(),
        utils.panchang.timeLordInfluence.invalidate(),
        utils.dasha.timeline.invalidate(),
        utils.profection.current.invalidate(),
        utils.profection.timeLordTransits.invalidate(),
        utils.timeLordTransit.forDate.invalidate(),
        utils.narrative.deepRead.invalidate(),
        utils.narrative.currentTransits.invalidate(),
        utils.diagnostics.day.invalidate(),
        utils.diagnostics.range.invalidate(),
      ]);

      toast.success(`${data.name} updated`);
      setMode("list");
      setEditingProfile(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(profileId: number, name: string) {
    try {
      await setActiveMutation.mutateAsync({ id: profileId });
      // Switching the active profile changes the ENTIRE subject — refresh every query
      // (Meridian MC+IC, Master Mode, Celestial, panchang, dasha, tasks…) so nothing
      // keeps showing the previous profile's chart.
      await utils.invalidate();
      toast.success(`Switched to ${name}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to switch profile");
    }
  }

  async function handleDelete(profileId: number, name: string) {
    try {
      await deleteMutation.mutateAsync({ id: profileId });
      await utils.profiles.list.invalidate();
      await utils.profiles.getActive.invalidate();
      toast.success(`${name} deleted`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete profile");
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="container py-6 space-y-5">
        <AppHeader pageTitle={mode === "create" ? "New Profile" : mode === "edit" ? "Edit Profile" : isAdmin ? "Profiles" : "Your Profile"} />

        {mode === "list" && needsBirthData && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background: "color-mix(in srgb, #C9A84C 14%, var(--color-card))",
              border: "1px solid color-mix(in srgb, #C9A84C 45%, transparent)",
            }}
          >
            <Star size={18} style={{ color: "#C9A84C", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                Add your birth details to get started
              </p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--color-muted-foreground)" }}>
                Velea reads your chart from your birth date, time, and place. Tap your profile below to add them.
              </p>
            </div>
          </div>
        )}

        {mode === "list" && isAdmin && (
          <div className="flex justify-end -mt-2 mb-2">
            <Button size="sm" className="h-8 px-3 text-xs" onClick={() => setMode("create")}>
              <Plus size={14} className="mr-1" />
              New
            </Button>
          </div>
        )}
        <div>
        {/* Create form */}
        {mode === "create" && (
          <ProfileForm
            isNew
            showMakeActive={profileList.length >= 1}
            onSave={handleCreate}
            onCancel={() => setMode("list")}
            saving={saving}
          />
        )}

        {/* Edit form */}
        {mode === "edit" && editingProfile && (
          <ProfileForm
            initial={{
              name: editingProfile.name ?? "",
              birthDate: editingProfile.birthDate ?? "",
              birthTime: editingProfile.birthTime ?? "",
              birthLocationCity: editingProfile.birthLocationCity ?? "",
              birthLocationLat: editingProfile.birthLocationLat ?? "",
              birthLocationLon: editingProfile.birthLocationLon ?? "",
              birthTimezone: editingProfile.birthTimezone ?? "",
              notes: editingProfile.notes ?? "",
            }}
            showMakeActive={profileList.length > 1}
            onSave={handleEdit}
            onCancel={() => { setMode("list"); setEditingProfile(null); }}
            saving={saving}
          />
        )}

        {/* Profile list */}
        {mode === "list" && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            )}

            {!isLoading && profileList.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "var(--color-secondary)" }}
                >
                  <User size={24} style={{ color: "var(--color-muted-foreground)" }} />
                </div>
                <p className="font-medium">No profiles yet</p>
                <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                  Create profiles for yourself, family members, or clients.
                </p>
                <Button onClick={() => setMode("create")} className="mt-2">
                  <Plus size={14} className="mr-1.5" />
                  Create First Profile
                </Button>
              </div>
            )}

            {!isLoading && profileList.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide pb-1" style={{ color: "var(--color-muted-foreground)" }}>
                  {profileList.length} {profileList.length === 1 ? "profile" : "profiles"}
                </p>
                {profileList.map((profile: any) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onSelect={() => handleSetActive(profile.id, profile.name)}
                    onEdit={() => { setEditingProfile(profile); setMode("edit"); }}
                    onDelete={() => handleDelete(profile.id, profile.name)}
                    onLoginCreated={() => utils.profiles.list.invalidate()}
                  />
                ))}

                {isAdmin && (
                  <div className="pt-2 pb-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setMode("create")}
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add Profile
                    </Button>
                  </div>
                )}

                {isAdmin && (
                  <div
                    className="rounded-xl p-4 text-sm space-y-1"
                    style={{ background: "var(--color-secondary)", color: "var(--color-muted-foreground)" }}
                  >
                    <p className="font-medium" style={{ color: "var(--color-foreground)" }}>How profiles work</p>
                    <p>Tap the <Check size={12} className="inline" /> button on any profile to make it active. All calculations — Today, Planner, Dasha, Profection — will immediately update to that person's chart.</p>
                    <p className="pt-1">The active profile is shown with a highlighted border and an "Active" badge.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
