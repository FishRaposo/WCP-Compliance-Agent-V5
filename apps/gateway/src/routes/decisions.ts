import { Hono } from "hono";
import { z } from "zod";
import {
  getDecisions,
  getDecision,
  overrideDecision,
} from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { requireRole, getTenantId, getActor } from "../middleware/rbac.js";

export const decisionsRoutes = new Hono();

const OverrideRequest = z.object({
  review_status: z.enum(["approved", "rejected", "overridden"]),
  review_note: z.string().optional(),
});

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
    const data = await getDecisions(params, getTenantId(c));
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
    const data = await getDecision(id, getTenantId(c));
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json({ error: "Failed to fetch decision" }, 500);
  }
});

decisionsRoutes.post(
  "/api/v1/decisions/:id/override",
  requireRole("admin", "auditor"),
  async (c) => {
    // The :id segment is guaranteed by the matched route; the preceding
    // requireRole middleware erases Hono's param inference, so assert it.
    const id = c.req.param("id")!;
    const body = await c.req.json().catch(() => ({}));
    const parsed = OverrideRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }

    // Attribute the override to the authenticated reviewer, not the client payload.
    const payload = {
      review_status: parsed.data.review_status,
      review_note: parsed.data.review_note ?? "",
      reviewed_by: getActor(c),
    };

    try {
      const data = await overrideDecision(id, payload, getTenantId(c));
      return c.json(data, 200);
    } catch (err) {
      if (err instanceof ServiceClientError) {
        const status = err.statusCode === 404 ? 404 : 502;
        return c.json({ error: err.message }, status);
      }
      return c.json({ error: "Failed to override decision" }, 500);
    }
  },
);
