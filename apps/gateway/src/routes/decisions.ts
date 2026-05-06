import { Hono } from "hono";
import { dataPlatformClient, getDecisions, getDecision } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const decisionsRoutes = new Hono();

decisionsRoutes.get("/api/v1/decisions", async (c) => {
  const params: Record<string, string> = {};
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");
  const verdict = c.req.query("verdict");
  const trust_band = c.req.query("trust_band");
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  if (verdict) params.verdict = verdict;
  if (trust_band) params.trust_band = trust_band;

  try {
    const data = await getDecisions(params);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch decisions" }, 500);
  }
});

decisionsRoutes.get("/api/v1/decisions/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await getDecision(id);
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch decision" }, 500);
  }
});
