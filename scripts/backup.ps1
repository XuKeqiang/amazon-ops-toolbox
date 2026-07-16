$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

function Resolve-ProjectPath {
  param([string]$PathValue)
  if ([System.IO.Path]::IsPathRooted($PathValue)) { return $PathValue }
  return Join-Path $RootDir $PathValue
}

$Config = $null
if (Test-Path "config\app-config.json") {
  $Config = Get-Content "config\app-config.json" -Raw | ConvertFrom-Json
}

$DataRoot = if ($Config -and $Config.paths.data_root) { Resolve-ProjectPath $Config.paths.data_root } else { Join-Path $RootDir "data" }
$DatabasePath = if ($Config -and $Config.paths.database_path) { Resolve-ProjectPath $Config.paths.database_path } else { Join-Path $DataRoot "app.sqlite3" }
$UserStore = if ($Config -and $Config.paths.user_store) { Resolve-ProjectPath $Config.paths.user_store } else { Join-Path $DataRoot "users.json" }
$OutputRoot = if ($Config -and $Config.paths.output_root) { Resolve-ProjectPath $Config.paths.output_root } else { Join-Path $DataRoot "outputs" }
$ConfiguredBackupRoot = if ($Config -and $Config.backups.backup_root) { Resolve-ProjectPath $Config.backups.backup_root } else { Join-Path $DataRoot "backups" }
$BackupDir = if ($env:OPS_TOOLBOX_BACKUP_DIR) { $env:OPS_TOOLBOX_BACKUP_DIR } else { $ConfiguredBackupRoot }
$RetentionDays = if ($env:OPS_TOOLBOX_BACKUP_RETENTION_DAYS) {
  [int]$env:OPS_TOOLBOX_BACKUP_RETENTION_DAYS
} elseif ($Config -and $Config.backups.retention_days) {
  [int]$Config.backups.retention_days
} else {
  14
}
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = Join-Path $BackupDir "amazon-toolbox-backup-$Timestamp.zip"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$Includes = @()
foreach ($Path in @($DatabasePath, "$DatabasePath-wal", "$DatabasePath-shm", $UserStore, $OutputRoot, (Join-Path $RootDir "config"))) {
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
