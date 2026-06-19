import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider-v2";
import type { RequestContext } from "@mastra/core/request-context";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { ModelWithRetries } from "@mastra/core/agent";

import { config } from "../config.js";

/**
 * Per-request model routing for the verdict agent.
 *
 * Replaces the hand-rolled `LLMRouter` class with Mastra's idiomatic dynamic-model pattern:
 * the agent's `model` is a function `({ requestContext }) => MastraModelConfig`, resolved on
 * every request. Provider instances (AI SDK v6) are constructed once at module scope and
 * selected per request; API keys are read from the environment by each provider.
 *
 * Routing modes (set via `requestContext.set("mode", ...)`):
 *  - "compliance" (default): highest-accuracy model for violation-bearing payrolls, with
 *    a cross-provider fallback chain.
 *  - "cost": local Ollama, when configured, to keep routine checks cheap.
 *  - "synthesis": Anthropic for long-form reasoning, falling back to OpenAI.
 */
export type RoutingMode = "compliance" | "cost" | "synthesis";

export const ROUTING_MODE_KEY = "mode";

const ollama = config.OLLAMA_BASE_URL
  ? createOllama({ baseURL: config.OLLAMA_BASE_URL })
  : null;

function complianceChain(): ModelWithRetries[] {
  const chain: ModelWithRetries[] = [{ model: openai("gpt-4o"), maxRetries: 2 }];
  if (config.ANTHROPIC_API_KEY) {
    chain.push({ model: anthropic(config.ANTHROPIC_MODEL), maxRetries: 1 });
  }
  chain.push({ model: openai("gpt-4o-mini"), maxRetries: 1 });
  return chain;
}

function synthesisChain(): ModelWithRetries[] {
  const chain: ModelWithRetries[] = [];
  if (config.ANTHROPIC_API_KEY) {
    chain.push({ model: anthropic(config.ANTHROPIC_MODEL), maxRetries: 2 });
  }
  chain.push({ model: openai("gpt-4o"), maxRetries: 1 });
  return chain;
}

function defaultModel(): MastraModelConfig {
  if (config.LLM_PROVIDER === "anthropic" && config.ANTHROPIC_API_KEY) {
    return anthropic(config.ANTHROPIC_MODEL);
  }
  return openai(config.OPENAI_MODEL);
}

/**
 * The value assigned to `Agent.model`. Resolved per request by Mastra.
 */
export function routeVerdictModel({
  requestContext,
}: {
  requestContext: RequestContext;
}): MastraModelConfig | ModelWithRetries[] {
  const mode = (requestContext.get(ROUTING_MODE_KEY) as RoutingMode | undefined) ?? "compliance";

  if (mode === "cost" && ollama) {
    return ollama(config.OLLAMA_MODEL) as unknown as MastraModelConfig;
  }
  if (mode === "synthesis") {
    return synthesisChain();
  }
  if (mode === "compliance") {
    return complianceChain();
  }
  return defaultModel();
}
