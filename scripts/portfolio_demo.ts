import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ManifestEntry = {
  name: string;
  sha256: string;
  content_type: string;
  bytes: number;
};

export type EvidenceManifest = {
  schema_version: "v1";
  artifact_id: string;
  entries: ManifestEntry[];
  reproducibility_sha256: string;
};

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedBundleDirectory = resolve(
  repositoryRoot,
  "artifacts/portfolio/wcp-compliance-agent-v5-evidence",
);
const goldenFixturePath = resolve(repositoryRoot, "tests/fixtures/golden/portfolio-evidence.json");

const secretKeyPattern = /(token|secret|password|authorization|api[_-]?key|credential)/i;
const secretValuePatterns = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{8,}/i,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const runtimeOnlyKeys = new Set([
  "created_at",
  "updated_at",
  "timestamp",
  "started_at",
  "finished_at",
  "runtime_ms",
  "duration_ms",
  "elapsed_ms",
  "latency_ms",
  "filesystem_path",
  "cwd",
  "environment",
  "generated_id",
  "idempotency_key",
  "request_id",
  "trace_id",
  "stream_id",
  "event_id",
  "job_id",
  "ordered_ids",
  "resumed_ids",
]);

function canonicalValue(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) result[key] = canonicalValue(record[key]);
    }
    return result;
  }
  return String(value);
}

/** Stable UTF-8 JSON serialization used by fixtures, manifests, and reproducibility hashes. */
export function stableSerialize(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalHash(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value), "utf8").digest("hex");
}

/**
 * Remove runtime-only fields and redact secret-shaped keys and values recursively.
 * Meaningful arrays retain their order; object keys are canonicalized separately.
 */
export function normalizeEvidence(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return canonicalValue(value);
  }
  if (typeof value === "string") {
    return secretValuePatterns.some((pattern) => pattern.test(value)) ? "[REDACTED]" : value;
  }
  if (Array.isArray(value)) return value.map((item) => normalizeEvidence(item));
  if (typeof value === "object") {
    const normalized: Record<string, JsonValue> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (runtimeOnlyKeys.has(key)) continue;
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      normalized[key] = secretKeyPattern.test(key) ? "[REDACTED]" : normalizeEvidence(item);
    }
    return normalized;
  }
  return String(value);
}

const canonicalPayroll = [
  "Contractor: Offline Electric LLC",
  "Project: Library retrofit",
  "Project location: Washington, DC",
  "Wage determination: DC20240001",
  "Week ending: 2026-01-10",
  "Certification date: 2026-01-15",
  "Employee: Jane Doe",
  "Trade: Electrician",
  "Hours: 40",
  "Overtime hours: 0",
  "Hourly wage: 55",
  "Fringe benefits: 1400",
  "Gross earnings: 2200",
  "Deductions: 150",
  "Net wages: 2050",
].join("\n");

