import { TRPCError } from "@trpc/server";
import type { Request } from "express";

const hits = new Map<string, number[]>();

/**
 * In-memory sliding-window limiter keyed by bucket + client IP.
 * NOTE: per-process only (not shared across replicas), resets on restart.
 * Adequate for launch/tester volume; revisit before horizontal scale.
 */
export function rateLimit(
  req: Request,
  bucket: string,
  opts: { max: number; windowMs: number }
): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);
  if (recent.length >= opts.max) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again in a little while.",
    });
  }
  recent.push(now);
  hits.set(key, recent);
}
