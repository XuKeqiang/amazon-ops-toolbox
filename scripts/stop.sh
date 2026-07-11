#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PID_FILE="$ROOT_DIR/data/server.pid"

PORT="${OPS_TOOLBOX_PORT:-}"
if [[ -z "$PORT" && -f "$ROOT_DIR/config/app-config.json" ]]; then
  PORT="$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]\+' "$ROOT_DIR/config/app-config.json" 2>/dev/null | grep -o '[0-9]\+' | head -1 || true)"
fi
PORT="${PORT:-8080}"

PYTHON=""
if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  PYTHON="$ROOT_DIR/.venv/bin/python"
fi

SERVER_PATTERN="app\.ops_toolbox\.server"

# 1) 按 pid 文件停
if [[ -f "$PID_FILE" ]]; then
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
  else
    echo "进程 $pid 未在运行或 pid 文件为空。"
  fi
  rm -f "$PID_FILE"
fi

# 2) 按进程名杀（覆盖直接 python -m 启动 / 重复启动）
pkill -f "$SERVER_PATTERN" 2>/dev/null || true
sleep 1

# 3) 兜底：按端口释放任何占用者（Python 跨平台）
if [[ -n "$PYTHON" ]]; then
  "$PYTHON" - "$PORT" <<'PY' 2>/dev/null || true
import os, signal, subprocess, sys
port = int(sys.argv[1])
pids = []
try:
    o = subprocess.run(["/usr/sbin/lsof", "-tiTCP:%d" % port, "-sTCP:LISTEN"],
                        capture_output=True, text=True, timeout=5)
    pids += [p.strip() for p in o.stdout.split() if p.strip()]
except Exception:
    pass
if not pids:
    try:
        h = "%04X" % port
        for ln in open("/proc/net/tcp").readlines()[1:]:
            p = ln.split()
            if len(p) < 10 or p[3] != "0A":
                continue
            if p[1].split(":")[1].upper() == h:
                inode = p[9]
                for pid in os.listdir("/proc"):
                    if not pid.isdigit():
                        continue
                    try:
                        for fd in os.listdir("/proc/%s/fd" % pid):
                            if os.readlink("/proc/%s/fd/%s" % (pid, fd)).endswith(inode):
                                pids.append(pid)
                                break
                    except OSError:
                        pass
    except OSError:
        pass
for pid in set(pids):
    try:
        os.kill(int(pid), signal.SIGTERM)
        print("释放端口 %d 的占用进程 PID %s" % (port, pid))
    except OSError:
        pass
PY
fi

echo "已尝试停止 Ops Toolbox（端口 ${PORT:-8080}）。"
