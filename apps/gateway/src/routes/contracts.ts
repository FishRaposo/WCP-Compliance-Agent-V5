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
import { requireRole, getTenantId } from "../middleware/rbac.js";

export const contractsRoutes = new Hono();

const CreateContractRequest = z.object({
  contract_number: z.string().min(1),
  contractor_name: z.string().min(1),
  project_name: z.string().min(1),
  start_date: z.string(),
  end_date: z.string().optional(),
  wage_determination_number: z.string().optional(),
  // The Data Platform's field is `locality`; accept either name from clients.
  locality: z.string().min(1).optional(),
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
    const data = await getContracts(params, getTenantId(c));
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch contracts" }, 500);
  }
});

contractsRoutes.post("/api/v1/contracts", requireRole("admin", "auditor"), async (c) => {
  const body = await c.req.json();
  const parsed = CreateContractRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  // Map the client's `location` onto the Data Platform's required `locality`.
  const locality = parsed.data.locality ?? parsed.data.location;
  if (!locality) {
    return c.json({ error: "Invalid request", details: { locality: "required" } }, 400);
  }
  const payload = { ...parsed.data, locality };

  try {
    const data = await createContract(payload, getTenantId(c));
    return c.json(data, 201);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to create contract" }, 500);
  }
});

contractsRoutes.get("/api/v1/contracts/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await getContract(id, getTenantId(c));
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch contract" }, 500);
  }
});

contractsRoutes.patch("/api/v1/contracts/:id", requireRole("admin", "auditor"), async (c) => {
  // requireRole middleware erases Hono's param inference; the matched route
  // guarantees the :id segment is present.
  const id = c.req.param("id")!;
  const body = await c.req.json();
  const parsed = PatchContractRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  try {
    const data = await patchContract(id, parsed.data, getTenantId(c));
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to update contract" }, 500);
  }
});

contractsRoutes.post("/api/v1/contracts/bulk", requireRole("admin", "auditor"), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = BulkContractRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    const data = await dataPlatformClient.post<unknown>("/internal/contracts/bulk", parsed.data, {
      "X-Tenant-Id": getTenantId(c),
    });
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to bulk import contracts" }, 500);
  }
});
