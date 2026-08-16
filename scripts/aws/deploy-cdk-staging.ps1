param(
  [string]$Profile = "",
  [string]$Region = "ap-northeast-1"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli
Assert-LienApprovedAutomationContext -Action "CDK staging deployment" -Profile $Profile -Region $Region

& npx.cmd cdk --app "npx tsx infrastructure/bin/app.ts" deploy SalonDeLien-staging --require-approval broadening
if ($LASTEXITCODE -ne 0) { throw "CDK deployment failed." }
