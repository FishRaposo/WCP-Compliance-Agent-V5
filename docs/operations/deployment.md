# Deployment Guide

> This is an optional deployment surface. The repository ships reproducible local
> proof, not a hosted service. Production deployment requires infrastructure,
> credential, privacy, and operational review beyond the portfolio gates.

## Docker Compose (Production)

```bash
# Build all images
docker compose -f infra/docker-compose.prod.yml build

# Start full stack
DB_PASSWORD=secure_password JWT_SECRET=your_jwt_secret \
  OPENAI_API_KEY=sk-... LLM_MODE=real \
  docker compose -f infra/docker-compose.prod.yml up -d

# Run migrations
docker compose -f infra/docker-compose.prod.yml exec data-platform \
  poetry run alembic upgrade head

# Seed initial data
docker compose -f infra/docker-compose.prod.yml exec data-platform \
  poetry run python -c "from wcp_data.services.dbwd_service import refresh_rates; import asyncio; asyncio.run(refresh_rates(...))"

# Health check
curl http://localhost:3000/health
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## Environment Variables

### Gateway
| Variable | Default | Required |
|---|---|---|
| `AGENT_URL` | `http://localhost:3001` | Yes |
| `COMPLIANCE_CORE_URL` | `http://localhost:8000` | Yes |
| `DATA_PLATFORM_URL` | `http://localhost:8001` | Yes |
| `JWT_SECRET` | `change-me-before-launch` | **Yes (production)** |
| `AUTH_DISABLED` | `false` | No |
| `CORS_ORIGINS` | `http://localhost:5173` | No |
| `NODE_ENV` | `development` | No |
| `PORT` | `3000` | No |

### Agent
| Variable | Default | Required |
|---|---|---|
| `COMPLIANCE_CORE_URL` | `http://localhost:8000` | Yes |
| `DATA_PLATFORM_URL` | `http://localhost:8001` | Yes |
| `LLM_MODE` | `mock` | No |
| `LLM_PROVIDER` | `openai` | No |
| `OPENAI_API_KEY` | — | Yes (production) |
| `ANTHROPIC_API_KEY` | — | No |
| `OLLAMA_BASE_URL` | — | No |

### Compliance Core
| Variable | Default | Required |
|---|---|---|
| `DATA_PLATFORM_URL` | `http://localhost:8001` | No |
| `SKIP_DB_STARTUP` | `false` | No |

### Data Platform
| Variable | Default | Required |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Yes |
| `REDIS_URL` | `redis://localhost:6379` | No |
| `SAM_GOV_API_KEY` | — | No |

### Web
| Variable | Default | Required |
|---|---|---|
| `VITE_API_URL` | — | No |
| `VITE_MOCK_API` | `false` | No |

## Mock Modes

```bash
# UI-only mock mode; no backend services required.
VITE_MOCK_API=true WCP_MOCK_AUTH=true AUTH_DISABLED=true LLM_MODE=mock pnpm dev
```

`VITE_MOCK_API=true` lets the Web app run from fixtures without backend services.

`LLM_MODE=mock` avoids LLM API keys in the Agent, but the networked Mastra workflow
still calls Compliance Core and Data Platform. For a credential-free review that
does not start infrastructure, run `pnpm evidence`; for a live persistence flow, run
PostgreSQL, Compliance Core, and Data Platform. Redis is optional because cache and
SSE have in-memory fallbacks.

## Scaling

- **Compliance Core**: Horizontally scalable (stateless). Deploy N instances behind a load balancer.
- **Data Platform**: Connection pool tuning (`pool_size=10, max_overflow=20`). Read replicas for analytics queries.
- **Agent**: GPU-backed instances for LLM inference. Stateless, horizontally scalable.
- **Gateway**: Horizontally scalable behind load balancer. Rate limiting is in-memory (not shared across instances).
- **Web**: Static build served via CDN or Nginx.

## Monitoring

- OpenTelemetry traces via OTLP exporter (configurable endpoint)
- Langfuse for LLM observability (prompt tracking, cost, generation logging)
- Phoenix (Arize) for trace visualization
- Redis Streams for real-time decision events
- `/health` endpoint on all services for uptime monitoring
