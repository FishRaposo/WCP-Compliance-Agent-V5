# Failure modes

| Failure | System behavior | Portfolio/offline behavior |
|---|---|---|
| Malformed WH-347 labels or values | Extraction records noncanonical issues; the offline bridge fails closed instead of auto-approving | Covered by golden and bridge tests |
| Compliance Core unavailable | Agent workflow fails because extraction and deterministic validation are required | Local evidence invokes the canonical bridge directly |
| LLM/provider unavailable | Real-mode synthesis degrades to the deterministic verdict | `LLM_MODE=mock` makes no provider call |
| Data Platform unavailable | Official persistence fails; Agent does not write around the boundary | Local adapter records deterministic decision/audit evidence |
| PostgreSQL unavailable | Persistence and database-backed queries fail | Not required by the evidence bundle or Web fixture smoke |
| Redis unavailable or malformed data | Cache and SSE fall back to in-memory behavior; persistence is not rolled back | Cache fallback and replay are included in evidence/tests |
| SSE reconnect | Gateway resumes after `Last-Event-ID` with per-client Redis cursors or local replay history | Ordering/resume tests cover both paths |
| Duplicate persistence request | Idempotency key returns the existing logical result | Covered by the local evidence scenario |
| SAM.gov unavailable | External refresh cannot obtain new rates; deterministic fixture/current stored rates remain usable | Canonical evidence uses fixed rates |
| Evidence tampering | Dependency-free verifier returns nonzero for missing, malformed, unindexed, or checksum-mismatched content | Covered by negative tests |

Retries and timeouts apply only to safe/idempotent internal calls. The project does
not hide external-infrastructure failures behind an approval result.
