import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
});

export async function dbwdLookupTool(trade: string, locality: string, date: string, headers?: Record<string, string>) {
  return complianceClient.get(`/internal/dbwd/${encodeURIComponent(trade)}/${encodeURIComponent(locality)}/${date}`, headers);
}
