#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/data/server.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Amazon Operations Toolbox is not running: no PID file."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "Stopped Amazon Operations Toolbox with PID $PID."
else
  echo "Process $PID is not running."
fi

rm -f "$PID_FILE"
