import { describe, it, expect, beforeAll } from "vitest";
import type { Hono } from "hono";

/**
 * Regression guard for the auth-coverage bug: Hono matches a non-wildcard `app.use(path)`
 * EXACTLY, so registering auth only on `/api/v1/decisions` left every sub-path
 * (/decisions/:id, /decisions/stream, all /analytics/* and /ingestion/*) unauthenticated.
 * This drives the composed app end-to-end and asserts sub-paths require a token.
 */
describe("gateway auth coverage (protected sub-paths)", () => {
  let app: Hono;

  beforeAll(async () => {
    process.env.WCP_MOCK_AUTH = "false";
    process.env.AUTH_DISABLED = "false";
    app = (await import("../../src/server.js")).default as unknown as Hono;
  });

  it("returns 401 on protected sub-paths when no token is presented", async () => {
    const paths = [
      "/api/v1/decisions/some-id",
      "/api/v1/decisions/stream",
      "/api/v1/analytics/overview",
      "/api/v1/contracts/some-id",
      "/api/v1/ingestion/jobs/some-id",
    ];
    for (const path of paths) {
      const res = await app.request(path);
      expect(res.status, `${path} must require auth`).toBe(401);
    }
  });

  it("still enforces auth on the exact protected paths", async () => {
    const res = await app.request("/api/v1/decisions");
    expect(res.status).toBe(401);
  });
});
