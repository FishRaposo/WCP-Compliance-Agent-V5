import { cors } from "hono/cors";
import { corsOrigins } from "../config.js";

export const corsMiddleware = cors({
  origin: corsOrigins,
  credentials: true,
});
