# One-time setup: registers a Windows Scheduled Task that runs the
# Discord-message embedding backfill once a day at 3:00 AM, since the
# free-tier embedding API only allows 1000 requests/day (see
# backfill-discord-embeddings.mjs's header comment) — the ~28.6k-row
# table needs about a month of daily runs to fully backfill.
#
# Only runs while you're logged in (no stored password needed) but
# catches up automatically if your PC was off/asleep at 3 AM. Expires
# after 60 days as a safety net so it doesn't linger indefinitely if
# forgotten — that's roughly double the ~29 days the full backfill is
# expected to need.
#
# Run once: powershell -File scripts/setup-embedding-backfill-task.ps1
# Check on it later: Get-ScheduledTaskInfo -TaskName "GoA2 Discord Embedding Backfill"
# Remove it: Unregister-ScheduledTask -TaskName "GoA2 Discord Embedding Backfill" -Confirm:$false

$taskName = "GoA2 Discord Embedding Backfill"
$repoRoot = Split-Path -Parent $PSScriptRoot
$wrapperScript = Join-Path $repoRoot "scripts\run-embedding-backfill-task.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$wrapperScript`""

$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopOnIdleEnd `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Runs scripts/backfill-discord-embeddings.mjs once a day to work through the free tier's 1000-requests/day embedding quota. See scripts/backfill-log.txt for output." `
  -Force

$task = Get-ScheduledTask -TaskName $taskName
$task.Triggers[0].EndBoundary = (Get-Date).AddDays(60).ToString("yyyy-MM-dd'T'HH:mm:ss")
Set-ScheduledTask -TaskName $taskName -Trigger $task.Triggers

Write-Host "Scheduled task '$taskName' created: runs daily at 3:00 AM, expires in 60 days."
Write-Host "Log file: $repoRoot\scripts\backfill-log.txt"
