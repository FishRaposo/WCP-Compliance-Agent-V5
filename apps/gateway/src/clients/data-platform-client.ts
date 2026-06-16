import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
  headers: { "X-Service": "gateway" },
});

/** Build the X-Tenant-Id header so reads/writes are scoped to the caller's tenant. */
function tenantHeaders(tenantId?: string): Record<string, string> | undefined {
  return tenantId ? { "X-Tenant-Id": tenantId } : undefined;
}

export async function createDecision(decision: unknown) {
  return dataPlatformClient.post<{ decision_id: string }>("/internal/decisions", decision);
}

export async function getDecisions(params?: Record<string, string>, tenantId?: string) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/decisions${qs}`, tenantHeaders(tenantId));
}

export async function getDecision(id: string, tenantId?: string) {
  return dataPlatformClient.get<unknown>(`/internal/decisions/${id}`, tenantHeaders(tenantId));
}

export async function overrideDecision(id: string, body: unknown, tenantId?: string) {
  return dataPlatformClient.post<unknown>(
    `/internal/decisions/${id}/override`,
    body,
    tenantHeaders(tenantId),
  );
}

export async function createAuditEvent(event: unknown) {
  return dataPlatformClient.post("/internal/audit-events", event);
}

export async function getContracts(params?: Record<string, string>, tenantId?: string) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/contracts${qs}`, tenantHeaders(tenantId));
}

export async function createContract(contract: unknown, tenantId?: string) {
  return dataPlatformClient.post<unknown>(
    "/internal/contracts",
    contract,
    tenantHeaders(tenantId),
  );
}

export async function getContract(id: string, tenantId?: string) {
  return dataPlatformClient.get<unknown>(`/internal/contracts/${id}`, tenantHeaders(tenantId));
}

export async function patchContract(id: string, patch: unknown, tenantId?: string) {
  return dataPlatformClient.patch<unknown>(
    `/internal/contracts/${id}`,
    patch,
    tenantHeaders(tenantId),
  );
}

export async function getPayrolls(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/payrolls${qs}`);
}

export async function bulkImportPayrolls(payrolls: unknown) {
  return dataPlatformClient.post<unknown>("/internal/payrolls/bulk", payrolls);
}
