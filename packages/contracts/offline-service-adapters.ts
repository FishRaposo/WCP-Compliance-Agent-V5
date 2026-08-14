import {
  AuditEventSchema,
  TraceContextSchema,
  type AuditEvent,
  type DecisionRecord,
  type TraceContext,
  type TrustScoredDecision,
} from "./generated/typescript/index.js";

export type OfflineTrustScoredDecision = Omit<TrustScoredDecision, "cost_usd" | "latency_ms"> & {
  cost_usd?: number | null;
  latency_ms?: number | null;
};

/** Mirrors Data Platform's nullable DecisionResponse fields. */
export type OfflineDecisionResponse = Omit<DecisionRecord, "cost_usd" | "latency_ms"> & {
  cost_usd?: number | null;
  latency_ms?: number | null;
};

export type ServiceName = "external" | "gateway" | "agent" | "compliance-core" | "data-platform";
export type ServiceTraceContext = TraceContext;

export type OfflineErrorCode =
  | "boundary_violation"
  | "timeout"
  | "retry_exhausted"
  | "upstream_error";

/** Additive diagnostic details; existing upstream response/error fields are not rewritten. */
export type OfflineErrorMetadata = {
  code: OfflineErrorCode;
  service: Exclude<ServiceName, "external">;
  operation: string;
  attempts: number;
  timeout_ms: number;
  trace_context: ServiceTraceContext;
};

export class OfflineServiceError extends Error {
  readonly metadata: OfflineErrorMetadata;
  readonly cause?: unknown;

  constructor(message: string, metadata: OfflineErrorMetadata, cause?: unknown) {
    super(message);
    this.name = "OfflineServiceError";
    this.metadata = metadata;
    this.cause = cause;
  }
}

/** Dedicated transport timeout tag; upstream error messages are never inspected. */
export class InProcessTimeoutError extends Error {
  readonly code = "IN_PROCESS_TIMEOUT";

  constructor(readonly timeout_ms: number) {
    super(`In-process operation exceeded ${timeout_ms}ms`);
    this.name = "InProcessTimeoutError";
  }
}

export type InProcessCall<TPayload> = {
  caller: ServiceName;
  payload: TPayload;
  trace_context: ServiceTraceContext;
};

export type InProcessServiceAdapterConfig<TPayload, TResult> = {
  service: Exclude<ServiceName, "external">;
  operation: string;
  allowedCallers: readonly ServiceName[];
  execute: (payload: TPayload, traceContext: ServiceTraceContext) => Promise<TResult>;
  /** Only idempotent operations may use more than one attempt. */
  idempotent?: boolean;
  /** Explicit per-attempt deadline, defaulting to five seconds for offline execution. */
  timeout_ms?: number;
  /** Upper bound including the first attempt; ignored for writes. */
  max_attempts?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;

function timeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new InProcessTimeoutError(timeoutMs)), timeoutMs);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Deterministic, network-free transport for a declared internal service boundary.
 * It is intentionally a transport seam: it does not alter legacy payload fields or status values.
 */
export class InProcessServiceAdapter<TPayload, TResult> {
  private readonly config: Required<
    Pick<InProcessServiceAdapterConfig<TPayload, TResult>, "service" | "operation" | "allowedCallers" | "execute">
  > & Pick<InProcessServiceAdapterConfig<TPayload, TResult>, "idempotent">;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(config: InProcessServiceAdapterConfig<TPayload, TResult>) {
    const timeoutMs = config.timeout_ms ?? DEFAULT_TIMEOUT_MS;
    const requestedAttempts = config.max_attempts ?? 1;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError("timeout_ms must be a positive integer");
    }
    if (!Number.isInteger(requestedAttempts) || requestedAttempts <= 0) {
      throw new RangeError("max_attempts must be a positive integer");
    }
    this.config = config;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = config.idempotent ? requestedAttempts : 1;
  }

  async call(request: InProcessCall<TPayload>): Promise<TResult> {
    const traceContext = TraceContextSchema.parse(request.trace_context);
    if (!this.config.allowedCallers.includes(request.caller)) {
      throw this.error("boundary_violation", 0, traceContext, "Caller is not allowed to invoke this service");
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await timeout(this.config.execute(request.payload, traceContext), this.timeoutMs);
      } catch (error) {
        lastError = error;
        const timedOut = error instanceof InProcessTimeoutError;
        if (timedOut && this.maxAttempts === 1) {
          throw this.error("timeout", attempt, traceContext, "In-process service call timed out", error);
        }
        if (attempt === this.maxAttempts) {
          throw this.error(
            timedOut ? "timeout" : this.maxAttempts > 1 ? "retry_exhausted" : "upstream_error",
            attempt,
            traceContext,
            timedOut ? "In-process service call timed out" : "In-process service call failed",
            error,
          );
        }
      }
    }

    throw this.error("upstream_error", this.maxAttempts, traceContext, "In-process service call failed", lastError);
  }

  private error(
    code: OfflineErrorCode,
    attempts: number,
    traceContext: ServiceTraceContext,
    message: string,
    cause?: unknown,
  ): OfflineServiceError {
    return new OfflineServiceError(
      message,
      {
        code,
        service: this.config.service,
        operation: this.config.operation,
        attempts,
        timeout_ms: this.timeoutMs,
        trace_context: traceContext,
      },
      cause,
    );
  }
}

