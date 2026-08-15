$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$containerName = "salon_de_lien_postgres"

if (-not (Test-Path -LiteralPath $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$container = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $containerName }
if (-not $container) {
  throw "PostgreSQL container '$containerName' is not running. Start Docker Desktop and run: docker compose up -d"
}

Write-Host "Restoring database from:"
Write-Host $BackupPath
Write-Host "This will replace current database contents."

docker cp $BackupPath "${containerName}:/tmp/salon_de_lien.restore.dump"
docker exec $containerName dropdb -U salon --if-exists salon_de_lien
docker exec $containerName createdb -U salon salon_de_lien
docker exec $containerName pg_restore -U salon -d salon_de_lien --clean --if-exists "/tmp/salon_de_lien.restore.dump"
docker exec $containerName rm -f "/tmp/salon_de_lien.restore.dump" | Out-Null

Write-Host "Database restore completed."

