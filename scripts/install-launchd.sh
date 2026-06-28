#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
SERVICE_PLIST="$LAUNCH_AGENTS/com.amazon-toolbox.server.plist"
BACKUP_PLIST="$LAUNCH_AGENTS/com.amazon-toolbox.backup.plist"

mkdir -p "$LAUNCH_AGENTS" "$ROOT_DIR/data/logs"

cat > "$SERVICE_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.amazon-toolbox.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$ROOT_DIR/scripts/run-server.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$ROOT_DIR/data/logs/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT_DIR/data/logs/launchd.err.log</string>
</dict>
</plist>
PLIST

cat > "$BACKUP_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.amazon-toolbox.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$ROOT_DIR/scripts/backup.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>2</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$ROOT_DIR/data/logs/backup.out.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT_DIR/data/logs/backup.err.log</string>
</dict>
</plist>
PLIST

launchctl unload "$SERVICE_PLIST" >/dev/null 2>&1 || true
launchctl unload "$BACKUP_PLIST" >/dev/null 2>&1 || true
launchctl load "$SERVICE_PLIST"
launchctl load "$BACKUP_PLIST"

echo "Installed launchd service: $SERVICE_PLIST"
echo "Installed daily backup: $BACKUP_PLIST"
echo "The service will start at login and backups run daily at 02:30."
