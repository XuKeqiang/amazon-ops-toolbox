$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$LogDir = Join-Path $RootDir "data\logs"
$PidFile = Join-Path $RootDir "data\server.pid"
$OutLog = Join-Path $LogDir "server.out.log"
$ErrLog = Join-Path $LogDir "server.err.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (Test-Path $PidFile) {
  $ExistingPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($ExistingPid) {
    $ExistingProcess = Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue
    if ($ExistingProcess) {
      Write-Host "Amazon Operations Toolbox is already running with PID $ExistingPid."
      exit 0
    }
  }
}

$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
  Write-Host "未找到 .venv\Scripts\python.exe。请先运行：powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1"
  exit 1
}
$Python = $VenvPython

$Arguments = @("-m", "app.amazon_toolbox.server")
if ($env:AMAZON_TOOLBOX_HOST) {
  $Arguments += @("--host", $env:AMAZON_TOOLBOX_HOST)
}
if ($env:AMAZON_TOOLBOX_PORT) {
  $Arguments += @("--port", $env:AMAZON_TOOLBOX_PORT)
}

$Process = Start-Process `
  -FilePath $Python `
  -ArgumentList $Arguments `
  -WorkingDirectory $RootDir `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $PidFile -Value $Process.Id
Write-Host "Amazon Operations Toolbox started with PID $($Process.Id)."
Write-Host "Host, port and limits are read from config\app-config.json unless environment variables override them."
Write-Host "Logs: $OutLog and $ErrLog"
