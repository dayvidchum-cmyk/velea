import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Users() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Redirect if not admin
  if (user && user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const createTestUserMutation = trpc.auth.createTestUser.useMutation();
  const usersList = trpc.auth.listUsers.useQuery(undefined, { enabled: user?.role === "admin" });
  const setRoleMutation = trpc.auth.setUserRole.useMutation({
    onSuccess: () => usersList.refetch(),
    onError: (err: any) => setError(err.message || "Failed to update role"),
  });
  const recomputeMutation = trpc.auth.recomputeUserChart.useMutation({
    onSuccess: () => { setSuccess("Chart recomputed — their reading will load now."); setTimeout(() => setSuccess(""), 3500); },
    onError: (err: any) => setError(err.message || "Failed to recompute chart"),
  });
  const deleteUserMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => { setSuccess("User deleted (with all their data)."); usersList.refetch(); setTimeout(() => setSuccess(""), 3500); },
    onError: (err: any) => setError(err.message || "Failed to delete user"),
  });
  const repairAllMutation = trpc.auth.repairAllCharts.useMutation({
    onSuccess: (r: any) => { setSuccess(`Repaired ${r.repaired} chart${r.repaired === 1 ? "" : "s"} (${r.skipped} already fine${r.failed ? `, ${r.failed} failed` : ""}).`); setTimeout(() => setSuccess(""), 5000); },
    onError: (err: any) => setError(err.message || "Failed to repair charts"),
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await createTestUserMutation.mutateAsync({ email, password, name: name || undefined });
      setSuccess(`Test user created: ${email}`);
      setEmail("");
      setPassword("");
      setName("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">Create test user accounts for testing</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button className="mb-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Test User
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Test User</SheetTitle>
              </SheetHeader>

              <form onSubmit={handleCreateUser} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tester@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={createTestUserMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={createTestUserMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tester Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={createTestUserMutation.isPending}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createTestUserMutation.isPending}>
                  {createTestUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>

          <div className="text-sm text-muted-foreground">
            <p className="mb-4">Share these credentials with testers:</p>
            <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-2">
              <p>Email: [created email]</p>
              <p>Password: [created password]</p>
            </div>
          </div>
        </Card>

        {/* All users — mark testers. Testers (and admins) get Time Master + Hora unlocked. */}
        <Card className="p-6 mt-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-foreground">Users &amp; access</h2>
            <Button
              size="sm"
              variant="outline"
              disabled={repairAllMutation.isPending}
              onClick={() => repairAllMutation.mutate()}
              title="Recompute every chart that's missing its natal bodies — run before sending tester logins"
            >
              {repairAllMutation.isPending ? "Repairing all…" : "Repair all charts"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Testers get Time Master + Hora unlocked. New test users are testers by default. Charts also self-heal on first read.</p>
          {usersList.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (usersList.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No users.</p>
          ) : (
            <div className="divide-y divide-border">
              {(usersList.data ?? []).map((u) => (
                <div key={u.id} className="py-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        color: u.role === "admin" ? "#C9A84C" : u.role === "tester" ? "#178F9E" : "var(--color-muted-foreground)",
                        borderColor: u.role === "admin" ? "#C9A84C" : u.role === "tester" ? "#178F9E" : "var(--color-border)",
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={u.role === "tester" ? "outline" : "default"}
                        disabled={setRoleMutation.isPending}
                        onClick={() => setRoleMutation.mutate({ userId: u.id, role: u.role === "tester" ? "user" : "tester" })}
                      >
                        {u.role === "tester" ? "Remove tester" : "Make tester"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={recomputeMutation.isPending && recomputeMutation.variables?.userId === u.id}
                        onClick={() => recomputeMutation.mutate({ userId: u.id })}
                        title="Recompute this user's chart — fixes a blank/never-loading reading"
                      >
                        {recomputeMutation.isPending && recomputeMutation.variables?.userId === u.id ? "Repairing…" : "Repair chart"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteUserMutation.isPending}
                        onClick={() => { if (window.confirm(`Delete ${u.name || u.email} and ALL their data? This cannot be undone.`)) deleteUserMutation.mutate({ userId: u.id }); }}
                        title="Delete this user and all their data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
