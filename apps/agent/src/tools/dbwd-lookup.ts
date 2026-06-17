import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: config.INTERNAL_SERVICE_TOKEN
    ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
    : {},
});

export async function dbwdLookupTool(trade: string, locality: string, date: string, headers?: Record<string, string>) {
  return complianceClient.get(`/internal/dbwd/${encodeURIComponent(trade)}/${encodeURIComponent(locality)}/${date}`, headers);
}
