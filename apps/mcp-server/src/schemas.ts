import { z } from "zod";

/**
 * Raw Zod shapes for each MCP tool's input. The MCP SDK's `registerTool` takes a RAW shape
 * (a record of Zod fields), NOT a wrapped `z.object(...)` — see server.ts.
 */

export const checkPayrollTextInput = {
  text: z
    .string()
    .min(1)
    .describe("Raw WH-347 certified payroll text to extract and run deterministic compliance checks on."),
};

export const extractPayrollInput = {
  text: z.string().min(1).describe("Raw WH-347 certified payroll text to parse into a structured record."),
};

export const lookupDbwdRateInput = {
  trade: z.string().min(1).describe("Trade classification, e.g. 'Electrician'."),
  locality: z.string().min(1).describe("Locality, e.g. 'Washington, DC'."),
  date: z.string().min(1).describe("Effective date, YYYY-MM-DD."),
};

export const searchWageRegsInput = {
  query: z.string().min(1).describe("Natural-language query over Davis-Bacon wage determinations and regulations."),
  trade: z.string().optional(),
  locality: z.string().optional(),
  top_k: z.number().int().min(1).max(20).default(5),
};

// Lightweight domain types (the engine's real shapes live in compliance-core).
export interface EmployeeRecord {
  name: string;
  trade_classification: string;
  hours_worked: number;
  overtime_hours: number;
  hourly_wage: number;
  fringe_benefits: number;
  gross_earnings: number;
  deductions: number;
  net_wages: number;
}

export interface ExtractedWCP {
  job_id: string;
  contractor: { name: string; address?: string; ein?: string };
  project: { name: string; location?: string };
  employees: EmployeeRecord[];
}

export interface ComplianceCheck {
  check_id: string;
  check_type: string;
  employee_name: string;
  status: "pass" | "fail" | "warning";
  expected_value?: number | null;
  actual_value?: number | null;
  regulation_cite?: string;
  message?: string;
}

export interface DeterministicReport {
  job_id: string;
  checks: ComplianceCheck[];
  overall_status: "pass" | "fail" | "warnings";
  violation_count: number;
  warning_count: number;
}

export interface DBWDRate {
  trade: string;
  locality: string;
  rate: number;
  fringe: number;
  effective_date: string;
  wage_determination_number?: string;
}

export interface SearchResult {
  chunk_id: string;
  text: string;
  score?: number;
}
