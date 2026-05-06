import { describe, it, expect } from "vitest";

describe("api-client", () => {
  it("apiClient has expected methods", async () => {
    const { apiClient } = await import("../src/utils/api-client");
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
    expect(typeof apiClient.postForm).toBe("function");
    expect(typeof apiClient.delete).toBe("function");
  });

  it("IS_MOCK is a boolean", async () => {
    const { IS_MOCK } = await import("../src/utils/api-client");
    expect(typeof IS_MOCK).toBe("boolean");
  });
});
