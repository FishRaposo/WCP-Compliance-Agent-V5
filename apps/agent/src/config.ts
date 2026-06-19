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
  COMPLIANCE_CORE_URL: z.string().transform(normalizeUrl).pipe(z.string().url()).default("http://localhost:8000"),
  DATA_PLATFORM_URL: z.string().transform(normalizeUrl).pipe(z.string().url()).default("http://localhost:8001"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  OLLAMA_BASE_URL: z.string().default(""),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  LLM_PROVIDER: z.enum(["openai", "anthropic", "ollama"]).default("openai"),
  LLM_MODE: z.enum(["mock", "real"]).default("mock"),
  LANGFUSE_PUBLIC_KEY: z.string().default(""),
  LANGFUSE_SECRET_KEY: z.string().default(""),
  LANGFUSE_HOST: z.string().url().default("https://cloud.langfuse.com"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  VECTOR_DB_URL: z.string().default("file:./wcp-wage-rag.db"),
  MEMORY_DB_URL: z.string().default("file:./wcp-memory.db"),
  MASTRA_DB_URL: z.string().default("file:./wcp-mastra.db"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  TRUST_SCORE_REVIEW_THRESHOLD: z.coerce.number().default(0.6),
  TRUST_SCORE_HIGH_BAND: z.coerce.number().default(0.85),
  INTERNAL_SERVICE_TOKEN: z.string().default(""),
});

const raw = envSchema.parse(trimmedEnv);

if (raw.NODE_ENV === "production" && raw.LLM_MODE === "mock") {
  throw new Error(
    "LLM_MODE=mock is not allowed in production. Set LLM_MODE=real and provide a valid OPENAI_API_KEY."
  );
}

if (raw.NODE_ENV === "production" && !raw.INTERNAL_SERVICE_TOKEN) {
  throw new Error("INTERNAL_SERVICE_TOKEN is required in production.");
}

export const config = raw;
export type Config = typeof config;
export const isMockMode = config.LLM_MODE === "mock";
