#!/usr/bin/env bash
# 在 macOS 上创建启动/停止 .app 快捷方式（Launchpad / Dock / 桌面可用）
# 用法：bash scripts/create-shortcut.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
APP_NAME="电商经营数据工具箱"
START_APP="$ROOT_DIR/$APP_NAME.app"
STOP_APP="$ROOT_DIR/${APP_NAME}-停止.app"

# 读取端口（与 start.sh 一致）
PORT="${OPS_TOOLBOX_PORT:-}"
if [[ -z "${PORT:-}" && -f "$ROOT_DIR/config/app-config.json" ]]; then
  PORT="$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]\+' "$ROOT_DIR/config/app-config.json" 2>/dev/null | grep -o '[0-9]\+' | head -1 || true)"
fi
PORT="${PORT:-8080}"

echo "项目目录: $ROOT_DIR"
echo "端口: $PORT"
echo

# ── 通用 Info.plist 模板 ──
write_info_plist() {
  local app_dir="$1"
  local display_name="$2"
  local bundle_id="$3"
  cat > "$app_dir/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${display_name}</string>
    <key>CFBundleDisplayName</key>
    <string>${display_name}</string>
    <key>CFBundleIdentifier</key>
    <string>${bundle_id}</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>LSUIElement</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
</dict>
</plist>
PLIST
}

# ── 创建「启动」.app ──
echo "创建启动应用: $START_APP"
rm -rf "$START_APP"
mkdir -p "$START_APP/Contents/MacOS"
write_info_plist "$START_APP" "$APP_NAME" "com.trustdecision.amazon-toolbox.start"

cat > "$START_APP/Contents/MacOS/launcher" <<LAUNCHER
#!/usr/bin/env bash
# 电商经营数据工具箱 — 启动器（由 create-shortcut.sh 生成）
# 项目路径在生成时写入，移动 .app 不影响使用
PROJECT_DIR="$ROOT_DIR"
PORT="${PORT}"

cd "\$PROJECT_DIR"

# 启动服务（start.sh 会自动清理旧实例）
bash scripts/start.sh >/dev/null 2>&1

# 等待服务就绪
READY=0
for i in \$(seq 1 15); do
  if (exec 3<>"/dev/tcp/127.0.0.1/\${PORT}") 2>/dev/null; then
    exec 3>&- 2>/dev/null
    READY=1
    break
  fi
  sleep 0.5
done

if [[ "\${READY}" -eq 1 ]]; then
  /usr/bin/open "http://127.0.0.1:\${PORT}/"
  /usr/bin/osascript -e 'display notification "服务已启动，浏览器已打开" with title "电商经营数据工具箱" sound name "Glass"'
else
  /usr/bin/osascript -e 'display notification "启动失败，请查看 data/logs/server.log" with title "电商经营数据工具箱" sound name "Basso"'
fi
LAUNCHER
chmod +x "$START_APP/Contents/MacOS/launcher"

# ── 创建「停止」.app ──
echo "创建停止应用: $STOP_APP"
rm -rf "$STOP_APP"
mkdir -p "$STOP_APP/Contents/MacOS"
write_info_plist "$STOP_APP" "${APP_NAME}-停止" "com.trustdecision.amazon-toolbox.stop"

cat > "$STOP_APP/Contents/MacOS/launcher" <<LAUNCHER
#!/usr/bin/env bash
# 电商经营数据工具箱 — 停止器（由 create-shortcut.sh 生成）
PROJECT_DIR="$ROOT_DIR"

cd "\$PROJECT_DIR"
bash scripts/stop.sh >/dev/null 2>&1

/usr/bin/osascript -e 'display notification "服务已停止" with title "电商经营数据工具箱" sound name "Glass"'
LAUNCHER
chmod +x "$STOP_APP/Contents/MacOS/launcher"

# ── 刷新 Launchpad 注册 ──
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$START_APP" 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$STOP_APP" 2>/dev/null || true

# ── 创建 ~/Applications 软链接（Launchpad 可识别）──
mkdir -p "$HOME/Applications"
ln -sfh "$START_APP" "$HOME/Applications/${APP_NAME}.app"
ln -sfh "$STOP_APP" "$HOME/Applications/${APP_NAME}-停止.app"

# ── 桌面别名（可选）──
DESKTOP_LINK="$HOME/Desktop/${APP_NAME}.app"
if [[ ! -e "$DESKTOP_LINK" ]]; then
  ln -s "$START_APP" "$DESKTOP_LINK" 2>/dev/null || true
  echo "已创建桌面快捷方式: $DESKTOP_LINK"
fi

echo
echo "✓ 创建完成"
echo
echo "  启动: $START_APP"
echo "  停止: $STOP_APP"
echo
echo "  Launchpad: ~/Applications/${APP_NAME}.app"
echo "  桌面:     ~/Desktop/${APP_NAME}.app"
echo
echo "  也可将 .app 拖拽到 Dock 栏使用。"
echo "  如需重新生成（例如项目路径变更），重新运行此脚本即可。"
