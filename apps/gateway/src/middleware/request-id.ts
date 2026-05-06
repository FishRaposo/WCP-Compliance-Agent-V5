import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const existing = c.req.header("x-request-id");
  const requestId = existing || randomUUID();
  c.header("x-request-id", requestId);
  c.set("requestId", requestId);
  await next();
};
