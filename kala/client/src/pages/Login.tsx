import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginMutation = trpc.auth.login.useMutation();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
      setLocation("/");
    } catch {
      setError("Those credentials don't match.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <h1
            style={{
              fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 10vw, 3.5rem)",
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
              lineHeight: 1,
            }}
          >
            Kala
          </h1>
          <p
            style={{
              fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
              fontWeight: 400,
              fontSize: "1.05rem",
              color: "var(--muted-foreground)",
              marginTop: "0.5rem",
              letterSpacing: "0.01em",
            }}
          >
            Welcome back.
          </p>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase"
              style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                caretColor: "var(--amber-gold)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--amber-gold)";
                e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--amber-gold) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase"
              style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                caretColor: "var(--amber-gold)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--amber-gold)";
                e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--amber-gold) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          {/* Error */}
          {error && (
            <p className="text-xs" style={{ color: "#B15F71" }}>
              {error}
            </p>
          )}
          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-3.5 text-sm font-semibold uppercase transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "var(--foreground)",
              color: "var(--background)",
              letterSpacing: "0.06em",
              marginTop: "0.5rem",
            }}
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {/* Footer note */}
        <p
          className="text-center text-xs mt-8"
          style={{ color: "var(--muted-foreground)" }}
        >
          Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
