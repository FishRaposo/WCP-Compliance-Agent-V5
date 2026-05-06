import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export const agentClient = new ServiceClient({
  baseUrl: config.AGENT_URL,
  headers: { "X-Service": "gateway" },
});

export async function startAnalysis(text: string, jobId?: string) {
  return agentClient.post("/internal/workflows/wcp-pipeline", { text, job_id: jobId });
}

export async function getWorkflowStatus(workflowId: string) {
  return agentClient.get(`/internal/workflows/${workflowId}/status`);
}
