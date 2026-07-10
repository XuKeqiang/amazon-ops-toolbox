$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$LogDir = Join-Path $RootDir "data\logs"
$PidFile = Join-Path $RootDir "data\server.pid"
$OutLog = Join-Path $LogDir "server.out.log"
$ErrLog = Join-Path $LogDir "server.err.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ---- 解析端口：环境变量 > 配置文件 > 默认 8080 ----
$Port = $env:AMAZON_TOOLBOX_PORT
if (-not $Port -and (Test-Path "config\app-config.json")) {
  try {
    $cfg = Get-Content "config\app-config.json" -Raw | ConvertFrom-Json
    if ($cfg.server -and $cfg.server.PSObject.Properties["port"]) {
      $Port = [string]$cfg.server.port
    }
  } catch {}
}
if (-not $Port) { $Port = "8080" }

function Free-Port {
  param($Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    $pids = $conn.OwningProcess | Sort-Object -Unique
    Write-Host "端口 $Port 被占用，释放进程: $($pids -join ', ')"
    foreach ($p in $pids) {
      try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Seconds 1
  }
}

function Stop-ByPidFile {
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
      }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
}

# ---- 兜底清理：先停 pid 文件进程，再按端口释放任何占用者 ----
Stop-ByPidFile
Free-Port -Port $Port

# ---- 环境检查 ----
$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
  Write-Host "未找到 .venv\Scripts\python.exe。请先运行：powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1"
  exit 1
}
$Python = $VenvPython

# ---- 启动 ----
$Arguments = @("-m", "app.amazon_toolbox.server", "--port", $Port)
if ($env:AMAZON_TOOLBOX_HOST) { $Arguments += @("--host", $env:AMAZON_TOOLBOX_HOST) }

$Process = Start-Process `
  -FilePath $Python `
  -ArgumentList $Arguments `
  -WorkingDirectory $RootDir `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $PidFile -Value $Process.Id

# ---- 等待端口就绪（最多约 5 秒）----
$Ready = $false
for ($i = 1; $i -le 10; $i++) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conn) { $Ready = $true; break }
  Start-Sleep -Milliseconds 500
}

if ($Ready) {
  Write-Host "Amazon Operations Toolbox 已启动，PID $($Process.Id)，端口 $Port。"
  Write-Host "服务就绪：http://127.0.0.1:$Port/  （日志: $OutLog 和 $ErrLog）"
} else {
  Write-Host "警告：端口 $Port 在预期时间内未就绪，请查看日志：$ErrLog" -ForegroundColor Yellow
}
