import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="container py-16 text-center space-y-4">
      <h1
        className="text-5xl font-bold tracking-wide"
        style={{ color: "var(--foreground)" }}
      >
        404
      </h1>
      <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
        This page doesn't exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-5 py-2.5 rounded-full text-sm font-bold tracking-wide"
        style={{ background: "var(--border)", color: "var(--color-foreground)" }}
      >
        Go Home
      </button>
    </div>
  );
}
