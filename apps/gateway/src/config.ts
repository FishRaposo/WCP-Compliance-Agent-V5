import { z } from "zod";

function normalizeUrl(raw: string): string {
  return raw.includes("://") ? raw : `http://${raw}`;
}

const trimmedEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    trimmedEnv[key] = value.trim();
  }
}

const envSchema = z.object({
  AGENT_URL: z.string().transform(normalizeUrl).pipe(z.string().url()).default("http://localhost:3001"),
  COMPLIANCE_CORE_URL: z.string().transform(normalizeUrl).pipe(z.string().url()).default("http://localhost:8000"),
  DATA_PLATFORM_URL: z.string().transform(normalizeUrl).pipe(z.string().url()).default("http://localhost:8001"),
  JWT_SECRET: z.string().default("change-me-before-launch"),
  AUTH_DISABLED: z.enum(["true", "false"]).default("false"),
  RBAC_ENFORCED: z.enum(["true", "false"]).default("false"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const raw = envSchema.parse(trimmedEnv);

if (raw.NODE_ENV === "production") {
  if (raw.JWT_SECRET === "change-me-before-launch") {
    throw new Error("Default JWT_SECRET is not allowed in production.");
  }
  if (raw.AUTH_DISABLED === "true") {
    throw new Error("AUTH_DISABLED=true is not allowed in production.");
  }
}

export const config = raw;
export type Config = typeof config;

export const corsOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());
export const isAuthDisabled = config.AUTH_DISABLED === "true";
export const isRbacEnforced = config.RBAC_ENFORCED === "true";
