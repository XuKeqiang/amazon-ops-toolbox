$ErrorActionPreference = "Stop"

$CurrentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $CurrentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "请右键 PowerShell 选择“以管理员身份运行”，然后重新执行本脚本。"
  exit 1
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$Port = $env:OPS_TOOLBOX_PORT
if (-not $Port -and (Test-Path (Join-Path $RootDir "config\app-config.json"))) {
  $Config = Get-Content (Join-Path $RootDir "config\app-config.json") -Raw | ConvertFrom-Json
  if ($Config.server.port) { $Port = [string]$Config.server.port }
}
if (-not $Port) { $Port = "8080" }

$RuleName = "电商经营数据工具箱 TCP $Port"
Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule `
  -DisplayName $RuleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Port `
  -Profile Private | Out-Null

Write-Host "Windows 防火墙已允许专用网络访问 TCP 端口 $Port。"
