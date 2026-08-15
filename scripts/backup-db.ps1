$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $repoRoot "backups\db"
$containerName = "salon_de_lien_postgres"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "salon_de_lien-$timestamp.dump"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$container = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $containerName }
if (-not $container) {
  throw "PostgreSQL container '$containerName' is not running. Start Docker Desktop and run: docker compose up -d"
}

docker exec $containerName pg_dump -U salon -d salon_de_lien -Fc -f "/tmp/salon_de_lien.dump"
docker cp "${containerName}:/tmp/salon_de_lien.dump" $backupPath
docker exec $containerName rm -f "/tmp/salon_de_lien.dump" | Out-Null

Write-Host "Database backup created:"
Write-Host $backupPath

