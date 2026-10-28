# Security policy

Operational security guidance (deployment, JWT config, least-privilege service
boundaries, mock-mode cautions) lives in
[docs/operations/security.md](docs/operations/security.md).

## Reporting a vulnerability

Open a [security advisory](https://github.com/FishRaposo/WCP-Compliance-Agent-V5/security/advisories/new)
or email fishraposo@gmail.com with the subject `[wcp security]`. Please do not open
a public issue for a security report.

## Scope notes

- The five services are a monorepo of reference implementations; mock modes
  (`VITE_MOCK_API`, `WCP_MOCK_AUTH`, `LLM_MODE=mock`) are documented, labeled
  demos, not production auth bypasses. Reviewers of a deployed instance should
  confirm every mock flag reads `false`.
- Provider keys are read from environment variables only and are never written
  to any persisted record.

## Supported versions

Security fixes target the latest tagged release and `main`.
