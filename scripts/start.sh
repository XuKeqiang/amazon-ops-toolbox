#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/data/logs"
PID_FILE="$ROOT_DIR/data/server.pid"
mkdir -p "$LOG_DIR"

# ---- 解析端口：环境变量 > 配置文件 > 默认 8080 ----
PORT="${AMAZON_TOOLBOX_PORT:-}"
if [[ -z "$PORT" && -f "$ROOT_DIR/config/app-config.json" ]]; then
  PORT="$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]\+' "$ROOT_DIR/config/app-config.json" 2>/dev/null | grep -o '[0-9]\+' | head -1 || true)"
fi
PORT="${PORT:-8080}"

# ---- 环境检查（端口兜底需要 python，且服务本身也依赖 venv）----
if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "未找到 .venv/bin/python。请先运行：bash scripts/setup-cn.sh" >&2
  exit 1
fi
PYTHON="$ROOT_DIR/.venv/bin/python"

# 服务进程命令行特征：无论用 start.sh 还是 `python -m` 直接起，都会命中
SERVER_PATTERN="app.amazon_toolbox.server"

# 兜底清理：按进程名杀掉所有服务实例（覆盖重复启动 / 直接 python -m 启动 / 无 pid 文件 等情况）
kill_by_pattern() {
  local pids
  pids="$(pgrep -f "$SERVER_PATTERN" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "停止匹配进程: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

cleanup() {
  # 1) 按 pid 文件停（若有）
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      # 仅当该 PID 确属本服务进程时才杀，避免误杀 PID 被复用的无关进程
      if pgrep -f "$SERVER_PATTERN" 2>/dev/null | grep -qx "$pid"; then
        echo "停止已记录进程 PID $pid"
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
      else
        echo "PID $pid 已存在但非本服务进程，跳过 kill，仅清理 pid 文件。"
      fi
    fi
    rm -f "$PID_FILE"
  fi
  # 2) 按进程名清掉任何残留实例（含直接 python -m 起的）
  kill_by_pattern
}

cleanup

# 端口占用最终确认（仅提示，不阻塞；若仍被其它无关程序占用，bind 会给出明确报错）
# Python 退出码：0 = 端口仍被占用（给出告警）；1 = 端口空闲（正常继续）
if "$PYTHON" - "$PORT" <<'PY' 2>/dev/null
import sys, socket
port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect(("127.0.0.1", port))
    sys.exit(0)  # 端口被占用
except OSError:
    sys.exit(1)  # 端口空闲
finally:
    s.close()
PY
then
  echo "警告：端口 ${PORT:-8080} 当前仍被占用（可能是其它程序）。将尝试启动，若 bind 失败请手动释放。" >&2
fi

# ---- 启动 ----
ARGS=(--port "$PORT")
if [[ -n "${AMAZON_TOOLBOX_HOST:-}" ]]; then
  ARGS+=(--host "$AMAZON_TOOLBOX_HOST")
fi

nohup "$PYTHON" -m app.amazon_toolbox.server "${ARGS[@]}" >> "$LOG_DIR/server.log" 2>&1 &
echo "$!" > "$PID_FILE"
echo "Amazon Operations Toolbox 已启动，PID $(cat "$PID_FILE")，端口 ${PORT:-8080}。"

# ---- 等待端口就绪（最多约 5 秒，使用 bash /dev/tcp，不依赖 curl）----
READY=0
for i in $(seq 1 10); do
  if (exec 3<>"/dev/tcp/127.0.0.1/${PORT:-8080}") 2>/dev/null; then
    exec 3>&- 2>/dev/null
    READY=1
    break
  fi
  sleep 0.5
done

if [[ "$READY" -eq 1 ]]; then
  echo "服务就绪：http://127.0.0.1:${PORT:-8080}/  （日志: $LOG_DIR/server.log）"
else
  echo "警告：端口 ${PORT:-8080} 在预期时间内未就绪，请查看日志：$LOG_DIR/server.log" >&2
fi
