import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
  headers: { "X-Service": "gateway" },
});

export async function createDecision(decision: unknown) {
  return dataPlatformClient.post<{ decision_id: string }>("/internal/decisions", decision);
}

export async function getDecisions(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/decisions${qs}`);
}

export async function getDecision(id: string) {
  return dataPlatformClient.get<unknown>(`/internal/decisions/${id}`);
}

export async function createAuditEvent(event: unknown) {
  return dataPlatformClient.post("/internal/audit-events", event);
}

export async function getContracts(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/contracts${qs}`);
}

export async function createContract(contract: unknown) {
  return dataPlatformClient.post<unknown>("/internal/contracts", contract);
}

export async function getContract(id: string) {
  return dataPlatformClient.get<unknown>(`/internal/contracts/${id}`);
}

export async function patchContract(id: string, patch: unknown) {
  return dataPlatformClient.patch<unknown>(`/internal/contracts/${id}`, patch);
}

export async function getPayrolls(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/payrolls${qs}`);
}

export async function bulkImportPayrolls(payrolls: unknown) {
  return dataPlatformClient.post<unknown>("/internal/payrolls/bulk", payrolls);
}
