param()

$ErrorActionPreference = "Stop"

$Region = "ap-northeast-1"
$Registry = "009293460979.dkr.ecr.ap-northeast-1.amazonaws.com"
$Image = "$Registry/salon-de-lien-staging-app@sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI is required. Install it and authenticate account 009293460979 first."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop is required."
}

$password = aws ecr get-login-password --region $Region
if ($LASTEXITCODE -ne 0 -or -not $password) {
  throw "Failed to obtain an ECR login password. Re-authenticate AWS CLI and retry."
}
$password | docker login --username AWS --password-stdin $Registry
if ($LASTEXITCODE -ne 0) {
  throw "ECR login failed."
}

docker pull $Image
if ($LASTEXITCODE -ne 0) {
  throw "Failed to pull the approved AWS runtime image."
}

$actualDigest = (docker image inspect $Image --format "{{.Id}}").Trim()
if ($actualDigest -ne "sha256:c3862bee5b29d8e5bf015e617c8511b9907c7b612f996cb329b32a8fe6767286") {
  throw "Pulled image digest mismatch: $actualDigest"
}

Write-Host "AWS production runtime image is ready: $Image"
