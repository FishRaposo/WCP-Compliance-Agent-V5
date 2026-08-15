# Security and trust boundaries

## Decision authority

Compliance Core owns deterministic compliance truth. The Agent may explain and cite
the result, but `safeVerdict` rejects a non-rejected model verdict whenever the rule
engine found violations. The Agent cannot write database records; only Data Platform
creates official decisions and audit events.

## Authentication and service traffic

- Gateway owns client authentication, CORS, request-size limits, and rate limiting.
- Internal routes require `X-Internal-Token` outside explicitly gated test modes.
- Request and trace IDs propagate across service calls and into audit/event records.
- Mock-auth flags are development/test controls and fail closed in production mode.
- JWTs are delivered through HTTP-only cookies rather than response bodies or browser
  local storage.

## Data and observability

Payroll documents contain personal and compensation data. Debug logging should remain
disabled in normal operation. Langfuse and live model providers are optional external
processors; enabling them requires an appropriate data-processing agreement and field
masking review. The offline evidence path redacts secret-shaped keys and values and
normalizes away environment-specific data before writing artifacts.

## Credentials

`.env.example` contains only mock/development placeholders. Never commit real API
keys, JWT secrets, database credentials, authorization headers, or generated evidence
from live payrolls. CI runs a repository hygiene scan and gitleaks.

## Dependency and provenance boundary

The repository does not vendor archived `shared_core` code and has no sibling-path or
Git-installed runtime dependency. Runtime dependencies come from the pnpm and Poetry
lockfiles. Optional Redis, PostgreSQL, SAM.gov, Langfuse, and LLM-provider surfaces are
not required by the default demo or CI evidence job.
