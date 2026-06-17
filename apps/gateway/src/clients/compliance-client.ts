import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: {
    "X-Service": "gateway",
    ...(config.INTERNAL_SERVICE_TOKEN
      ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
      : {}),
  },
});

export async function extractText(text: string) {
  return complianceClient.post("/internal/extract", { text });
}

export async function extractPdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return complianceClient.postForm("/internal/extract", formData);
}

export async function validate(extracted: unknown) {
  return complianceClient.post("/internal/validate", extracted);
}
