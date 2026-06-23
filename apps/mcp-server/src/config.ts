import "dotenv/config";
import { z } from "zod";

function normalizeUrl(raw: string): string {
  return raw.includes("://") ? raw : `http://${raw}`;
}

const trimmedEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) trimmedEnv[key] = value.trim();
}

const envSchema = z.object({
  // mock = zero external services (returns deterministic stub compliance data);
  // real = calls Compliance Core over HTTP.
  MCP_MODE: z.enum(["mock", "real"]).default("mock"),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  HTTP_PORT: z.coerce.number().default(3002),
  COMPLIANCE_CORE_URL: z
    .string()
    .transform(normalizeUrl)
    .pipe(z.string().url())
    .default("http://localhost:8000"),
  INTERNAL_SERVICE_TOKEN: z.string().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const config = envSchema.parse(trimmedEnv);
export type Config = typeof config;
export const isMockMode = config.MCP_MODE === "mock";
