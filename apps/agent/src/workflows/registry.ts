/**
 * In-memory workflow status registry.
 *
 * Tracks the lifecycle of each analysis pipeline run so the status endpoint can
 * return real pending/running/completed/failed state and per-step progress —
 * replacing the previous hardcoded "completed" stub. Bounded to avoid unbounded
 * growth in a long-lived process. (A Redis-backed variant is the multi-replica
 * upgrade path; in-memory matches the current single-process dev mode.)
 */

export type WorkflowStatus = "pending" | "running" | "completed" | "failed";
export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowStep {
  name: string;
  status: StepStatus;
  started_at?: string;
  ended_at?: string;
}

export interface WorkflowRecord {
  workflow_id: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
  decision_id?: string;
  error?: string;
}

const MAX_WORKFLOWS = 1000;
const registry = new Map<string, WorkflowRecord>();

const now = (): string => new Date().toISOString();

function evictIfNeeded(): void {
  while (registry.size > MAX_WORKFLOWS) {
    const oldest = registry.keys().next().value;
    if (oldest === undefined) break;
    registry.delete(oldest);
  }
}

export function createWorkflow(
  workflowId: string,
  stepNames: string[]
): WorkflowRecord {
  const ts = now();
  const record: WorkflowRecord = {
    workflow_id: workflowId,
    status: "running",
    steps: stepNames.map((name) => ({ name, status: "pending" as StepStatus })),
    created_at: ts,
    updated_at: ts,
  };
  registry.set(workflowId, record);
  evictIfNeeded();
  return record;
}

function updateStep(
  workflowId: string,
  name: string,
  status: StepStatus
): void {
  const record = registry.get(workflowId);
  if (!record) return;
  const step = record.steps.find((s) => s.name === name);
  if (!step) return;
  step.status = status;
  if (status === "running") step.started_at = now();
  if (status === "completed" || status === "failed") step.ended_at = now();
  record.updated_at = now();
}

export function startStep(workflowId: string, name: string): void {
  updateStep(workflowId, name, "running");
}

export function completeStep(workflowId: string, name: string): void {
  updateStep(workflowId, name, "completed");
}

export function completeWorkflow(workflowId: string, decisionId?: string): void {
  const record = registry.get(workflowId);
  if (!record) return;
  record.status = "completed";
  record.decision_id = decisionId;
  record.updated_at = now();
}

export function failWorkflow(workflowId: string, error: string): void {
  const record = registry.get(workflowId);
  if (!record) return;
  record.status = "failed";
  record.error = error;
  for (const step of record.steps) {
    if (step.status === "running") {
      step.status = "failed";
      step.ended_at = now();
    }
  }
  record.updated_at = now();
}

export function getWorkflow(workflowId: string): WorkflowRecord | undefined {
  return registry.get(workflowId);
}
