param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$ExpectedDigest = "sha256:fc7aec2a6862f56b08739e16d8cc13b17cc4c400c16c234867e739edbb778d04"
$ExpectedTaskRevision = 265
$ContainerName = "salon_de_lien_aws_parity"

$container = docker inspect $ContainerName 2>$null | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $container) {
  throw "Parity container '$ContainerName' is not running. Run npm run local:aws-up first."
}

$actualImage = $container[0].Image
$running = $container[0].State.Running
if (-not $running) {
  throw "Parity container is not running."
}
if ($actualImage -ne $ExpectedDigest) {
  throw "Runtime mismatch. Expected $ExpectedDigest, got $actualImage."
}

$live = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health/live" -TimeoutSec 10
$ready = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health/ready" -TimeoutSec 10
if (-not $live.ok -or -not $ready.ok) {
  throw "Health verification failed."
}

$databaseUrl = "postgresql://salon:salon_password@localhost:5432/salon_de_lien?schema=public"
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $databaseUrl
  & npx.cmd prisma migrate status
  if ($LASTEXITCODE -ne 0) {
    throw "Prisma migration status failed."
  }
}
finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}

[pscustomobject]@{
  Status = "MATCH"
  TaskDefinitionRevision = $ExpectedTaskRevision
  RuntimeDigest = $actualImage
  Live = $live.status
  Ready = $ready.status
  Url = "http://localhost:$Port"
} | Format-List
