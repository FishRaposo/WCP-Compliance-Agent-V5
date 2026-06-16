import { Hono } from "hono";
import { z } from "zod";
import { getPayrolls, bulkImportPayrolls } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { requireRole } from "../middleware/rbac.js";

export const payrollsRoutes = new Hono();

// HIGH-03 Fix: Add validation schema for bulk payroll import
const BulkPayrollRequest = z.object({
  contract_id: z.string().min(1),
  records: z.array(z.object({
    employee_id: z.string().min(1),
    employee_name: z.string().min(1),
    work_period_start: z.string(),
    work_period_end: z.string(),
    hours_worked: z.number().positive(),
    wages_paid: z.number().nonnegative(),
    job_classification: z.string().optional(),
  })),
});

payrollsRoutes.get("/api/v1/payrolls", async (c) => {
  const params: Record<string, string> = {};
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");
  const contract_id = c.req.query("contract_id");
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  if (contract_id) params.contract_id = contract_id;

  try {
    const data = await getPayrolls(params);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch payrolls" }, 500);
  }
});

payrollsRoutes.post("/api/v1/payrolls/bulk", requireRole("admin", "auditor"), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = BulkPayrollRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    const data = await bulkImportPayrolls(parsed.data);
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to bulk import payrolls" }, 500);
  }
});
