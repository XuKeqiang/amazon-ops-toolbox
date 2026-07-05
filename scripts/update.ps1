$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

if (-not (Test-Path ".git")) {
  Write-Host "This folder is not a Git repository. Update manually or clone from GitHub first."
  exit 1
}

git pull --ff-only

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cn.ps1

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start.ps1
