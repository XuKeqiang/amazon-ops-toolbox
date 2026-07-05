#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/data/logs"
PID_FILE="$ROOT_DIR/data/server.pid"

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
  echo "Amazon Operations Toolbox is already running with PID $(cat "$PID_FILE")."
  exit 0
fi

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "未找到 .venv/bin/python。请先运行：bash scripts/setup-cn.sh"
  exit 1
fi
PYTHON="$ROOT_DIR/.venv/bin/python"

ARGS=()
if [[ -n "${AMAZON_TOOLBOX_HOST:-}" ]]; then
  ARGS+=(--host "$AMAZON_TOOLBOX_HOST")
fi
if [[ -n "${AMAZON_TOOLBOX_PORT:-}" ]]; then
  ARGS+=(--port "$AMAZON_TOOLBOX_PORT")
fi

if [[ ${#ARGS[@]} -gt 0 ]]; then
  nohup "$PYTHON" -m app.amazon_toolbox.server "${ARGS[@]}" >> "$LOG_DIR/server.log" 2>&1 &
else
  nohup "$PYTHON" -m app.amazon_toolbox.server >> "$LOG_DIR/server.log" 2>&1 &
fi
echo "$!" > "$PID_FILE"
echo "Amazon Operations Toolbox started with PID $(cat "$PID_FILE")."
echo "Host, port and limits are read from config/app-config.json unless AMAZON_TOOLBOX_HOST or AMAZON_TOOLBOX_PORT is set."
echo "Logs: $LOG_DIR/server.log"
