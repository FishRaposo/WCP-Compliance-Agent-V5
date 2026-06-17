import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import type { ExtractedWCP } from "../types.js";

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: config.INTERNAL_SERVICE_TOKEN
    ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
    : {},
});

export async function extractTool(text: string, headers?: Record<string, string>): Promise<ExtractedWCP> {
  return complianceClient.post<ExtractedWCP>("/internal/extract", { text }, headers);
}
