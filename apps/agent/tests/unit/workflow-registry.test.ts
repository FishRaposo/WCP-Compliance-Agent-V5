import { describe, it, expect } from "vitest";
import {
  createWorkflow,
  startStep,
  completeStep,
  completeWorkflow,
  failWorkflow,
  getWorkflow,
} from "../../src/workflows/registry.js";

describe("workflow registry", () => {
  it("creates a running workflow with pending steps", () => {
    createWorkflow("wf-1", ["validate", "persist"]);
    const rec = getWorkflow("wf-1");
    expect(rec?.status).toBe("running");
    expect(rec?.steps.map((s) => s.status)).toEqual(["pending", "pending"]);
  });

  it("transitions steps and completes the workflow", () => {
    createWorkflow("wf-2", ["validate", "persist"]);
    startStep("wf-2", "validate");
    completeStep("wf-2", "validate");
    startStep("wf-2", "persist");
    completeStep("wf-2", "persist");
    completeWorkflow("wf-2", "dec-99");
    const rec = getWorkflow("wf-2");
    expect(rec?.status).toBe("completed");
    expect(rec?.decision_id).toBe("dec-99");
    expect(rec?.steps.every((s) => s.status === "completed")).toBe(true);
    expect(rec?.steps[0]?.started_at).toBeDefined();
    expect(rec?.steps[0]?.ended_at).toBeDefined();
  });

  it("marks a failed workflow and fails running steps", () => {
    createWorkflow("wf-3", ["validate", "persist"]);
    startStep("wf-3", "validate");
    failWorkflow("wf-3", "boom");
    const rec = getWorkflow("wf-3");
    expect(rec?.status).toBe("failed");
    expect(rec?.error).toBe("boom");
    expect(rec?.steps[0]?.status).toBe("failed");
  });

  it("returns undefined for an unknown workflow", () => {
    expect(getWorkflow("does-not-exist")).toBeUndefined();
  });
});
