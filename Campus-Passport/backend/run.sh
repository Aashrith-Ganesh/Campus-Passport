#!/usr/bin/env bash
# ============================================================
# Campus Passport – one-command startup
# ============================================================
# Usage:  ./run.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# PYTHONPATH must point to the parent of 'backend/' so imports like
# `backend.app.main` resolve correctly.
export PYTHONPATH="$PROJECT_ROOT"

# Load .env from the backend directory
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

PORT="${PORT:-8000}"

echo "=============================================="
echo "  Campus Passport API"
echo "=============================================="
echo "  Frontend:  http://localhost:$PORT/"
echo "  API docs:  http://localhost:$PORT/docs"
echo "  Health:    http://localhost:$PORT/health"
echo "=============================================="
echo ""

python3 -m uvicorn backend.app.main:app \
    --reload \
    --host 0.0.0.0 \
    --port "$PORT"
