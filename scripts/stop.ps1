$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$PidFile = Join-Path $RootDir "data\server.pid"

if (-not (Test-Path $PidFile)) {
  Write-Host "Amazon Operations Toolbox is not running: no PID file."
  exit 0
}

$PidText = Get-Content $PidFile -ErrorAction SilentlyContinue
if (-not $PidText) {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Amazon Operations Toolbox is not running: empty PID file."
  exit 0
}

$Process = Get-Process -Id $PidText -ErrorAction SilentlyContinue
if ($Process) {
  Stop-Process -Id $PidText
  Write-Host "Stopped Amazon Operations Toolbox with PID $PidText."
} else {
  Write-Host "Process $PidText is not running."
}

Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
