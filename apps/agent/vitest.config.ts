import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The first test that boots the Mastra instance pays a one-time init cost
    // (LibSQL storage + workflow engine). Give workflow runs headroom over the 5s default.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
