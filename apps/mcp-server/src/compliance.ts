import { ServiceClient } from "@wcp/typescript-client";
import { config, isMockMode } from "./config.js";
import type {
  ComplianceCheck,
  DBWDRate,
  DeterministicReport,
  ExtractedWCP,
  SearchResult,
} from "./schemas.js";

/**
 * The compliance engine, as seen by the MCP tools. In `real` mode it calls Compliance Core
 * over HTTP (the authoritative deterministic engine); in `mock` mode it returns deterministic
 * stub data so the MCP server runs standalone with zero external services.
 */

const client = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: config.INTERNAL_SERVICE_TOKEN ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN } : {},
});

const PREVAILING: Record<string, number> = { Electrician: 46.1, Carpenter: 34.86, Laborer: 24.5 };

function mockExtract(text: string): ExtractedWCP {
  const wage = /lowball|below|underpa/i.test(text) ? 30 : 55;
  return {
    job_id: "mcp-mock",
    contractor: { name: "Apex Builders Inc." },
    project: { name: "Federal Building Renovation", location: "Washington, DC" },
    employees: [
      {
        name: "Jane Doe",
        trade_classification: "Electrician",
        hours_worked: 40,
        overtime_hours: 0,
        hourly_wage: wage,
        fringe_benefits: 18.75,
        gross_earnings: wage * 40,
        deductions: 200,
        net_wages: wage * 40 - 200,
      },
    ],
  };
}

function mockValidate(extracted: ExtractedWCP): DeterministicReport {
  const checks: ComplianceCheck[] = extracted.employees.map((e, i) => {
    const expected = PREVAILING[e.trade_classification] ?? 46.1;
    const fail = e.hourly_wage < expected;
    return {
      check_id: `wage_rate_${i + 1}`,
      check_type: "wage_rate",
      employee_name: e.name,
      status: fail ? "fail" : "pass",
      expected_value: expected,
      actual_value: e.hourly_wage,
      regulation_cite: "29 CFR 5.5",
      message: fail ? "Hourly wage below Davis-Bacon prevailing rate" : "Wage meets prevailing rate",
    };
  });
  const violation_count = checks.filter((c) => c.status === "fail").length;
  return {
    job_id: extracted.job_id,
    checks,
    overall_status: violation_count > 0 ? "fail" : "pass",
    violation_count,
    warning_count: 0,
  };
}

function mockRate(trade: string, locality: string, date: string): DBWDRate {
  return {
    trade,
    locality,
    rate: PREVAILING[trade] ?? 46.1,
    fringe: 18.75,
    effective_date: date,
    wage_determination_number: "DC20240001",
  };
}

function mockSearch(query: string): SearchResult[] {
  return [
    {
      chunk_id: "seed-29cfr5.5",
      text: `Re: "${query}" — 29 CFR 5.5(a)(1): pay no less than the applicable wage determination; overtime at 1.5x the basic rate for hours over 40 in a workweek.`,
      score: 0.92,
    },
  ];
}

export async function extractPayroll(text: string): Promise<ExtractedWCP> {
  if (isMockMode) return mockExtract(text);
  return client.post<ExtractedWCP>("/internal/extract", { text });
}

export async function validatePayroll(extracted: ExtractedWCP): Promise<DeterministicReport> {
  if (isMockMode) return mockValidate(extracted);
  return client.post<DeterministicReport>("/internal/validate", extracted);
}

export async function checkPayrollText(
  text: string,
): Promise<{ extracted: ExtractedWCP; report: DeterministicReport }> {
  const extracted = await extractPayroll(text);
  const report = await validatePayroll(extracted);
  return { extracted, report };
}

export async function lookupDbwdRate(trade: string, locality: string, date: string): Promise<DBWDRate> {
  if (isMockMode) return mockRate(trade, locality, date);
  return client.get<DBWDRate>(
    `/internal/dbwd/${encodeURIComponent(trade)}/${encodeURIComponent(locality)}/${encodeURIComponent(date)}`,
  );
}

export async function searchWageRegs(
  query: string,
  trade: string | undefined,
  locality: string | undefined,
  topK: number,
): Promise<SearchResult[]> {
  if (isMockMode) return mockSearch(query);
  const res = await client.post<{ results: SearchResult[] }>("/internal/search/", {
    query,
    trade,
    locality,
    top_k: topK,
  });
  return res.results;
}
