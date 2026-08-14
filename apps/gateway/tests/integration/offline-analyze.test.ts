import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.WCP_MOCK_AUTH = "true";
  process.env.LLM_MODE = "mock";
  process.env.AGENT_SERVICE_TRANSPORT = "in-process";
});

import app from "../../src/server.js";

describe("Gateway offline Agent composition", () => {
  it("runs raw payroll text through the real analyze route without external services", async () => {
    const networkFetch = vi.spyOn(globalThis, "fetch");
    const payload = {
      job_id: "job-offline-route",
      text: [
        "Contractor: Offline Electric LLC",
        "Project: Library retrofit",
        "Employee: Jane Doe",
        "Trade: Electrician",
        "Hours: 40",
        "Overtime hours: 0",
        "Hourly wage: 55",
        "Fringe benefits: 1400",
        "Gross earnings: 2200",
        "Deductions: 150",
        "Net wages: 2050",
      ].join("\n"),
    };
    const response = await app.request("/api/v1/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-offline-route",
        "x-trace-id": "trace-offline-route",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-offline-route");
    await expect(response.json()).resolves.toMatchObject({
      job_id: "job-offline-route",
      verdict: "approved",
      trust_band: "auto_approve",
      violation_count: 0,
      warning_count: 0,
      llm_confidence: 0.95,
    });

    const { offlineDecisionStore } = await import("@wcp/agent/offline-composition");
    const firstRecord = offlineDecisionStore.get(payload.job_id);
    expect(firstRecord).toMatchObject({
      id: expect.any(String),
      job_id: payload.job_id,
      verdict: "approved",
    });
    expect(offlineDecisionStore.getAuditEvents(payload.job_id)).toEqual([
      expect.objectContaining({ event_type: "decision_persisted", trace_id: "trace-offline-route" }),
    ]);

    const duplicate = await app.request("/api/v1/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-offline-duplicate",
        "x-trace-id": "trace-offline-duplicate",
      },
      body: JSON.stringify(payload),
    });

    expect(duplicate.status).toBe(200);
    expect(offlineDecisionStore.size).toBe(1);
    expect(offlineDecisionStore.get(payload.job_id)?.id).toBe(firstRecord?.id);
    expect(offlineDecisionStore.getAuditEvents(payload.job_id)).toEqual([
      expect.objectContaining({ event_type: "decision_persisted", trace_id: "trace-offline-route" }),
      expect.objectContaining({ event_type: "decision_persisted", trace_id: "trace-offline-duplicate" }),
    ]);
    expect(networkFetch).not.toHaveBeenCalled();
  }, 30_000);
});
