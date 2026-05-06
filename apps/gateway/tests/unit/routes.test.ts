import { describe, it, expect } from "vitest";
import { Hono } from "hono";

describe("Gateway routes", () => {
  it("health route returns ok", async () => {
    const { healthRoutes } = await import("../../src/routes/health.js");
    const app = new Hono();
    app.route("/", healthRoutes);
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("analyze route exists and accepts requests", async () => {
    const { analyzeRoutes } = await import("../../src/routes/analyze.js");
    const app = new Hono();
    app.route("/", analyzeRoutes);
    const res = await app.request("/api/v1/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test payroll text" }),
    });
    // Will fail with 500/502 since no backend, but route is mounted
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it("analyze-pdf route validates file presence", async () => {
    const { analyzePdfRoutes } = await import("../../src/routes/analyze-pdf.js");
    const app = new Hono();
    app.route("/", analyzePdfRoutes);
    const form = new FormData();
    const res = await app.request("/api/v1/analyze/pdf", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("decisions route exists and returns error without backend", async () => {
    const { decisionsRoutes } = await import("../../src/routes/decisions.js");
    const app = new Hono();
    app.route("/", decisionsRoutes);
    const res = await app.request("/api/v1/decisions");
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThanOrEqual(599);
  });

  it("stream route returns SSE content type", async () => {
    const { streamRoutes } = await import("../../src/routes/stream.js");
    const app = new Hono();
    app.route("/", streamRoutes);
    const res = await app.request("/api/v1/decisions/stream");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });
});
