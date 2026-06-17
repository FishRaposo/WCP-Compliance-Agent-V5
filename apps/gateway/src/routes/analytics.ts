import { Hono } from "hono";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";

export const analyticsRoutes = new Hono();

analyticsRoutes.get("/api/v1/analytics/overview", async (c) => {
  const days = c.req.query("days") ?? "30";
  try {
    const data = await dataPlatformClient.get<unknown>(
      `/internal/analytics/overview?days=${days}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch analytics overview" }, 500);
  }
});

analyticsRoutes.get("/api/v1/analytics/volume", async (c) => {
  const days = c.req.query("days") ?? "30";
  try {
    const data = await dataPlatformClient.get<unknown>(
      `/internal/analytics/volume?days=${days}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch decision volume" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch approval by trade" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch trust band distribution" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch cost analytics" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch compliance analytics" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch wage analytics" }, 500);
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
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch LLM analytics" }, 500);
  }
});
