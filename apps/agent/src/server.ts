import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { workflowRoutes } from "./routes/workflows.js";

const app = new Hono();

app.route("/", healthRoutes);
app.route("/internal/workflows", workflowRoutes);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: config.PORT }, () => {
    console.log(`Agent Orchestration started on port ${config.PORT}`);
  });
}

export default app;
