#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${OPS_TOOLBOX_BACKUP_DIR:-$ROOT_DIR/data/backups}"
RETENTION_DAYS="${OPS_TOOLBOX_BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$BACKUP_DIR/amazon-toolbox-backup-$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

INCLUDES=()
[[ -f "data/app.sqlite3" ]] && INCLUDES+=("data/app.sqlite3")
[[ -f "data/app.sqlite3-wal" ]] && INCLUDES+=("data/app.sqlite3-wal")
[[ -f "data/app.sqlite3-shm" ]] && INCLUDES+=("data/app.sqlite3-shm")
[[ -f "data/users.json" ]] && INCLUDES+=("data/users.json")
[[ -d "data/outputs" ]] && INCLUDES+=("data/outputs")
[[ -d "config" ]] && INCLUDES+=("config")

if [[ "${#INCLUDES[@]}" -eq 0 ]]; then
  echo "No data found to back up."
  exit 0
fi

tar -czf "$ARCHIVE" "${INCLUDES[@]}"
find "$BACKUP_DIR" -name "amazon-toolbox-backup-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $ARCHIVE"
echo "Retention: $RETENTION_DAYS days"
