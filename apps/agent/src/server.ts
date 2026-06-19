import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { workflowRoutes } from "./routes/workflows.js";
import { ingestSeedCorpus, ragEnabled } from "./mastra/rag.js";

const app = new Hono();

app.route("/", healthRoutes);
app.route("/internal/workflows", workflowRoutes);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: config.PORT }, async () => {
    console.log(`Agent Orchestration started on port ${config.PORT}`);
    if (ragEnabled) {
      try {
        const { ingested } = await ingestSeedCorpus();
        console.log(`Davis-Bacon RAG seeded: ${ingested} chunks`);
      } catch (err) {
        console.warn("RAG seed ingest skipped:", err instanceof Error ? err.message : err);
      }
    }
  });
}

export default app;
