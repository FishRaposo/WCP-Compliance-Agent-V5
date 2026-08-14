import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.WCP_MOCK_AUTH = "true";
  process.env.LLM_MODE = "mock";
  process.env.AGENT_SERVICE_TRANSPORT = "in-process";
});

import app from "../../src/server.js";

const canonicalPayroll = [
  "Contractor: Offline Electric LLC",
  "Project: Library retrofit",
  "Project location: Washington, DC",
  "Wage determination: DC20240001",
  "Week ending: 2026-01-10",
  "Certification date: 2026-01-15",
  "Employee: Jane Doe",
  "Trade: Electrician",
  "Hours: 40",
  "Overtime hours: 0",
  "Hourly wage: 55",
  "Fringe benefits: 1400",
  "Gross earnings: 2200",
  "Deductions: 150",
  "Net wages: 2050",
].join("\n");

function replaceLine(text: string, label: string, value: string): string {
  return text.replace(new RegExp(`^${label}:.*$`, "m"), `${label}: ${value}`);
}

async function analyze(
  job_id: string,
  text: string,
  traceId = `trace-${job_id}`,
  requestId = `request-${job_id}`,
) {
  return app.request("/api/v1/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-trace-id": traceId,
    },
    body: JSON.stringify({ job_id, text }),
  });
}

describe("Gateway offline Agent composition", () => {
  afterEach(() => vi.restoreAllMocks());

  it("runs raw payroll text through the real analyze route without external services", async () => {
    const networkFetch = vi.spyOn(globalThis, "fetch");
    const sseBridge = await import("../../src/lib/sse-bridge.js");
    sseBridge.clearSSEEventHistory();
    const payload = {
      job_id: "job-offline-route",
      text: canonicalPayroll,
    };
    const response = await analyze(
      payload.job_id,
      payload.text,
      "trace-offline-route",
      "request-offline-route",
    );

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
    expect(sseBridge.getSSEEventsAfter("wcp.decisions")).toEqual([
      expect.objectContaining({
        type: "decision.created",
        data: expect.objectContaining({ job_id: payload.job_id, verdict: "approved" }),
        streamId: "local-1",
      }),
    ]);

    const duplicate = await analyze(
      payload.job_id,
      payload.text,
      "trace-offline-duplicate",
      "request-offline-duplicate",
    );

    expect(duplicate.status).toBe(200);
    expect(offlineDecisionStore.size).toBe(1);
    expect(offlineDecisionStore.get(payload.job_id)?.id).toBe(firstRecord?.id);
    expect(offlineDecisionStore.getAuditEvents(payload.job_id)).toEqual([
      expect.objectContaining({ event_type: "decision_persisted", trace_id: "trace-offline-route" }),
      expect.objectContaining({ event_type: "decision_persisted", trace_id: "trace-offline-duplicate" }),
    ]);
    expect(networkFetch).not.toHaveBeenCalled();
  }, 30_000);

  it.each([
    {
      name: "underpaid prevailing wage",
      jobId: "job-offline-underpaid",
      text: replaceLine(
        replaceLine(replaceLine(canonicalPayroll, "Hourly wage", "20"), "Gross earnings", "800"),
        "Net wages",
        "650",
      ),
      verdict: "rejected",
    },
    {
      name: "omitted fringe compensation",
      jobId: "job-offline-fringe",
      text: replaceLine(canonicalPayroll, "Fringe benefits", "0"),
      verdict: "rejected",
    },
    {
      name: "missing certification signature",
      jobId: "job-offline-signature",
      text: canonicalPayroll.replace(/^Certification date:.*\n/m, ""),
      verdict: "rejected",
    },
    {
      name: "negative deductions",
      jobId: "job-offline-integrity",
      text: replaceLine(
        replaceLine(canonicalPayroll, "Deductions", "-10"),
        "Net wages",
        "2210",
      ),
      verdict: "rejected",
    },
    {
      name: "noncanonical omitted payroll fields",
      jobId: "job-offline-omitted",
      text: [
        "Payroll number: 1",
        "Week ending: 2026-01-10",
        "Certification date: 2026-01-15",
      ].join("\n"),
      verdict: "needs_review",
    },
    {
      name: "blank wage determination label",
      jobId: "job-offline-blank-wd",
      text: replaceLine(canonicalPayroll, "Wage determination", ""),
      verdict: "needs_review",
    },
    {
      name: "malformed wage determination label",
      jobId: "job-offline-malformed-wd",
      text: replaceLine(canonicalPayroll, "Wage determination", "???"),
      verdict: "needs_review",
    },
    {
      name: "unparseable week-ending label",
      jobId: "job-offline-invalid-week",
      text: replaceLine(canonicalPayroll, "Week ending", "not-a-date"),
      verdict: "needs_review",
    },
    {
      name: "unparseable employee numeric label",
      jobId: "job-offline-invalid-hours",
      text: replaceLine(canonicalPayroll, "Hours", "not-a-number"),
      verdict: "rejected",
    },
  ])("never approves $name", async ({ jobId, text, verdict }) => {
    const response = await analyze(jobId, text);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      job_id: jobId,
      verdict,
    });
  }, 30_000);
});
