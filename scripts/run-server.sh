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

if [[ -n "${OPS_TOOLBOX_HOST:-}" && -n "${OPS_TOOLBOX_PORT:-}" ]]; then
  exec "$PYTHON" -m app.ops_toolbox.server --host "$OPS_TOOLBOX_HOST" --port "$OPS_TOOLBOX_PORT"
elif [[ -n "${OPS_TOOLBOX_HOST:-}" ]]; then
  exec "$PYTHON" -m app.ops_toolbox.server --host "$OPS_TOOLBOX_HOST"
elif [[ -n "${OPS_TOOLBOX_PORT:-}" ]]; then
  exec "$PYTHON" -m app.ops_toolbox.server --port "$OPS_TOOLBOX_PORT"
else
  exec "$PYTHON" -m app.ops_toolbox.server
fi
