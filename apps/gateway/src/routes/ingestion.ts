import { Hono } from "hono";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const ingestionRoutes = new Hono();

ingestionRoutes.post("/api/v1/ingestion/jobs", async (c) => {
  try {
    const body = await c.req.json();
    const data = await dataPlatformClient.post<unknown>("/internal/ingestion/jobs", body);
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to create ingestion job" }, 500);
  }
});

ingestionRoutes.get("/api/v1/ingestion/jobs/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await dataPlatformClient.get<unknown>(`/internal/ingestion/jobs/${id}`);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch ingestion job" }, 500);
  }
});
