import { Hono } from "hono";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const analyticsRoutes = new Hono();

analyticsRoutes.get("/api/v1/analytics/overview", async (c) => {
  const days = c.req.query("days") ?? "30";
  try {
    const data = await dataPlatformClient.get<unknown>(`/internal/analytics/overview?days=${days}`);
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
    const data = await dataPlatformClient.get<unknown>(`/internal/analytics/volume?days=${days}`);
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
    const data = await dataPlatformClient.get<unknown>("/internal/analytics/approval-by-trade");
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
    const data = await dataPlatformClient.get<unknown>("/internal/analytics/trust-band-distribution");
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
    const data = await dataPlatformClient.get<unknown>("/internal/analytics/cost");
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch cost analytics" }, 500);
  }
});
