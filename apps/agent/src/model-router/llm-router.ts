import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { z } from "zod";
import { config } from "../config.js";

export interface ObjectResult<T> {
  object: T;
  model: string;
  provider: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  fallbackUsed: boolean;
}

export type RoutingContext = {
  complianceCritical?: boolean;
  costMode?: boolean;
  synthesisTask?: boolean;
};

export type LLMConfig = {
  provider: string;
  model: string;
};

export class LLMRouter {
  private getOllama() {
    return createOllama({ baseURL: config.OLLAMA_BASE_URL || "http://localhost:11434" });
  }

  selectProvider(context: RoutingContext): LLMConfig {
    if (context.complianceCritical) {
      return { provider: "openai", model: "gpt-4o" };
    }

    if (context.costMode && config.OLLAMA_BASE_URL) {
      return { provider: "ollama", model: config.OLLAMA_MODEL };
    }

    if (context.synthesisTask && config.ANTHROPIC_API_KEY) {
      return { provider: "anthropic", model: config.ANTHROPIC_MODEL };
    }

    const defaultProvider = config.LLM_PROVIDER;
    if (defaultProvider === "anthropic" && config.ANTHROPIC_API_KEY) {
      return { provider: "anthropic", model: config.ANTHROPIC_MODEL };
    }

    return { provider: "openai", model: "gpt-4o-mini" };
  }

  createModel(llmConfig: LLMConfig): LanguageModelV1 {
    if (llmConfig.provider === "openai") return openai(llmConfig.model) as LanguageModelV1;
    if (llmConfig.provider === "anthropic") return anthropic(llmConfig.model) as unknown as LanguageModelV1;
    return this.getOllama()(llmConfig.model) as LanguageModelV1;
  }

  /**
   * Structured-output generation with provider fallback. Tries the routed
   * provider first, then a fixed fallback chain, before surfacing failure.
   * Used by the verdict agent so a single provider outage degrades to a
   * fallback model rather than an immediate needs_review.
   */
  async generateObjectWithFallback<S extends z.ZodTypeAny>(
    schema: S,
    prompt: string,
    context: RoutingContext
  ): Promise<ObjectResult<z.infer<S>>> {
    const { generateObject } = await import("ai");

    const attempt = async (
      cfg: LLMConfig,
      fallbackUsed: boolean
    ): Promise<ObjectResult<z.infer<S>>> => {
      const model = this.createModel(cfg);
      const result = await generateObject({ model, schema, prompt });
      return {
        object: result.object as z.infer<S>,
        model: cfg.model,
        provider: cfg.provider,
        usage: {
          promptTokens: result.usage?.promptTokens ?? 0,
          completionTokens: result.usage?.completionTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        },
        fallbackUsed,
      };
    };

    const selected = this.selectProvider(context);
    try {
      return await attempt(selected, false);
    } catch (primaryErr) {
      const fallbacks: LLMConfig[] = [
        { provider: "openai", model: "gpt-4o-mini" },
        { provider: "anthropic", model: "claude-3-5-haiku-20241022" },
      ].filter((f) => f.model !== selected.model);

      const errors: Error[] = [
        primaryErr instanceof Error ? primaryErr : new Error(String(primaryErr)),
      ];
      for (const fb of fallbacks) {
        try {
          return await attempt(fb, true);
        } catch (fallbackErr) {
          errors.push(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
        }
      }
      throw new AggregateError(errors, "All LLM providers failed for structured output");
    }
  }

  async generateWithFallback(prompt: string, context: RoutingContext) {
    const selected = this.selectProvider(context);
    const model = this.createModel(selected);
    const { generateText } = await import("ai");
    try {
      const result = await generateText({ model, prompt });
      return {
        response: result.text,
        model: selected.model,
        provider: selected.provider,
        tokens: {
          prompt: result.usage?.promptTokens ?? 0,
          completion: result.usage?.completionTokens ?? 0,
        },
      };
    } catch {
      const fallbackConfigs: LLMConfig[] = [
        { provider: "openai", model: "gpt-4o-mini" },
        { provider: "anthropic", model: "claude-3-5-haiku-20241022" },
      ];

      const errors: Error[] = [];
      for (const fallback of fallbackConfigs) {
        try {
          const fbModel = this.createModel(fallback);
          const result = await generateText({ model: fbModel, prompt });
          return {
            response: result.text,
            model: fallback.model,
            provider: fallback.provider,
            tokens: {
              prompt: result.usage?.promptTokens ?? 0,
              completion: result.usage?.completionTokens ?? 0,
            },
          };
        } catch (fallbackErr) {
          errors.push(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
        }
      }
      throw new AggregateError(errors, "All LLM providers failed");
    }
  }
}

export const llmRouter = new LLMRouter();
