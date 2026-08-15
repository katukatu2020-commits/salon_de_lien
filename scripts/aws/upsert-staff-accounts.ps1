param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$Cluster = "salon-de-lien-staging-cluster",
  [string]$TaskDefinition = "salon-de-lien-staging-web:17"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

$staffJson = & node scripts/export-staff-account-payload.mjs
if ($LASTEXITCODE -ne 0 -or -not $staffJson) { throw "Failed to read local staff account hashes" }

$outputs = & aws cloudformation describe-stacks `
  --stack-name SalonDeLien-staging `
  --profile $Profile `
  --region $Region `
  --query 'Stacks[0].Outputs' `
  --output json `
  --no-cli-pager | ConvertFrom-Json

function Output-Value([string]$key) {
  return [string](($outputs | Where-Object OutputKey -eq $key | Select-Object -First 1).OutputValue)
}

$subnets = (Output-Value "ApplicationSubnetIds").Split(",")
$securityGroup = Output-Value "ApplicationSecurityGroupId"
$assignPublicIp = Output-Value "AssignPublicIp"
$overrides = @{
  containerOverrides = @(
    @{
      name = "Web"
      command = @("node", "scripts/upsert-staff-accounts.mjs")
      environment = @(@{ name = "STAFF_ACCOUNTS_JSON"; value = $staffJson })
    }
  )
} | ConvertTo-Json -Depth 8 -Compress

$overridePath = Join-Path ([IO.Path]::GetTempPath()) "lien-staff-$([Guid]::NewGuid().ToString('N')).json"
[IO.File]::WriteAllText($overridePath, $overrides, [Text.UTF8Encoding]::new($false))
$network = "awsvpcConfiguration={subnets=[$($subnets -join ',')],securityGroups=[$securityGroup],assignPublicIp=$assignPublicIp}"

try {
  $taskArn = (& aws ecs run-task `
    --cluster $Cluster `
    --task-definition $TaskDefinition `
    --launch-type FARGATE `
    --network-configuration $network `
    --overrides "file://$overridePath" `
    --profile $Profile `
    --region $Region `
    --query 'tasks[0].taskArn' `
    --output text `
    --no-cli-pager).Trim()
} finally {
  Remove-Item -LiteralPath $overridePath -Force -ErrorAction SilentlyContinue
  $staffJson = $null
}

if (-not $taskArn -or $taskArn -eq "None") { throw "Failed to start staff account task" }
& aws ecs wait tasks-stopped --cluster $Cluster --tasks $taskArn --profile $Profile --region $Region
$result = & aws ecs describe-tasks `
  --cluster $Cluster `
  --tasks $taskArn `
  --profile $Profile `
  --region $Region `
  --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' `
  --output json `
  --no-cli-pager | ConvertFrom-Json

if ($result.exitCode -ne 0) { throw "Staff account task failed: $($result.reason)" }
Write-Host "AWS staff accounts were updated successfully."
