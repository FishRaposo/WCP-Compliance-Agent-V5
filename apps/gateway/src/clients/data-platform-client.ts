import type { Context } from "hono";
import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import { getInternalHeaders } from "../lib/request-headers.js";

export const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
  headers: {
    "X-Service": "gateway",
    ...(config.INTERNAL_SERVICE_TOKEN
      ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
      : {}),
  },
});

export async function getContracts(c: Context, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/contracts${qs}`, getInternalHeaders(c));
}

export async function createContract(c: Context, contract: unknown) {
  return dataPlatformClient.post<unknown>("/internal/contracts", contract, getInternalHeaders(c));
}

export async function getContract(c: Context, id: string) {
  return dataPlatformClient.get<unknown>(`/internal/contracts/${id}`, getInternalHeaders(c));
}

export async function patchContract(c: Context, id: string, patch: unknown) {
  return dataPlatformClient.patch<unknown>(`/internal/contracts/${id}`, patch, getInternalHeaders(c));
}

export async function getPayrolls(c: Context, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return dataPlatformClient.get<unknown[]>(`/internal/payrolls${qs}`, getInternalHeaders(c));
}

export async function bulkImportPayrolls(c: Context, payrolls: unknown) {
  return dataPlatformClient.post<unknown>("/internal/payrolls/bulk", payrolls, getInternalHeaders(c));
}
