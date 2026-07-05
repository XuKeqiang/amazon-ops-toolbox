#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
PID_FILE="$ROOT_DIR/data/server.pid"

mkdir -p "$ROOT_DIR/data"
echo "$$" > "$PID_FILE"

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "未找到 .venv/bin/python。请先运行：bash scripts/setup-cn.sh"
  exit 1
fi
PYTHON="$ROOT_DIR/.venv/bin/python"

if [[ -n "${AMAZON_TOOLBOX_HOST:-}" && -n "${AMAZON_TOOLBOX_PORT:-}" ]]; then
  exec "$PYTHON" -m app.amazon_toolbox.server --host "$AMAZON_TOOLBOX_HOST" --port "$AMAZON_TOOLBOX_PORT"
elif [[ -n "${AMAZON_TOOLBOX_HOST:-}" ]]; then
  exec "$PYTHON" -m app.amazon_toolbox.server --host "$AMAZON_TOOLBOX_HOST"
elif [[ -n "${AMAZON_TOOLBOX_PORT:-}" ]]; then
  exec "$PYTHON" -m app.amazon_toolbox.server --port "$AMAZON_TOOLBOX_PORT"
else
  exec "$PYTHON" -m app.amazon_toolbox.server
fi