/**
 * Offline counterpart to Data Platform's job-id idempotency boundary. The store is private;
 * callers can persist only through the data-platform adapter, never through direct storage.
 */
export class InMemoryDecisionStore {
  private readonly records = new Map<string, OfflineDecisionResponse>();
  private readonly auditEvents: AuditEvent[] = [];
  private readonly adapter: InProcessServiceAdapter<OfflineTrustScoredDecision, OfflineDecisionResponse>;
  private readonly now: () => string;
  private nextAuditId = 1;

  constructor(
    config: Omit<
      InProcessServiceAdapterConfig<OfflineTrustScoredDecision, OfflineDecisionResponse>,
      "operation" | "execute" | "idempotent"
    > & { now?: () => string },
  ) {
    const { now = () => new Date().toISOString(), ...adapterConfig } = config;
    this.now = now;
    this.adapter = new InProcessServiceAdapter({
      ...adapterConfig,
      operation: "persist",
      idempotent: false,
      execute: async (decision, traceContext) => {
        const existing = this.records.get(decision.job_id);
        const record: OfflineDecisionResponse = {
          id: existing?.id ?? `offline-decision-${decision.job_id}`,
          job_id: decision.job_id,
          verdict: decision.verdict,
          trust_score: decision.trust_score,
          trust_band: decision.trust_band,
          requires_human_review: decision.requires_human_review ?? false,
          violation_count: decision.violation_count ?? 0,
          warning_count: decision.warning_count ?? 0,
          reasoning_summary: decision.reasoning_summary,
          citations: decision.citations ?? [],
          cost_usd: decision.cost_usd,
          latency_ms: decision.latency_ms,
          phoenix_trace_id: decision.phoenix_trace_id,
          contract_id: decision.contract_id,
          created_at: existing?.created_at ?? decision.created_at ?? this.now(),
        };
        this.records.set(decision.job_id, record);
        this.appendAuditEvent(
          decision.job_id,
          "decision_persisted",
          "agent",
          {
            decision_id: record.id,
            verdict: record.verdict,
            trust_score: record.trust_score,
            trust_band: record.trust_band,
            requires_human_review: record.requires_human_review,
          },
          decision.citations?.flatMap((citation) => {
            const regulation = (citation as { regulation?: unknown }).regulation;
            return typeof regulation === "string" && regulation ? [regulation] : [];
          }) ?? [],
          traceContext,
        );
        if (record.requires_human_review) {
          this.appendAuditEvent(
            decision.job_id,
            "human_review_queued",
            "system",
            {
              decision_id: record.id,
              trust_score: record.trust_score,
              trust_band: record.trust_band,
            },
            [],
            traceContext,
          );
        }
        return record;
      },
    });
  }

  get size(): number {
    return this.records.size;
  }

  persist(request: InProcessCall<OfflineTrustScoredDecision>): Promise<OfflineDecisionResponse> {
    return this.adapter.call(request);
  }

  get(jobId: string): OfflineDecisionResponse | undefined {
    return this.records.get(jobId);
  }

  getAuditEvents(jobId?: string): AuditEvent[] {
    return this.auditEvents.filter((event) => jobId === undefined || event.job_id === jobId);
  }

  private appendAuditEvent(
    jobId: string,
    eventType: "decision_persisted" | "human_review_queued",
    actor: "agent" | "system",
    payload: Record<string, unknown>,
    regulationReferences: string[],
    traceContext: ServiceTraceContext,
  ): void {
    const event = AuditEventSchema.parse({
      id: `offline-audit-${this.nextAuditId}`,
      job_id: jobId,
      event_type: eventType,
      actor,
      payload,
      regulation_references: regulationReferences,
      trace_id: traceContext.trace_id ?? "",
      created_at: this.now(),
    });
    this.nextAuditId += 1;
    this.auditEvents.push(event);
  }
}
