const MODEL_COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.001, output: 0.005 },
  "llama3.2": { input: 0, output: 0 },
};

const DEFAULT_RATES = { input: 0.005, output: 0.015 };

/** Best-effort USD cost from token usage. Model id is matched leniently (provider prefixes stripped). */
export function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const key = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
  const rates = MODEL_COST_PER_1K[key] ?? MODEL_COST_PER_1K[model] ?? DEFAULT_RATES;
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}
