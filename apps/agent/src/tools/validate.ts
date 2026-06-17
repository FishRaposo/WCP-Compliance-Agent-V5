import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import type { DeterministicReport, ExtractedWCP } from "../types.js";

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: config.INTERNAL_SERVICE_TOKEN
    ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
    : {},
});

export async function validateTool(
  extracted: ExtractedWCP,
  headers?: Record<string, string>
): Promise<DeterministicReport> {
  return complianceClient.post<DeterministicReport>("/internal/validate", extracted, headers);
}
