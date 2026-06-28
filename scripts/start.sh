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

nohup "$ROOT_DIR/scripts/run-server.sh" >> "$LOG_DIR/server.log" 2>&1 &
echo "$!" > "$PID_FILE"
echo "Amazon Operations Toolbox started with PID $(cat "$PID_FILE")."
echo "Host, port and limits are read from config/app-config.json unless AMAZON_TOOLBOX_HOST or AMAZON_TOOLBOX_PORT is set."
echo "Logs: $LOG_DIR/server.log"
