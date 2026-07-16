$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$PidFile = Join-Path $RootDir "data\server.pid"

# ---- 解析端口：环境变量 > 配置文件 > 默认 8080 ----
$Port = $env:OPS_TOOLBOX_PORT
if (-not $Port -and (Test-Path "config\app-config.json")) {
  try {
    $cfg = Get-Content "config\app-config.json" -Raw | ConvertFrom-Json
    if ($cfg.server -and $cfg.server.PSObject.Properties["port"]) {
      $Port = [string]$cfg.server.port
    }
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
        if ($cim -and ($cim.CommandLine -like "*app.ops_toolbox.server*")) { $isServer = $true }
      } catch { $isServer = $false }
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

# 2) 兜底：只停止端口上确认属于本系统的进程
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $pids = $conn.OwningProcess | Sort-Object -Unique
  foreach ($p in $pids) {
    $isServer = $false
    try {
      $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $p" -ErrorAction SilentlyContinue
      if ($cim -and ($cim.CommandLine -like "*app.ops_toolbox.server*")) { $isServer = $true }
    } catch {}
    if ($isServer) {
      Write-Host "停止占用端口 $Port 的本服务进程 PID $p"
      Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    } else {
      Write-Host "端口 $Port 由其他程序占用（PID $p），未进行处理。"
    }
  }
}

Write-Host "已尝试停止 Ops Toolbox（端口 $Port）。"
