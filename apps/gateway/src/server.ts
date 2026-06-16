import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { config } from "./config.js";
import { corsMiddleware } from "./middleware/cors.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { authMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { analyzePdfRoutes } from "./routes/analyze-pdf.js";
import { decisionsRoutes } from "./routes/decisions.js";
import { streamRoutes } from "./routes/stream.js";
import { contractsRoutes } from "./routes/contracts.js";
import { payrollsRoutes } from "./routes/payrolls.js";
import { ingestionRoutes } from "./routes/ingestion.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { workflowsRoutes } from "./routes/workflows.js";

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", requestIdMiddleware);
app.use("/api/*", rateLimiter());

app.route("/", healthRoutes);

app.route("/", authRoutes);

app.use("/api/v1/analyze", authMiddleware);
app.use("/api/v1/analyze/pdf", authMiddleware);
app.use("/api/v1/decisions", authMiddleware);
app.use("/api/v1/decisions/:id/override", authMiddleware);
app.use("/api/v1/contracts", authMiddleware);
app.use("/api/v1/contracts/:id", authMiddleware);
app.use("/api/v1/payrolls", authMiddleware);
app.use("/api/v1/payrolls/:id", authMiddleware);
app.use("/api/v1/ingestion", authMiddleware);
app.use("/api/v1/ingestion/jobs", authMiddleware);
app.use("/api/v1/ingestion/jobs/:id", authMiddleware);
app.use("/api/v1/analytics", authMiddleware);
app.use("/api/v1/workflows", authMiddleware);

app.route("/", analyzeRoutes);
app.route("/", analyzePdfRoutes);
app.route("/", decisionsRoutes);
app.route("/", streamRoutes);
app.route("/", contractsRoutes);
app.route("/", payrollsRoutes);
app.route("/", ingestionRoutes);
app.route("/", analyticsRoutes);
app.route("/", workflowsRoutes);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: config.PORT }, () => {
    console.log(`Gateway started on port ${config.PORT}`);
  });
}

export default app;
