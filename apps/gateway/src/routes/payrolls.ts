import { Hono } from "hono";
import { getPayrolls, bulkImportPayrolls } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const payrollsRoutes = new Hono();

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

payrollsRoutes.post("/api/v1/payrolls/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const data = await bulkImportPayrolls(body);
    return c.json(data, 202);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to bulk import payrolls" }, 500);
  }
});
