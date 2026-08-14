import {
  CostLatencySchema,
  EvidenceManifestSchema,
  PipelineEventSchema,
  TraceContextSchema,
} from "./generated/typescript/index.js";

type WirePayload = Record<string, unknown>;

export type PipelineMetadata = {
  trace_context?: unknown;
  cost_latency?: unknown;
  evidence_manifest?: unknown;
};

/**
 * Add optional pipeline metadata without renaming, filtering, or coercing the
 * existing payload. This keeps legacy HTTP wire shapes contract-compatible.
 */
export function attachPipelineMetadata<T extends WirePayload>(
  payload: T,
  metadata: PipelineMetadata,
): T & PipelineMetadata {
  return { ...payload, ...metadata };
}

/** Validate an additive event envelope while preserving the established event vocabulary. */
export function createPipelineEvent(event: WirePayload): WirePayload {
  return PipelineEventSchema.parse(event);
}

export const pipelineMetadataSchemas = {
  trace_context: TraceContextSchema,
  cost_latency: CostLatencySchema,
  evidence_manifest: EvidenceManifestSchema,
};
