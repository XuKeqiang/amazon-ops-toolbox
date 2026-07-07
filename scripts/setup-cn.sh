#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "未找到 Python。请先安装 Python 3.11 或 3.12，然后重新运行本脚本。"
    exit 1
  fi
fi

"$PYTHON_BIN" - <<'PY'
import sys
version = sys.version_info
if version < (3, 11):
    raise SystemExit("Python 版本过低，请安装 Python 3.11 或 3.12。当前版本：%s" % sys.version.split()[0])
if version >= (3, 13):
    raise SystemExit("Python 版本过新，建议使用 Python 3.11 或 3.12（3.13 已移除 cgi 模块，本项目依赖会报错）。当前版本：%s" % sys.version.split()[0])
print("Python", sys.version.split()[0])
PY

if [[ ! -d ".venv" ]]; then
  "$PYTHON_BIN" -m venv .venv
fi

VENV_PYTHON="$ROOT_DIR/.venv/bin/python"
MIRROR_URL="${PIP_INDEX_URL:-https://pypi.tuna.tsinghua.edu.cn/simple}"

"$VENV_PYTHON" -m pip install --upgrade pip -i "$MIRROR_URL"
"$VENV_PYTHON" -m pip install -r requirements.txt -i "$MIRROR_URL"

mkdir -p data/input data/uploads data/outputs data/logs data/backups

if [[ ! -f "config/app-config.json" ]]; then
  cp config/app-config.example.json config/app-config.json
  echo "已创建 config/app-config.json。请按服务器实际业务目录修改 paths.allowed_input_roots。"
fi

echo "国内镜像安装完成。后续启动请运行：bash scripts/start.sh"
