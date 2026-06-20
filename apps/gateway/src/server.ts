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

const app = new Hono();

app.use("*", corsMiddleware);
app.use("*", requestIdMiddleware);
app.use("/api/*", rateLimiter());

app.route("/", healthRoutes);

app.route("/", authRoutes);

// Auth must cover each protected resource AND its sub-paths. Hono matches a non-wildcard
// path EXACTLY, so without the `/*` variants sub-paths (e.g. /decisions/:id,
// /decisions/stream, all /analytics/* and /ingestion/* routes) would be unauthenticated.
// /api/v1/auth/login stays public (authRoutes mounted above).
const protectedResources = [
  "/api/v1/analyze",
  "/api/v1/decisions",
  "/api/v1/contracts",
  "/api/v1/payrolls",
  "/api/v1/ingestion",
  "/api/v1/analytics",
];
for (const resource of protectedResources) {
  app.use(resource, authMiddleware);
  app.use(`${resource}/*`, authMiddleware);
}

app.route("/", analyzeRoutes);
app.route("/", analyzePdfRoutes);
app.route("/", decisionsRoutes);
app.route("/", streamRoutes);
app.route("/", contractsRoutes);
app.route("/", payrollsRoutes);
app.route("/", ingestionRoutes);
app.route("/", analyticsRoutes);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: config.PORT }, () => {
    console.log(`Gateway started on port ${config.PORT}`);
  });
}

export default app;
