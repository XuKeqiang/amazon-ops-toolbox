$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$Python = $env:PYTHON
if (-not $Python) {
  $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if (-not $PythonCommand) {
    $PythonCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($PythonCommand) {
      $Python = "py -3"
    }
  } else {
    $Python = "python"
  }
}

if (-not $Python) {
  Write-Host "未找到 Python。请先安装 Python 3.11 或 3.12，并勾选 Add python.exe to PATH。"
  exit 1
}

$VersionScript = @'
import sys
version = sys.version_info
if version < (3, 11):
    raise SystemExit("Python 版本过低，请安装 Python 3.11 或 3.12。当前版本：%s" % sys.version.split()[0])
if version >= (3, 13):
    raise SystemExit("Python 版本过新，建议使用 Python 3.11 或 3.12（3.13 已移除 cgi 模块，本项目依赖会报错）。当前版本：%s" % sys.version.split()[0])
print("Python", sys.version.split()[0])
'@

if ($Python -eq "py -3") {
  py -3 -c $VersionScript
  if (-not (Test-Path ".venv")) {
    py -3 -m venv .venv
  }
} else {
  & $Python -c $VersionScript
  if (-not (Test-Path ".venv")) {
    & $Python -m venv .venv
  }
}

$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
$MirrorUrl = $env:PIP_INDEX_URL
if (-not $MirrorUrl) {
  $MirrorUrl = "https://pypi.tuna.tsinghua.edu.cn/simple"
}

& $VenvPython -m pip install --upgrade pip -i $MirrorUrl
& $VenvPython -m pip install -r requirements.txt -i $MirrorUrl

New-Item -ItemType Directory -Force -Path "data\input", "data\uploads", "data\outputs", "data\logs", "data\backups" | Out-Null

if (-not (Test-Path "config\app-config.json")) {
  Copy-Item "config\app-config.example.json" "config\app-config.json"
  Write-Host "已创建 config\app-config.json。请按服务器实际业务目录修改 paths.allowed_input_roots。"
}

Write-Host "国内镜像安装完成。后续启动请运行：powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start.ps1"
