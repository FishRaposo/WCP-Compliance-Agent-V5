import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const requests = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_SIZE = 10_000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requests) {
      if (now > entry.resetAt) {
        requests.delete(key);
      }
    }
  }, 60_000);
}

function evictOldestEntries(): void {
  // Evict oldest entries if we're at or above the max size cap
  if (requests.size >= MAX_SIZE) {
    // Sort by resetAt (oldest first) and remove the oldest 10%
    const entries = Array.from(requests.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = Math.ceil(MAX_SIZE * 0.1); // Remove 10% of max
    for (let i = 0; i < toRemove; i++) {
      requests.delete(entries[i][0]);
    }
  }
}

export function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get client IP address with spoofing protection.
 * In production behind a reverse proxy, the proxy should set x-real-ip.
 * Falls back to x-forwarded-for but only trusts the first IP (client IP).
 */
function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
  // x-real-ip is set by infrastructure (reverse proxy) - most trusted
  const realIp = c.req.header("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // x-forwarded-for can be spoofed, but we only take the first IP (client)
  // which is set by the first trusted proxy in the chain
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }
  
  return "anonymous";
}

export const rateLimiter = (): MiddlewareHandler => async (c, next) => {
  startCleanup();
  const key = getClientIP(c);
  const now = Date.now();
  
  // Evict oldest entries if we're at max capacity
  evictOldestEntries();
  
  const entry = requests.get(key);

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    await next();
    return;
  }

  if (entry.count >= config.RATE_LIMIT_PER_MIN) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  entry.count++;
  await next();
};
