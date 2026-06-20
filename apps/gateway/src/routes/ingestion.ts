import { Hono } from "hono";
import { z } from "zod";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { logUpstreamError } from "../lib/error-log.js";
import { getInternalHeaders } from "../lib/request-headers.js";

export const ingestionRoutes = new Hono();

// HIGH-03 Fix: Add validation schema for ingestion job creation
const CreateIngestionJobRequest = z.object({
  source_type: z.enum(["sftp", "api", "manual"]),
  contract_id: z.string().optional(),
  file_pattern: z.string().optional(),
  schedule: z.string().optional(),
  config: z.record(z.any()).optional(),
});

ingestionRoutes.post("/api/v1/ingestion/jobs", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = CreateIngestionJobRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    const data = await dataPlatformClient.post<unknown>(
      "/internal/ingestion/jobs",
      parsed.data,
      getInternalHeaders(c),
    );
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "ingestion/jobs/create", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "ingestion/jobs/create", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

ingestionRoutes.get("/api/v1/ingestion/jobs/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await dataPlatformClient.get<unknown>(
      `/internal/ingestion/jobs/${id}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "ingestion/jobs/get", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "ingestion/jobs/get", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
