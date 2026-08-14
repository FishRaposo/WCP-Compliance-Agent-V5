import { randomUUID } from "node:crypto";
import { RequestContext } from "@mastra/core/request-context";
import {
  InMemoryDecisionStore,
  InProcessServiceAdapter,
} from "@wcp/contracts/offline-service-adapters";

import { config } from "./config.js";
import { mastra } from "./mastra/index.js";
import {
  DeterministicReportSchema,
  ExtractedWCPSchema,
  TrustScoredDecisionSchema,
  type ExtractedWCP,
  type TrustScoredDecision,
} from "./mastra/schemas.js";
import {
  installInProcessAgentServices,
  SERVICE_TRANSPORT_KEY,
} from "./mastra/tools/http.js";
import { JOB_ID_KEY } from "./mastra/workflows/wcp-pipeline.js";
import { runComplianceCoreBridge } from "./compliance-core-bridge.js";

type PipelineInput = { text: string; job_id?: string };

const extract = new InProcessServiceAdapter({
  service: "compliance-core",
  operation: "extract",
  allowedCallers: ["agent"],
  idempotent: true,
  execute: async (input: { text: string }) =>
    ExtractedWCPSchema.parse(await runComplianceCoreBridge("extract", input)),
});

const validate = new InProcessServiceAdapter({
  service: "compliance-core",
  operation: "validate",
  allowedCallers: ["agent"],
  idempotent: true,
  execute: async (input: ExtractedWCP) =>
    DeterministicReportSchema.parse(await runComplianceCoreBridge("validate", input)),
});

export const offlineDecisionStore = new InMemoryDecisionStore({
  service: "data-platform",
  allowedCallers: ["agent"],
});

installInProcessAgentServices({ extract, validate, decisions: offlineDecisionStore });

export async function runOfflineAgentPipeline(
  input: PipelineInput,
  headers: Record<string, string>,
): Promise<TrustScoredDecision> {
  if (config.NODE_ENV === "production" || config.LLM_MODE !== "mock") {
    throw new Error("Offline Agent composition is allowed only in non-production mock mode");
  }

  const requestContext = new RequestContext();
  requestContext.set(SERVICE_TRANSPORT_KEY, "in-process");
  requestContext.set(JOB_ID_KEY, input.job_id ?? randomUUID());
  const requestId = headers["x-request-id"] || randomUUID();
  requestContext.set("x-request-id", requestId);
  requestContext.set("x-trace-id", headers["x-trace-id"] || requestId);

  const run = await mastra.getWorkflow("wcpPipeline").createRun();
  const result = await run.start({ inputData: { text: input.text }, requestContext });
  if (result.status !== "success") {
    const message = result.status === "failed" ? result.error?.message : `Pipeline ${result.status}`;
    throw new Error(message ?? "Pipeline failed");
  }
  return TrustScoredDecisionSchema.parse(result.result);
}
