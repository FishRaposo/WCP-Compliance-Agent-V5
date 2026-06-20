import { Hono } from "hono";
import { z } from "zod";
import {
  getContracts,
  createContract,
  getContract,
  patchContract,
  dataPlatformClient,
} from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { logUpstreamError } from "../lib/error-log.js";
import { getInternalHeaders } from "../lib/request-headers.js";

export const contractsRoutes = new Hono();

const CreateContractRequest = z.object({
  contract_number: z.string().min(1),
  contractor_name: z.string().min(1),
  project_name: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  wage_determination_number: z.string().optional(),
  location: z.string().optional(),
}).passthrough();

// HIGH-04 Fix: Explicit allowed fields with strict() to prevent extra fields
const PatchContractRequest = z.object({
  contractor_name: z.string().optional(),
  project_name: z.string().optional(),
  status: z.enum(["active", "completed", "terminated"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  wage_determination_number: z.string().optional(),
  location: z.string().optional(),
}).strict();

// HIGH-03 Fix: Add validation for bulk contract import
const BulkContractRequest = z.object({
  contracts: z.array(z.object({
    contract_number: z.string().min(1),
    contractor_name: z.string().min(1),
    project_name: z.string().min(1),
    start_date: z.string(),
    end_date: z.string(),
    wage_determination_number: z.string().optional(),
    location: z.string().optional(),
  })),
});

contractsRoutes.get("/api/v1/contracts", async (c) => {
  const params: Record<string, string> = {};
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;

  try {
    const data = await getContracts(c, params);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "contracts/list", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "contracts/list", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

contractsRoutes.post("/api/v1/contracts", async (c) => {
  const body = await c.req.json();
  const parsed = CreateContractRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  try {
    const data = await createContract(c, parsed.data);
    return c.json(data, 201);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "contracts/create", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "contracts/create", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

contractsRoutes.get("/api/v1/contracts/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await getContract(c, id);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "contracts/get", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "contracts/get", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

contractsRoutes.patch("/api/v1/contracts/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = PatchContractRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  try {
    const data = await patchContract(c, id, parsed.data);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "contracts/patch", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "contracts/patch", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

contractsRoutes.post("/api/v1/contracts/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = BulkContractRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    const data = await dataPlatformClient.post<unknown>(
      "/internal/contracts/bulk",
      parsed.data,
      getInternalHeaders(c),
    );
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "contracts/bulk", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "contracts/bulk", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
