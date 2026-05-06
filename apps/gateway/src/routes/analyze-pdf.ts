import { Hono } from "hono";
import { config } from "../config.js";
import { agentClient } from "../clients/agent-client.js";
import { complianceClient } from "../clients/compliance-client.js";
import { ServiceClientError } from "@wcp/typescript-client";

export const analyzePdfRoutes = new Hono();

analyzePdfRoutes.post("/api/v1/analyze/pdf", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: "Missing file" }, 400);
    }

    const backendForm = new FormData();
    backendForm.append("file", file, file.name);

    const extracted = await complianceClient.postForm("/internal/extract/pdf", backendForm);

    const decision = await agentClient.post("/internal/workflows/wcp-pipeline-from-extracted", extracted);

    return c.json(decision, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      return c.json({ error: err.message }, 502);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "PDF analysis failed" },
      500,
    );
  }
});
