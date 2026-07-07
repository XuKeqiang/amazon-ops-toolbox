$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$PidFile = Join-Path $RootDir "data\server.pid"

# ---- 解析端口：环境变量 > 配置文件 > 默认 8080 ----
$Port = $env:AMAZON_TOOLBOX_PORT
if (-not $Port -and (Test-Path "config\app-config.json")) {
  try {
    $cfg = Get-Content "config\app-config.json" -Raw | ConvertFrom-Json
    if ($cfg.PSObject.Properties["port"]) { $Port = [string]$cfg.port }
  } catch {}
}
if (-not $Port) { $Port = "8080" }

# 1) 按 pid 文件停（仅当该 PID 确属本服务进程时才杀，避免误杀 PID 被复用的无关进程）
if (Test-Path $PidFile) {
  $pidText = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($pidText) {
    $proc = Get-Process -Id $pidText -ErrorAction SilentlyContinue
    if ($proc) {
      $isServer = $false
      try {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $pidText" -ErrorAction SilentlyContinue
        if ($cim -and ($cim.CommandLine -like "*app.amazon_toolbox.server*")) { $isServer = $true }
      } catch { $isServer = $true }  # 无法确认时按服务器处理，保证可停
      if ($isServer) {
        Write-Host "停止已记录进程 PID $pidText"
        Stop-Process -Id $pidText -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      } else {
        Write-Host "PID $pidText 已存在但非本服务进程，跳过 kill，仅清理 pid 文件。"
      }
    } else {
      Write-Host "进程 $pidText 未在运行。"
    }
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# 2) 兜底：按端口释放（覆盖“直接 python -m 启动、无 pid 文件”等情况）
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $pids = $conn.OwningProcess | Sort-Object -Unique
  Write-Host "端口 $Port 仍被占用，释放进程: $($pids -join ', ')"
  foreach ($p in $pids) {
    try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
  }
}

Write-Host "已尝试停止 Amazon Operations Toolbox（端口 $Port）。"
