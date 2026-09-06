# Wrapper for the Windows Scheduled Task that runs
# backfill-discord-embeddings.mjs once a day (see that script's own
# header for why this needs to be daily rather than a single run — the
# free-tier embedding API's quota is 1000 requests/day). Task Scheduler
# actions don't support shell redirection themselves, so this exists
# purely to capture the script's output into a log file you can check
# without needing to watch it run live.
#
# Set up once via:
#   powershell -File scripts/setup-embedding-backfill-task.ps1
# Check progress any time via:
#   Get-Content scripts/backfill-log.txt -Tail 40
# Remove the scheduled task once the backfill finishes (it logs "Done."
# and does nothing on subsequent runs, but there's no need to keep it
# running after that):
#   Unregister-ScheduledTask -TaskName "GoA2 Discord Embedding Backfill" -Confirm:$false

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logFile = Join-Path $repoRoot "scripts\backfill-log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "`n=== Run started $timestamp ===" -Encoding utf8

# Captured as text and written with an explicit encoding rather than a
# raw `*>>` redirect — that produced UTF-16-garbled output (every other
# byte showing as a space) because PowerShell 5.1's native stream
# redirection doesn't consistently match node's own UTF-8 stdout.
$output = & node --env-file=.env.local scripts/backfill-discord-embeddings.mjs 2>&1 | Out-String
Add-Content -Path $logFile -Value $output.TrimEnd() -Encoding utf8

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "=== Run ended $timestamp ===" -Encoding utf8
