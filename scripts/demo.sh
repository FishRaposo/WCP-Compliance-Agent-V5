#!/usr/bin/env bash
# WCP V5 Mock Mode Demo
# Runs the full stack with zero external dependencies.
# Requires: Node.js 20+, Python 3.12, pnpm, Poetry

set -e

echo "========================================"
echo "  WCP Compliance Agent V5 — Mock Demo"
echo "========================================"
echo ""

# Kill any existing processes on our ports
kill_port() {
  local port=$1
  if command -v lsof &>/dev/null; then
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
  fi
}

echo "[1/4] Installing dependencies..."
pnpm install --silent 2>/dev/null
cd apps/compliance-core && poetry install -q 2>/dev/null && cd ../..
cd apps/data-platform && poetry install -q 2>/dev/null && cd ../..

echo "[2/4] Starting Compliance Core (port 8000)..."
cd apps/compliance-core
poetry run uvicorn wcp_compliance.main:app --port 8000 &
CC_PID=$!
cd ../..

echo "[3/4] Starting Data Platform (port 8001)..."
cd apps/data-platform
SKIP_DB_STARTUP=true poetry run uvicorn wcp_data.main:app --port 8001 &
DP_PID=$!
cd ../..

echo "[4/4] Starting Gateway + Agent + Web in mock mode..."
VITE_MOCK_API=true WCP_MOCK_AUTH=true AUTH_DISABLED=true LLM_MODE=mock pnpm dev &
FE_PID=$!

# Wait for services to start
sleep 5

echo ""
echo "Services running:"
echo "  Compliance Core: http://localhost:8000"
echo "  Data Platform:   http://localhost:8001"
echo "  Gateway:         http://localhost:3000"
echo "  Agent:           http://localhost:3001"
echo "  Web:             http://localhost:5173"
echo ""

# Health checks
echo "Health checks:"
curl -s http://localhost:8000/health | jq -r '"- Compliance Core: \(.status)"'
curl -s http://localhost:8001/health | jq -r '"- Data Platform: \(.status)"'
curl -s http://localhost:3000/health | jq -r '"- Gateway: \(.status)"'
curl -s http://localhost:3001/health | jq -r '"- Agent: \(.status)"'
echo ""

# Analyze a sample WH-347
echo "Running sample analysis..."
SAMPLE='Contractor: Apex Builders Inc.
Project: Federal Building Renovation
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe
Trade: Electrician
Hours: 40
Hourly Wage: 55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00'

RESULT=$(curl -s -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$SAMPLE\"}")

echo ""
echo "Analysis result:"
echo "$RESULT" | jq '{
  job_id,
  verdict,
  trust_score,
  trust_band,
  violation_count,
  warning_count,
  llm_confidence,
  cost_usd,
  latency_ms
}'

echo ""
echo "========================================"
echo "  Demo complete!"
echo "  Open http://localhost:5173 in browser"
echo "  Press Ctrl+C to stop all services"
echo "========================================"

# Cleanup on exit
trap "kill $CC_PID $DP_PID $FE_PID 2>/dev/null; exit" INT TERM
wait
