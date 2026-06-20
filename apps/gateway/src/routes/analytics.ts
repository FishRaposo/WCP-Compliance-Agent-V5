import { Hono } from "hono";
import { z } from "zod";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";
import { logUpstreamError } from "../lib/error-log.js";

export const analyticsRoutes = new Hono();

const DaysSchema = z.coerce.number().int().min(1).max(365).catch(30);

analyticsRoutes.get("/api/v1/analytics/overview", async (c) => {
  const days = DaysSchema.parse(c.req.query("days"));
  try {
    const query = new URLSearchParams({ days: String(days) }).toString();
    const data = await dataPlatformClient.get<unknown>(
      `/internal/analytics/overview?${query}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/overview", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/overview", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/volume", async (c) => {
  const days = DaysSchema.parse(c.req.query("days"));
  try {
    const query = new URLSearchParams({ days: String(days) }).toString();
    const data = await dataPlatformClient.get<unknown>(
      `/internal/analytics/volume?${query}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/volume", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/volume", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/approval-by-trade", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/approval-by-trade",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/approval-by-trade", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/approval-by-trade", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/trust-band-distribution", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/trust-band-distribution",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/trust-band-distribution", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/trust-band-distribution", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/cost", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/cost",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/cost", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/cost", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/compliance", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/compliance",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/compliance", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/compliance", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/wages", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/wages",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/wages", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/wages", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/llm", async (c) => {
  try {
    const data = await dataPlatformClient.get<unknown>(
      "/internal/analytics/llm",
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analytics/llm", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analytics/llm", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
