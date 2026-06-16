import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { LLMRouter, type RoutingContext } from "../../src/model-router/llm-router.js";

vi.mock("ai", () => ({ generateObject: vi.fn() }));

describe("LLMRouter", () => {
  const router = new LLMRouter();

  describe("selectProvider", () => {
    it("selects gpt-4o for compliance-critical tasks", () => {
      const ctx: RoutingContext = { complianceCritical: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o");
    });

    it("selects openai with gpt-4o-mini for cost mode when no ollama URL set", () => {
      const ctx: RoutingContext = { costMode: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o-mini");
    });

    it("compliance-critical overrides cost mode", () => {
      const ctx: RoutingContext = { complianceCritical: true, costMode: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o");
    });

    it("defaults to openai gpt-4o-mini", () => {
      const config = router.selectProvider({});
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o-mini");
    });
  });

  describe("createModel", () => {
    it("returns a language model for openai", () => {
      const model = router.createModel({ provider: "openai", model: "gpt-4o-mini" });
      expect(model).toBeDefined();
    });

    it("returns a language model for anthropic", () => {
      const model = router.createModel({ provider: "anthropic", model: "claude-sonnet-4-20250514" });
      expect(model).toBeDefined();
    });
  });

  describe("generateObjectWithFallback", () => {
    const schema = z.object({ verdict: z.string() });

    it("falls back to a secondary provider when the primary fails", async () => {
      const { generateObject } = await import("ai");
      const mock = generateObject as unknown as ReturnType<typeof vi.fn>;
      mock.mockReset();
      mock
        .mockRejectedValueOnce(new Error("primary down"))
        .mockResolvedValueOnce({
          object: { verdict: "approved" },
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        });

      const result = await router.generateObjectWithFallback(schema, "prompt", {
        complianceCritical: true,
      });
      expect(result.object.verdict).toBe("approved");
      expect(result.fallbackUsed).toBe(true);
      expect(result.model).toBe("gpt-4o-mini");
    });

    it("throws when every provider fails", async () => {
      const { generateObject } = await import("ai");
      const mock = generateObject as unknown as ReturnType<typeof vi.fn>;
      mock.mockReset();
      mock.mockRejectedValue(new Error("all down"));

      await expect(
        router.generateObjectWithFallback(schema, "prompt", {})
      ).rejects.toThrow();
    });
  });
});
