import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
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
 *
 * Proxy-set headers (x-real-ip / x-forwarded-for) are honored ONLY when a
 * trusted proxy is configured (TRUSTED_PROXY === "true"). Without that, the
 * headers are attacker-controlled and are ignored entirely in favor of the
 * real socket remote address, so clients can't spoof their rate-limit key.
 *
 * When trusted, x-real-ip wins; otherwise the LAST comma-separated value of
 * x-forwarded-for is used — the leftmost entry is the (untrusted) client, and
 * the rightmost is the value appended by our own trusted proxy.
 */
function getClientIP(c: Context): string {
  if (config.TRUSTED_PROXY === "true") {
    // x-real-ip is set by our trusted reverse proxy - most reliable
    const realIp = c.req.header("x-real-ip")?.trim();
    if (realIp) {
      return realIp;
    }

    const forwardedFor = c.req.header("x-forwarded-for");
    if (forwardedFor) {
      const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
      const lastIp = parts[parts.length - 1];
      if (lastIp) {
        return lastIp;
      }
    }
  }

  // No trusted proxy (or headers absent): use the real socket address, which
  // cannot be spoofed by the client. getConnInfo can throw when there's no
  // underlying Node socket (e.g. unit tests using Hono's app.request()).
  try {
    const socketAddress = getConnInfo(c).remote.address;
    if (socketAddress) {
      return socketAddress;
    }
  } catch {
    // fall through to the anonymous bucket
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