function runDataPlatformCacheScenario(): Record<string, unknown> {
  const dataPlatformRoot = resolve(repositoryRoot, "apps/data-platform");
  const complianceCoreRoot = resolve(repositoryRoot, "apps/compliance-core");
  const configured = process.env.DATA_PLATFORM_PYTHON?.trim();
  const candidates = [
    configured ? { command: configured, args: [] as string[] } : null,
    process.platform === "win32"
      ? { command: resolve(dataPlatformRoot, ".venv/Scripts/python.exe"), args: [] as string[] }
      : { command: resolve(dataPlatformRoot, ".venv/bin/python"), args: [] as string[] },
    process.platform === "win32"
      ? { command: resolve(complianceCoreRoot, ".venv/Scripts/python.exe"), args: [] as string[] }
      : { command: resolve(complianceCoreRoot, ".venv/bin/python"), args: [] as string[] },
    process.platform === "win32"
      ? { command: "python", args: [] as string[] }
      : { command: "python3", args: [] as string[] },
    process.platform === "win32" ? { command: "py", args: ["-3"] } : null,
  ].filter((candidate): candidate is { command: string; args: string[] } => candidate !== null);

  const program = [
    "import asyncio, json",
    "from wcp_data.services import redis_cache",
    "class UnavailableRedis:",
    "    async def get(self, key): raise ConnectionError('offline')",
    "    async def setex(self, key, ttl, value): raise ConnectionError('offline')",
    "async def unavailable(): return UnavailableRedis()",
    "async def main():",
    "    redis_cache._memory_cache.clear()",
    "    redis_cache._get_redis = unavailable",
    "    await redis_cache.cache_set('dbwd:evidence', {'rate': 51.69}, ttl=60)",
    "    value = await redis_cache.cache_get('dbwd:evidence')",
    "    print(json.dumps({'backend': 'memory', 'fallback_hit': value == {'rate': 51.69}, 'rate': value['rate'], 'redis_required': False}, sort_keys=True))",
    "asyncio.run(main())",
  ].join("\n");

  let lastFailure = "no Python interpreter was available";
  for (const candidate of candidates) {
    if (candidate.command.includes(".venv") && !existsSync(candidate.command)) continue;
    const result = spawnSync(candidate.command, [...candidate.args, "-c", program], {
      cwd: dataPlatformRoot,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONPATH: [resolve(dataPlatformRoot, "src"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    if (result.error && (result.error as NodeJS.ErrnoException).code === "ENOENT") continue;
    if (result.status === 0) {
      try {
        return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
      } catch {
        lastFailure = "Data Platform cache evidence returned malformed JSON";
        continue;
      }
    }
    lastFailure = result.stderr.trim() || result.error?.message || `Python exited ${result.status}`;
  }
  throw new Error(`Unable to exercise Data Platform cache fallback: ${lastFailure}`);
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

/** Run the fixed, credential-free five-service proof and return only normalized evidence. */
export async function runPortfolioScenario(): Promise<JsonValue> {
  process.env.NODE_ENV = "test";
  process.env.LLM_MODE = "mock";
  process.env.AGENT_SERVICE_TRANSPORT = "in-process";
  process.env.WCP_MOCK_AUTH = "true";

  const [bridge, offline, sse, frontend] = await Promise.all([
    import("../apps/agent/src/compliance-core-bridge.js"),
    import("../apps/agent/src/offline-composition.js"),
    import("../apps/gateway/src/lib/sse-bridge.js"),
    import("../apps/web/src/utils/mock-data.js"),
  ]);

  const extracted = (await bridge.runComplianceCoreBridge("extract", {
    text: canonicalPayroll,
  })) as Record<string, any>;
  const validation = (await bridge.runComplianceCoreBridge("validate", extracted)) as Record<string, any>;

  const jobId = "portfolio-offline-job";
  const firstDecision = await offline.runOfflineAgentPipeline(
    { job_id: jobId, text: canonicalPayroll },
    { "x-request-id": "portfolio-request-1", "x-trace-id": "portfolio-trace-1" },
  );
  const firstRecord = offline.offlineDecisionStore.get(jobId);
  await offline.runOfflineAgentPipeline(
    { job_id: jobId, text: canonicalPayroll },
    { "x-request-id": "portfolio-request-2", "x-trace-id": "portfolio-trace-2" },
  );
  const duplicateRecord = offline.offlineDecisionStore.get(jobId);
  const recentAudit = offline.offlineDecisionStore.getAuditEvents(jobId).slice(-2);

  sse.clearSSEEventHistory();
  const firstEvent = await sse.publishSSEEvent(
    "wcp.decisions",
    {
      type: "decision.created",
      data: { job_id: jobId, verdict: firstDecision.verdict },
      timestamp: "2026-08-14T12:00:00.000Z",
    },
    "",
  );
  await sse.publishSSEEvent(
    "wcp.decisions",
    {
      type: "job.completed",
      data: { job_id: jobId, persisted: true },
      timestamp: "2026-08-14T12:00:01.000Z",
    },
    "",
  );
  const orderedEvents = sse.getSSEEventsAfter("wcp.decisions");
  const resumedEvents = sse.getSSEEventsAfter("wcp.decisions", firstEvent.streamId);

  const employees = Array.isArray(extracted.employees) ? extracted.employees : [];
  const checks = Array.isArray(validation.checks) ? validation.checks : [];
  const stepNames = Object.keys(firstDecision.step_latencies ?? {}).sort();
  const frontendVerdicts = frontend.mockDecisionSummaries.map((item) => item.verdict);

  return normalizeEvidence({
    schema_version: "v1",
    scenario: "offline-portfolio",
    mode: { provider_access_required: false, network_required: false, llm: "mock" },
    extraction: {
      contractor: extracted.contractor?.name,
      project: extracted.project?.name,
      locality: extracted.project?.location,
      wage_determination: extracted.project?.wage_determination_number,
      week_ending: extracted.week_ending,
      employee_count: employees.length,
      employees: employees.map((employee: Record<string, unknown>) => ({
        name: employee.name,
        trade: employee.trade_classification,
        hours: employee.hours_worked,
        hourly_wage: employee.hourly_wage,
      })),
      noncanonical_input_issues: extracted.offline_metadata?.noncanonical_input_issues ?? [],
    },
    validation: {
      overall_status: validation.overall_status,
      violation_count: validation.violation_count,
      warning_count: validation.warning_count,
      passed_count: validation.passed_count,
      status_counts: countBy(checks.map((check: Record<string, unknown>) => String(check.status))),
      check_types: [...new Set(checks.map((check: Record<string, unknown>) => String(check.check_type)))].sort(),
      failing_check_types: checks
        .filter((check: Record<string, unknown>) => check.status === "fail")
        .map((check: Record<string, unknown>) => String(check.check_type))
        .sort(),
    },
    agent_synthesis: {
      verdict: firstDecision.verdict,
      trust_score: Number(firstDecision.trust_score.toFixed(6)),
      trust_band: firstDecision.trust_band,
      requires_human_review: firstDecision.requires_human_review,
      llm_confidence: firstDecision.llm_confidence,
      citations: firstDecision.citations.map((citation) => citation.regulation).sort(),
      deterministic_truth_in_reasoning: firstDecision.reasoning_summary.includes("deterministic"),
    },
    persistence: {
      record_count: offline.offlineDecisionStore.size,
      idempotency_verified: firstRecord?.id === duplicateRecord?.id,
      audit_event_count: recentAudit.length,
      audit_event_types: recentAudit.map((event) => event.event_type),
      audit_actors: [...new Set(recentAudit.map((event) => event.actor))].sort(),
    },
    cache_fallback: runDataPlatformCacheScenario(),
    sse: {
      ordered_event_count: orderedEvents.length,
      ordered_types: orderedEvents.map((event) => event.type),
      resumed_event_count: resumedEvents.length,
      resumed_types: resumedEvents.map((event) => event.type),
      resume_verified: resumedEvents.length === 1 && resumedEvents[0]?.type === "job.completed",
    },
    economics: {
      cost_usd: firstDecision.cost_usd ?? 0,
      latency: {
        recorded: typeof firstDecision.latency_ms === "number",
        runtime_values_normalized: true,
        step_names: stepNames,
        unit: "milliseconds",
      },
    },
    frontend_fixtures: {
      decision_count: frontend.mockDecisionSummaries.length,
      verdict_counts: countBy(frontendVerdicts),
      analytics_total_decisions: frontend.mockAnalyticsOverview.total_decisions,
      analysis_fixture: {
        verdict: frontend.mockTrustScoredDecision.verdict,
        trust_score: frontend.mockTrustScoredDecision.trust_score,
      },
      ingestion_statuses: frontend.mockIngestionJobs.map((job) => job.status).sort(),
    },
  });
}

function prettyStableJson(value: unknown): string {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function humanReport(report: Record<string, any>, reproducibilityHash: string): string {
  return [
    "# WCP Compliance Agent V5 portfolio evidence",
    "",
    "This bundle was generated by the credential-free, network-free portfolio scenario.",
    "",
    `- Schema: ${report.schema_version}`,
    `- Verdict: ${report.agent_synthesis?.verdict}`,
    `- Trust score: ${report.agent_synthesis?.trust_score}`,
    `- Deterministic status: ${report.validation?.overall_status}`,
    `- Persisted records: ${report.persistence?.record_count}`,
    `- Cache backend: ${report.cache_fallback?.backend}`,
    `- SSE events: ${report.sse?.ordered_event_count ?? 0}`,
    `- Reproducibility SHA-256: ${reproducibilityHash}`,
    "",
  ].join("\n");
}

/** Write manifest, canonical reports, and the checksum index. */
export function writeEvidenceBundle(directory: string, reportValue: unknown): EvidenceManifest {
  const report = normalizeEvidence(reportValue) as Record<string, any>;
  const reproducibilityHash = canonicalHash(report);
  mkdirSync(directory, { recursive: true });

  const reportJson = prettyStableJson(report);
  const reportMarkdown = humanReport(report, reproducibilityHash);
  const artifacts = [
    { name: "report.json", content: reportJson, content_type: "application/json" },
    { name: "report.md", content: reportMarkdown, content_type: "text/markdown" },
  ];
  const entries = artifacts.map((artifact) => ({
    name: artifact.name,
    sha256: sha256Text(artifact.content),
    content_type: artifact.content_type,
    bytes: Buffer.byteLength(artifact.content, "utf8"),
  }));

  for (const artifact of artifacts) {
    writeFileSync(resolve(directory, artifact.name), artifact.content, "utf8");
  }
  const manifest: EvidenceManifest = {
    schema_version: "v1",
    artifact_id: "wcp-compliance-agent-v5-offline-evidence",
    entries,
    reproducibility_sha256: reproducibilityHash,
  };
  writeFileSync(resolve(directory, "manifest.json"), prettyStableJson(manifest), "utf8");
  writeFileSync(
    resolve(directory, "checksums.sha256"),
    `${entries.map((entry) => `${entry.sha256}  ${entry.name}`).join("\n")}\n`,
    "utf8",
  );
  return manifest;
}

async function main(): Promise<void> {
  const report = await runPortfolioScenario();
  if (!existsSync(goldenFixturePath)) {
    throw new Error(`Golden evidence fixture is missing: ${goldenFixturePath}`);
  }
  const golden = JSON.parse(readFileSync(goldenFixturePath, "utf8")) as unknown;
  if (stableSerialize(report) !== stableSerialize(golden)) {
    throw new Error("Normalized portfolio evidence does not match the committed golden fixture");
  }
  const manifest = writeEvidenceBundle(generatedBundleDirectory, report);
  process.stdout.write(
    `Evidence bundle written: ${generatedBundleDirectory}\nReproducibility SHA-256: ${manifest.reproducibility_sha256}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`Portfolio evidence generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
