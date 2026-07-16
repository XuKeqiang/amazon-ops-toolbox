$ErrorActionPreference = "Stop"

$CurrentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $CurrentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "请右键 PowerShell 选择“以管理员身份运行”，然后重新执行本脚本。"
  exit 1
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$StartScript = Join-Path $RootDir "scripts\start.ps1"
$BackupScript = Join-Path $RootDir "scripts\backup.ps1"

$StartAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
$StartTrigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask `
  -TaskName "OpsToolboxServer" `
  -Action $StartAction `
  -Trigger $StartTrigger `
  -Description "Start Ops Toolbox at user logon." `
  -Force | Out-Null

$BackupAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`""
$BackupTrigger = New-ScheduledTaskTrigger -Daily -At 2:30am
Register-ScheduledTask `
  -TaskName "OpsToolboxBackup" `
  -Action $BackupAction `
  -Trigger $BackupTrigger `
  -Description "Back up Ops Toolbox data daily." `
  -Force | Out-Null

Write-Host "Installed Windows scheduled task: OpsToolboxServer"
Write-Host "Installed Windows scheduled task: OpsToolboxBackup"
Write-Host "The service starts at user logon and backup runs daily at 02:30."
