$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $repoRoot "next-production.log"
$npmPath = "C:\Program Files\nodejs\npm.cmd"
$buildIdPath = Join-Path $repoRoot ".next\BUILD_ID"

Set-Location -LiteralPath $repoRoot

if (-not (Test-Path -LiteralPath $buildIdPath)) {
  throw "Production build not found. Run npm.cmd run build first."
}

$env:HOSTNAME = "0.0.0.0"
$env:PORT = "3000"

Write-Host "Starting Salon de Lien on http://0.0.0.0:3000"
Write-Host "Log: $logPath"

& $npmPath run start -- -H 0.0.0.0 -p 3000 *>> $logPath
