<#
.SYNOPSIS
    Automated Monthly Backup Script for Finance Tracker
.DESCRIPTION
    Pulls a complete disaster-recovery snapshot of the database and saves it
    to your local Windows hard drive.
#>

param(
    [string]$AppUrl = "https://your-finance-tracker.vercel.app",
    [string]$BackupDir = "",
    [string]$BackupSecret = "savvy_disaster_recovery_backup_key"
)

# 1. Determine local project backups folder
if (-not $BackupDir) {
    $BaseDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    $BackupDir = Join-Path $BaseDir "backups"
}

# 2. Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Created backup folder: $BackupDir" -ForegroundColor Cyan
}

$Timestamp = Get-Date -Format "yyyy-MM-dd"
$BackupFile = Join-Path $BackupDir "finance_backup_$Timestamp.json"

Write-Host "Initiating monthly backup from $AppUrl..." -ForegroundColor Yellow

try {
    # 2. Fetch full database export using backup key
    $Uri = "$AppUrl/api/backups/export"
    $Headers = @{ "x-backup-secret" = $BackupSecret }
    Invoke-WebRequest -Uri $Uri -Headers $Headers -OutFile $BackupFile -UseBasicParsing

    $FileInfo = Get-Item $BackupFile
    if ($FileInfo.Length -gt 0) {
        Write-Host "✅ Monthly backup saved successfully!" -ForegroundColor Green
        Write-Host "Location: $BackupFile ($([math]::Round($FileInfo.Length / 1KB, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Warning "Backup file was created but appears empty. Check connection/URL."
    }
} catch {
    Write-Error "Backup failed: $_"
}

<#
HOW TO SCHEDULE AUTOMATICALLY IN WINDOWS TASK SCHEDULER:
--------------------------------------------------------
To run this automatically on the 1st of every month at midnight:

1. Open PowerShell as Administrator.
2. Run the following command:

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\finance_tracker\backup-monthly.ps1"'
$Trigger = New-ScheduledTaskTrigger -Monthly -At 12:00AM -DaysOfWeek Any
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "FinanceTrackerMonthlyBackup" -Description "Monthly disaster recovery backup"
#>
