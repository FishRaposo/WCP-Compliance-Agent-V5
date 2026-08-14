import { randomUUID } from "node:crypto";
import { RequestContext } from "@mastra/core/request-context";
import {
  InMemoryDecisionStore,
  InProcessServiceAdapter,
} from "@wcp/contracts/offline-service-adapters";

import { config } from "./config.js";
import { mastra } from "./mastra/index.js";
import {
  DeterministicReportSchema,
  ExtractedWCPSchema,
  TrustScoredDecisionSchema,
  type DeterministicReport,
  type ExtractedWCP,
  type TrustScoredDecision,
} from "./mastra/schemas.js";
import {
  installInProcessAgentServices,
  SERVICE_TRANSPORT_KEY,
} from "./mastra/tools/http.js";
import { JOB_ID_KEY } from "./mastra/workflows/wcp-pipeline.js";

type PipelineInput = { text: string; job_id?: string };

function textField(text: string, label: string, fallback: string): string {
  const line = text
    .split(/\r?\n/)
    .find((candidate) => candidate.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line?.slice(line.indexOf(":") + 1).trim() || fallback;
}

function numberField(text: string, label: string, fallback: number): number {
  const value = Number(textField(text, label, String(fallback)).replace(/[$,]/g, ""));
  return Number.isFinite(value) ? value : fallback;
}

function extractDeterministically({ text }: { text: string }): ExtractedWCP {
  return ExtractedWCPSchema.parse({
    job_id: "offline-extraction",
    contractor: { name: textField(text, "Contractor", "Offline contractor") },
    project: { name: textField(text, "Project", "Offline project") },
    employees: [
      {
        name: textField(text, "Employee", "Offline employee"),
        trade_classification: textField(text, "Trade", "Unclassified"),
        hours_worked: numberField(text, "Hours", 40),
        overtime_hours: numberField(text, "Overtime hours", 0),
        hourly_wage: numberField(text, "Hourly wage", 25),
        fringe_benefits: numberField(text, "Fringe benefits", 0),
        gross_earnings: numberField(text, "Gross earnings", 1000),
        deductions: numberField(text, "Deductions", 0),
        net_wages: numberField(text, "Net wages", 1000),
      },
    ],
  });
}

function validateDeterministically(extracted: ExtractedWCP): DeterministicReport {
  const checks = extracted.employees.flatMap((employee, index) => {
    const expectedGross =
      employee.hours_worked * employee.hourly_wage +
      employee.overtime_hours * employee.hourly_wage * 1.5;
    const expectedNet = employee.gross_earnings - employee.deductions;
    const results = [];
    if (Math.abs(employee.gross_earnings - expectedGross) > 0.01) {
      results.push({
        check_id: `offline-gross-${index}`,
        check_type: "total_arithmetic" as const,
        employee_name: employee.name,
        status: "fail" as const,
        expected_value: expectedGross,
        actual_value: employee.gross_earnings,
        variance: employee.gross_earnings - expectedGross,
        message: "Gross earnings do not match the deterministic offline calculation.",
      });
    }
    if (Math.abs(employee.net_wages - expectedNet) > 0.01) {
      results.push({
        check_id: `offline-net-${index}`,
        check_type: "total_arithmetic" as const,
        employee_name: employee.name,
        status: "fail" as const,
        expected_value: expectedNet,
        actual_value: employee.net_wages,
        variance: employee.net_wages - expectedNet,
        message: "Net wages do not match gross earnings minus deductions.",
      });
    }
    return results;
  });
  return DeterministicReportSchema.parse({
    job_id: extracted.job_id,
    checks,
    overall_status: checks.length === 0 ? "pass" : "fail",
    violation_count: checks.length,
    warning_count: 0,
    passed_count: checks.length === 0 ? 2 : Math.max(0, 2 - checks.length),
  });
}

const extract = new InProcessServiceAdapter({
  service: "compliance-core",
  operation: "extract",
  allowedCallers: ["agent"],
  idempotent: true,
  execute: async (input: { text: string }) => extractDeterministically(input),
});

const validate = new InProcessServiceAdapter({
  service: "compliance-core",
  operation: "validate",
  allowedCallers: ["agent"],
  idempotent: true,
  execute: async (input: ExtractedWCP) => validateDeterministically(input),
});

export const offlineDecisionStore = new InMemoryDecisionStore({
  service: "data-platform",
  allowedCallers: ["agent"],
});

installInProcessAgentServices({ extract, validate, decisions: offlineDecisionStore });

export async function runOfflineAgentPipeline(
  input: PipelineInput,
  headers: Record<string, string>,
): Promise<TrustScoredDecision> {
  if (config.NODE_ENV === "production" || config.LLM_MODE !== "mock") {
    throw new Error("Offline Agent composition is allowed only in non-production mock mode");
  }

  const requestContext = new RequestContext();
  requestContext.set(SERVICE_TRANSPORT_KEY, "in-process");
  requestContext.set(JOB_ID_KEY, input.job_id ?? randomUUID());
  const requestId = headers["x-request-id"] || randomUUID();
  requestContext.set("x-request-id", requestId);
  requestContext.set("x-trace-id", headers["x-trace-id"] || requestId);

  const run = await mastra.getWorkflow("wcpPipeline").createRun();
  const result = await run.start({ inputData: { text: input.text }, requestContext });
  if (result.status !== "success") {
    const message = result.status === "failed" ? result.error?.message : `Pipeline ${result.status}`;
    throw new Error(message ?? "Pipeline failed");
  }
  return TrustScoredDecisionSchema.parse(result.result);
}
