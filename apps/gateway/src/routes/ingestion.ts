import { Hono } from "hono";
import { z } from "zod";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { requireRole } from "../middleware/rbac.js";

export const ingestionRoutes = new Hono();

// HIGH-03 Fix: Add validation schema for ingestion job creation
const CreateIngestionJobRequest = z.object({
  source_type: z.enum(["sftp", "api", "manual"]),
  contract_id: z.string().optional(),
  file_pattern: z.string().optional(),
  schedule: z.string().optional(),
  config: z.record(z.any()).optional(),
});

ingestionRoutes.post("/api/v1/ingestion/jobs", requireRole("admin", "auditor"), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = CreateIngestionJobRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    const data = await dataPlatformClient.post<unknown>("/internal/ingestion/jobs", parsed.data);
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
