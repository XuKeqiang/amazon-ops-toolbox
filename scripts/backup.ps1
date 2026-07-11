$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$BackupDir = if ($env:OPS_TOOLBOX_BACKUP_DIR) { $env:OPS_TOOLBOX_BACKUP_DIR } else { Join-Path $RootDir "data\backups" }
$RetentionDays = if ($env:OPS_TOOLBOX_BACKUP_RETENTION_DAYS) { [int]$env:OPS_TOOLBOX_BACKUP_RETENTION_DAYS } else { 14 }
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = Join-Path $BackupDir "amazon-toolbox-backup-$Timestamp.zip"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$Includes = @()
foreach ($Path in @("data\app.sqlite3", "data\app.sqlite3-wal", "data\app.sqlite3-shm", "data\users.json", "data\outputs", "config")) {
  if (Test-Path $Path) {
    $Includes += $Path
  }
}

if ($Includes.Count -eq 0) {
  Write-Host "No data found to back up."
  exit 0
}

Compress-Archive -Path $Includes -DestinationPath $Archive -Force

$Cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "amazon-toolbox-backup-*.zip" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt $Cutoff } |
  Remove-Item -Force

Write-Host "Backup created: $Archive"
Write-Host "Retention: $RetentionDays days"
