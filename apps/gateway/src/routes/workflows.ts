import { Hono } from "hono";
import { getWorkflowStatus } from "../clients/agent-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const workflowsRoutes = new Hono();

workflowsRoutes.get("/api/v1/workflows/:id/status", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await getWorkflowStatus(id);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      const status = err.statusCode === 404 ? 404 : 502;
      return c.json({ error: err.message }, status);
    }
    return c.json({ error: "Failed to fetch workflow status" }, 500);
  }
});
