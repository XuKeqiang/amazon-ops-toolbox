#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".git" ]]; then
  echo "This folder is not a Git repository. Update manually or clone from GitHub first."
  exit 1
fi

git pull --ff-only

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

bash scripts/stop.sh
bash scripts/start.sh
