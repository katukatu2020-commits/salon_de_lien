param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
Initialize-LienAwsCli

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command is not available: $Name"
  }
}

Require-Command "aws"
Require-Command "docker"
Require-Command "node"
Require-Command "npm.cmd"

$identityJson = & aws sts get-caller-identity --profile $Profile --region $Region --no-cli-pager
if ($LASTEXITCODE -ne 0) {
  throw "AWS authentication failed for profile '$Profile'. Run: aws login --profile $Profile --region $Region"
}
$identity = $identityJson | ConvertFrom-Json
$maskedAccount = $identity.Account.Substring(0, 4) + "********"

& docker version --format "{{.Server.Version}}" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop is not ready" }

& npm.cmd run infra:synth -- -c environment=staging -c desiredCount=0 -c imageTag=preflight -c region=$Region | Out-Null
if ($LASTEXITCODE -ne 0) { throw "CDK synth failed" }

Write-Host "AWS deployment preflight passed."
Write-Host "Account: $maskedAccount"
Write-Host "Region:  $Region"
Write-Host "Profile: $Profile"
