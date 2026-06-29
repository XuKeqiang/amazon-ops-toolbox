$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$StartScript = Join-Path $RootDir "scripts\start.ps1"
$BackupScript = Join-Path $RootDir "scripts\backup.ps1"

$StartAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
$StartTrigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask `
  -TaskName "AmazonOpsToolboxServer" `
  -Action $StartAction `
  -Trigger $StartTrigger `
  -Description "Start Amazon Operations Toolbox at user logon." `
  -Force | Out-Null

$BackupAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`""
$BackupTrigger = New-ScheduledTaskTrigger -Daily -At 2:30am
Register-ScheduledTask `
  -TaskName "AmazonOpsToolboxBackup" `
  -Action $BackupAction `
  -Trigger $BackupTrigger `
  -Description "Back up Amazon Operations Toolbox data daily." `
  -Force | Out-Null

Write-Host "Installed Windows scheduled task: AmazonOpsToolboxServer"
Write-Host "Installed Windows scheduled task: AmazonOpsToolboxBackup"
Write-Host "The service starts at user logon and backup runs daily at 02:30."
