import { PinoLogger } from "@mastra/loggers";
import { Observability } from "@mastra/observability";
import { LangfuseExporter } from "@mastra/langfuse";
import type { IMastraLogger } from "@mastra/core/logger";

import { config, isMockMode } from "../config.js";

const SERVICE_NAME = "wcp-compliance-agent";

/**
 * Structured infra logger for the Mastra instance. Defaults to `info` (configurable via
 * LOG_LEVEL) so payroll data embedded in agent inputs isn't routinely written to logs at
 * `debug` in non-production environments.
 */
export function buildLogger(): IMastraLogger {
  return new PinoLogger({ name: SERVICE_NAME, level: config.LOG_LEVEL });
}

const langfuseEnabled =
  !isMockMode && Boolean(config.LANGFUSE_PUBLIC_KEY && config.LANGFUSE_SECRET_KEY);

/**
 * AI tracing for the Mastra instance. With Langfuse keys present (real mode) every agent
 * call, tool call, workflow step, and scorer is exported to Langfuse. Omitting the config
 * (mock mode / no keys) installs Mastra's NoOp observability — zero external dependencies.
 */
export function buildObservability(): Observability | undefined {
  if (!langfuseEnabled) return undefined;
  return new Observability({
    configs: {
      default: {
        serviceName: SERVICE_NAME,
        exporters: [
          new LangfuseExporter({
            publicKey: config.LANGFUSE_PUBLIC_KEY,
            secretKey: config.LANGFUSE_SECRET_KEY,
            baseUrl: config.LANGFUSE_HOST,
            environment: config.NODE_ENV,
          }),
        ],
      },
    },
  });
}
