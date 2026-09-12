param(
  [Parameter(Mandatory = $true)][string]$TaskDefinitionArn,
  [string]$Cluster = 'salon-de-lien-staging-cluster',
  [string]$Service = 'salon-de-lien-staging-web',
  [string]$Region = 'ap-northeast-1'
)

$ErrorActionPreference = 'Stop'
$serviceDescription = aws ecs describe-services `
  --cluster $Cluster `
  --services $Service `
  --region $Region `
  --output json `
  --no-cli-pager | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'The production service network could not be resolved.' }

$networkConfiguration = $serviceDescription.services[0].networkConfiguration
$code = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'production-audit.cjs')
$overrides = @{
  containerOverrides = @(@{
    name = 'Web'
    command = @('node', '-e', $code)
  })
}
$networkPath = Join-Path $env:RUNNER_TEMP 'customer-profile-name-fields-v636-network.json'
$overridesPath = Join-Path $env:RUNNER_TEMP 'customer-profile-name-fields-v636-overrides.json'
[IO.File]::WriteAllText($networkPath, ($networkConfiguration | ConvertTo-Json -Depth 20 -Compress), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($overridesPath, ($overrides | ConvertTo-Json -Depth 20 -Compress), [Text.UTF8Encoding]::new($false))

try {
  $taskArn = (aws ecs run-task `
    --cluster $Cluster `
    --task-definition $TaskDefinitionArn `
    --launch-type FARGATE `
    --network-configuration "file://$networkPath" `
    --overrides "file://$overridesPath" `
    --region $Region `
    --query 'tasks[0].taskArn' `
    --output text `
    --no-cli-pager).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $taskArn -or $taskArn -eq 'None') {
    throw 'The customer profile name audit task could not start.'
  }
} finally {
  Remove-Item -LiteralPath $networkPath,$overridesPath -Force -ErrorAction SilentlyContinue
}

aws ecs wait tasks-stopped --cluster $Cluster --tasks $taskArn --region $Region --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw 'The customer profile name audit did not finish.' }
$result = aws ecs describe-tasks `
  --cluster $Cluster `
  --tasks $taskArn `
  --region $Region `
  --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' `
  --output json `
  --no-cli-pager | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $result.exitCode -ne 0) {
  throw "The customer profile name audit failed: $($result.reason)"
}

Write-Output (@{ verified = $true; taskArn = $taskArn; exitCode = $result.exitCode } | ConvertTo-Json -Compress)
