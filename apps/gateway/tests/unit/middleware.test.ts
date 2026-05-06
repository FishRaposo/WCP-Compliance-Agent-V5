import { describe, it, expect } from "vitest";
import { Hono } from "hono";

describe("Gateway middleware", () => {
  describe("request-id", () => {
    it("attaches x-request-id header to responses", async () => {
      const { requestIdMiddleware } = await import("../../src/middleware/request-id.js");
      const app = new Hono();
      app.use("*", requestIdMiddleware);
      app.get("/test", (c) => c.text("ok"));
      const res = await app.request("/test");
      expect(res.headers.get("x-request-id")).toBeTruthy();
      expect(res.status).toBe(200);
    });

    it("uses existing x-request-id from request", async () => {
      const { requestIdMiddleware } = await import("../../src/middleware/request-id.js");
      const app = new Hono();
      app.use("*", requestIdMiddleware);
      app.get("/test", (c) => {
        const id = c.get("requestId");
        return c.json({ requestId: id });
      });
      const existingId = "existing-req-id-123";
      const res = await app.request("/test", { headers: { "x-request-id": existingId } });
      const body = await res.json();
      expect(body.requestId).toBe(existingId);
    });

    it("generates UUID when no x-request-id provided", async () => {
      const { requestIdMiddleware } = await import("../../src/middleware/request-id.js");
      const app = new Hono();
      app.use("*", requestIdMiddleware);
      app.get("/test", (c) => {
        const id = c.get("requestId");
        return c.json({ requestId: id });
      });
      const res = await app.request("/test");
      const body = await res.json();
      expect(body.requestId).toBeTruthy();
      expect(body.requestId.length).toBeGreaterThan(10);
    });
  });

  describe("cors", () => {
    it("cors middleware is defined", async () => {
      const { corsMiddleware } = await import("../../src/middleware/cors.js");
      expect(corsMiddleware).toBeDefined();
    });
  });
});
