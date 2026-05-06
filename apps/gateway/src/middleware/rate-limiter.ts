import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const requests = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;

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

export function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export const rateLimiter = (): MiddlewareHandler => async (c, next) => {
  startCleanup();
  const key = c.req.header("x-forwarded-for") ?? "anonymous";
  const now = Date.now();
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
