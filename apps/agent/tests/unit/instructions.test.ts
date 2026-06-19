import { describe, it, expect } from "vitest";
import {
  getInstructions,
  listPromptVersions,
  DEFAULT_PROMPT_VERSION,
} from "../../src/mastra/instructions.js";

describe("instructions", () => {
  it("returns a non-empty instruction for known versions", () => {
    expect(getInstructions("v1")).toContain("Davis-Bacon");
    expect(getInstructions("v2")).toContain("CRITICAL RULES");
  });

  it("falls back to the default for an unknown version", () => {
    expect(getInstructions("nope-v99")).toBe(getInstructions(DEFAULT_PROMPT_VERSION));
  });

  it("lists available versions", () => {
    const versions = listPromptVersions();
    expect(versions).toContain("v1");
    expect(versions).toContain("v2");
  });
});
