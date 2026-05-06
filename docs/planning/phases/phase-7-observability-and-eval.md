# Phase 7: Observability & Eval Hardening

**Goal:** Full distributed tracing across all 5 services, Langfuse prompt tracking, golden-set evaluation CI, cost and latency dashboards.

**Prerequisites:** Phase 4 complete (vertical slice works). Can run in parallel with Phase 5 and Phase 6.
**Estimated Time:** 2–3 sessions.

## Task Breakdown

### 7.1 OpenTelemetry Traces

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.1.1 | Add OTel SDK to compliance-core | `apps/compliance-core/pyproject.toml`, `src/wcp_compliance/observability/` (new) | `opentelemetry-sdk`, `opentelemetry-exporter-otlp`, `opentelemetry-instrumentation-fastapi` |
| 7.1.2 | Add OTel SDK to data-platform | `apps/data-platform/pyproject.toml`, `src/wcp_data/observability/` (new) | Same packages |
| 7.1.3 | Add OTel to Gateway | `apps/gateway/package.json` | `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` |
| 7.1.4 | Add OTel to Agent | `apps/agent/package.json` | Same packages |
| 7.1.5 | Implement trace propagation | All services | Gateway generates root span → passes `traceparent` header → Agent continues → Compliance Core/Data Platform continue |
| 7.1.6 | Port Phoenix setup | V3 `backend/src/wcp_backend/observability/phoenix_setup.py` | `apps/compliance-core/src/wcp_compliance/observability/phoenix_setup.py` (new) |
| 7.1.7 | Port span helpers | V3 `backend/src/wcp_backend/observability/tracing.py` (103 lines) | `apps/compliance-core/src/wcp_compliance/observability/tracing.py` (new) |
| 7.1.8 | Port metrics | V3 `backend/src/wcp_backend/observability/metrics.py` (23 lines) | `apps/compliance-core/src/wcp_compliance/observability/metrics.py` (new) — decision_latency, token_usage, trust_score histograms |
| 7.1.9 | Verify trace continuity | Manual test | Single request produces spans across all 4 backend services |

### 7.2 Langfuse Prompt Tracking

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.2.1 | Verify Langfuse client initialization | `apps/agent/src/observability/langfuse.ts` | Already scaffolded — verify with real keys |
| 7.2.2 | Verify generation logging | `apps/agent/src/agents/wcp-verdict.ts` | Every LLM call logged to Langfuse with input/output/model/usage |
| 7.2.3 | Add prompt version to decision metadata | `apps/agent/src/workflows/wcp-pipeline.ts` | Include `prompt_version` in DecisionDraft |
| 7.2.4 | Verify prompt registry fetches from Langfuse | `apps/agent/src/prompts/registry.ts` | Hosted prompts take precedence over local |
| 7.2.5 | Verify cost tracking integration | `apps/agent/src/observability/cost-tracking.ts` | Per-model cost logged to Langfuse |

### 7.3 Golden-Set Evaluation

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.3.1 | Create golden-set directory | `apps/compliance-core/tests/eval/golden_set/` | Port 100 examples from V3 |
| 7.3.2 | Port golden-set examples | V3 `backend/tests/eval/` | `apps/compliance-core/tests/eval/golden_set/examples.json` (new) |
| 7.3.3 | Port golden-set test runner | V3 `backend/tests/eval/` | `apps/compliance-core/tests/eval/test_golden_set.py` (new) |
| 7.3.4 | Port baseline scores | V3 `backend/tests/eval/baseline_scores.json` | `apps/compliance-core/tests/eval/baseline_scores.json` (new) |
| 7.3.5 | Port regression test | V3 `backend/tests/eval/regression_test.py` | `apps/compliance-core/tests/eval/test_regression.py` (new) |
| 7.3.6 | Add golden-set fixtures to test-fixtures | `packages/test-fixtures/golden_set/` | Copy sample PDFs and expected results |
| 7.3.7 | Port baseline generation script | V3 `backend/scripts/generate_baseline.py` | `apps/compliance-core/scripts/generate_baseline.py` (new) |

### 7.4 Cost and Latency Tracking

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.4.1 | Verify cost tracking computation | `apps/agent/src/observability/cost-tracking.ts` | Already scaffolded — verify with real token counts |
| 7.4.2 | Add latency tracking to pipeline | `apps/agent/src/workflows/wcp-pipeline.ts` | Record per-step timing |
| 7.4.3 | Verify cost/latency storage | `apps/data-platform/src/wcp_data/models/tables.py` | `cost_usd` and `latency_ms` columns already exist in decisions table |
| 7.4.4 | Port Celery job queue (optional) | V3 `backend/src/wcp_backend/services/job_queue.py` (306 lines) | `apps/data-platform/src/wcp_data/workers/` (new) — if async eval is needed |

### 7.5 Prompt Version Comparison

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.5.1 | Add V2 prompt template | `apps/agent/src/prompts/versions/wcp-verdict-v2.ts` (new) | Port from V3 — adds constraints about check ID references and no-override rules |
| 7.5.2 | Add A/B prompt comparison | `apps/agent/src/prompts/registry.ts` | Support selecting version by name for comparison |
| 7.5.3 | Log prompt version in Langfuse | `apps/agent/src/agents/wcp-verdict.ts` | Tag each generation with prompt version |

### 7.6 CI Integration

| # | Task | File(s) | Details |
|---|---|---|---|
| 7.6.1 | Create eval CI workflow | `.github/workflows/eval.yml` (new) | Scheduled golden-set evaluation |
| 7.6.2 | Create main CI workflow | `.github/workflows/ci.yml` (new) | Three parallel jobs: TS pipeline, compliance-core Python, data-platform Python |
| 7.6.3 | Add Turborepo CI caching | `turbo.json` or CI config | Cache turbo artifacts between runs |

## Golden-Set Evaluation Gates

No PR should merge if:

- [ ] Any critical regression in deterministic check accuracy
- [ ] Loss of required regulation citations
- [ ] Trust score drift above accepted threshold
- [ ] Schema-incompatible decision output
- [ ] Silent LLM-only approvals when deterministic checks fail

## Exit Criteria

- [ ] Single request produces a continuous trace across Gateway → Agent → Compliance Core → Data Platform
- [ ] Langfuse dashboard shows all LLM generations with model, tokens, cost
- [ ] Prompt version is visible in decision metadata and Langfuse traces
- [ ] Golden-set evaluation runs and produces pass/fail results
- [ ] Baseline scores established for deterministic checks
- [ ] Cost and latency stored in every decision record
- [ ] Eval CI workflow configured
- [ ] V2 prompt template available for comparison
