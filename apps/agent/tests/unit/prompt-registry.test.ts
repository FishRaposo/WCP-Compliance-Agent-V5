import { describe, it, expect } from "vitest";
import { promptRegistry } from "../../src/prompts/registry.js";

describe("promptRegistry", () => {
  it("returns local prompt by name", async () => {
    const prompt = await promptRegistry.getPrompt("wcp-verdict", "v1");
    expect(prompt.version).toBe("v1");
    expect(prompt.template).toBeDefined();
    expect(prompt.template.length).toBeGreaterThan(0);
  });

  it("throws for unknown version", async () => {
    await expect(
      promptRegistry.getPrompt("wcp-verdict", "nonexistent-v99")
    ).rejects.toThrow();
  });

  it("lists available versions", async () => {
    const versions = await promptRegistry.listVersions();
    expect(versions).toContain("v1");
    expect(versions.length).toBeGreaterThan(0);
  });
});
