param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$ExpectedDigest = "sha256:cbb0fa3c9a17400d9a43c4d47e8cd2769fd6da4ee56b694660f04b4e7f599eba"
$ExpectedTaskRevision = 418
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

$runtimeAssetPath = "/_next/static/chunks/app/admin/appointments/page-shift-staff-drop-v394.js"
$localRuntimeAsset = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port$runtimeAssetPath" -UseBasicParsing -TimeoutSec 10).Content
$awsRuntimeAsset = (Invoke-WebRequest -Uri "https://salon-de-lien.com$runtimeAssetPath" -UseBasicParsing -TimeoutSec 20).Content
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
  $localAssetDigest = ([BitConverter]::ToString($sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($localRuntimeAsset))) -replace '-', '').ToLowerInvariant()
  $sha256.Initialize()
  $awsAssetDigest = ([BitConverter]::ToString($sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($awsRuntimeAsset))) -replace '-', '').ToLowerInvariant()
}
finally {
  $sha256.Dispose()
}
if ($localAssetDigest -ne $awsAssetDigest) {
  throw "Frontend runtime mismatch. Local $localAssetDigest, AWS $awsAssetDigest."
}

[pscustomobject]@{
  Status = "MATCH"
  TaskDefinitionRevision = $ExpectedTaskRevision
  RuntimeDigest = $actualImage
  Live = $live.status
  Ready = $ready.status
  FrontendAssetDigest = $localAssetDigest
  Url = "http://localhost:$Port"
} | Format-List
