import {
  TraceContextSchema,
  type TraceContext,
} from "./generated/typescript/index.js";

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
    const timer = setTimeout(() => reject(new Error("operation timed out")), timeoutMs);
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
        const timedOut = error instanceof Error && error.message === "operation timed out";
        if (timedOut && this.maxAttempts === 1) {
          throw this.error("timeout", attempt, traceContext, "In-process service call timed out", error);
        }
        if (attempt === this.maxAttempts) {
          throw this.error(
            this.maxAttempts > 1 ? "retry_exhausted" : "upstream_error",
            attempt,
            traceContext,
            "In-process service call failed",
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
export class InMemoryDecisionStore<TDecision extends { job_id: string }> {
  private readonly records = new Map<string, TDecision>();
  private readonly adapter: InProcessServiceAdapter<TDecision, TDecision>;

  constructor(
    config: Omit<InProcessServiceAdapterConfig<TDecision, TDecision>, "operation" | "execute" | "idempotent">,
  ) {
    this.adapter = new InProcessServiceAdapter({
      ...config,
      operation: "persist",
      idempotent: false,
      execute: async (decision) => {
        const existing = this.records.get(decision.job_id);
        if (existing) return existing;
        this.records.set(decision.job_id, decision);
        return decision;
      },
    });
  }

  get size(): number {
    return this.records.size;
  }

  persist(request: InProcessCall<TDecision>): Promise<TDecision> {
    return this.adapter.call(request);
  }
}
