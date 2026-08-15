param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$DatabaseDumpPath = "",
  [switch]$SkipRestore
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
Initialize-LienAwsCli

$outputs = (& aws cloudformation describe-stacks --stack-name SalonDeLien-staging --profile $Profile --region $Region --query 'Stacks[0].Outputs' --output json --no-cli-pager | ConvertFrom-Json)
function Output-Value([string]$Key) {
  $item = $outputs | Where-Object { $_.OutputKey -eq $Key } | Select-Object -First 1
  if (-not $item) { throw "Stack output not found: $Key" }
  return [string]$item.OutputValue
}

function Run-OneOffTask([string[]]$Command, [hashtable]$Environment = @{}) {
  $environmentOverrides = @()
  foreach ($entry in $Environment.GetEnumerator()) {
    $environmentOverrides += @{ name = [string]$entry.Key; value = [string]$entry.Value }
  }
  $overrides = @{
    containerOverrides = @(@{
      name = "Web"
      command = $Command
      environment = $environmentOverrides
    })
  } | ConvertTo-Json -Depth 8 -Compress
  $overridesPath = Join-Path ([IO.Path]::GetTempPath()) "lien-ecs-overrides-$([Guid]::NewGuid().ToString('N')).json"
  [IO.File]::WriteAllText($overridesPath, $overrides, [Text.UTF8Encoding]::new($false))
  $subnets = (Output-Value 'ApplicationSubnetIds').Split(',')
  $network = "awsvpcConfiguration={subnets=[$($subnets -join ',')],securityGroups=[$(Output-Value 'ApplicationSecurityGroupId')],assignPublicIp=$(Output-Value 'AssignPublicIp')}"
  try {
    $taskArn = (& aws ecs run-task --cluster (Output-Value 'ClusterName') --task-definition (Output-Value 'TaskDefinitionArn') --launch-type FARGATE --network-configuration $network --overrides "file://$overridesPath" --profile $Profile --region $Region --query 'tasks[0].taskArn' --output text --no-cli-pager).Trim()
  } finally {
    Remove-Item -LiteralPath $overridesPath -Force -ErrorAction SilentlyContinue
  }
  if ($LASTEXITCODE -ne 0 -or -not $taskArn -or $taskArn -eq 'None') { throw "Failed to start one-off ECS task" }
  Write-Host "Started one-off task: $taskArn"
  & aws ecs wait tasks-stopped --cluster (Output-Value 'ClusterName') --tasks $taskArn --profile $Profile --region $Region
  $result = (& aws ecs describe-tasks --cluster (Output-Value 'ClusterName') --tasks $taskArn --profile $Profile --region $Region --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' --output json --no-cli-pager | ConvertFrom-Json)
  if ($result.exitCode -ne 0) { throw "One-off ECS task failed: $($result.reason)" }
}

if (-not $SkipRestore) {
  if (-not $DatabaseDumpPath -or -not (Test-Path -LiteralPath $DatabaseDumpPath)) {
    throw "A valid DatabaseDumpPath is required unless SkipRestore is used."
  }
  $bucket = Output-Value 'PrivateAssetsBucket'
  $dumpHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DatabaseDumpPath).Hash.ToLowerInvariant()
  $dumpKey = "private/migrations/resume-$(Get-Date -Format 'yyyyMMddHHmmss')/salon-de-lien.dump"
  & aws s3 cp $DatabaseDumpPath "s3://$bucket/$dumpKey" --sse AES256 --profile $Profile --region $Region --no-progress
  if ($LASTEXITCODE -ne 0) { throw "Database dump upload failed" }
  Run-OneOffTask @('node', 'scripts/import-postgres-dump.mjs', "s3://$bucket/$dumpKey") @{
    ALLOW_DATABASE_RESTORE = 'true'
    DATABASE_DUMP_SHA256 = $dumpHash
  }
}

Run-OneOffTask @('npx', 'prisma', 'migrate', 'deploy')

$adminEmail = $env:LIEN_STAGING_ADMIN_EMAIL
$adminPasswordHash = $env:LIEN_STAGING_ADMIN_PASSWORD_HASH
if (-not $adminEmail -or -not $adminPasswordHash) {
  throw "Set LIEN_STAGING_ADMIN_EMAIL and LIEN_STAGING_ADMIN_PASSWORD_HASH before resuming."
}
$secretArn = Output-Value 'ApplicationSecretArn'
$secret = (& aws secretsmanager get-secret-value --secret-id $secretArn --profile $Profile --region $Region --query SecretString --output text --no-cli-pager | ConvertFrom-Json)
$secret.ADMIN_EMAIL = $adminEmail
$secret.ADMIN_PASSWORD_HASH = $adminPasswordHash
$secret.APP_URL = Output-Value 'LoadBalancerUrl'
$secretJson = $secret | ConvertTo-Json -Compress
$secretPath = Join-Path ([IO.Path]::GetTempPath()) "lien-app-secret-$([Guid]::NewGuid().ToString('N')).json"
[IO.File]::WriteAllText($secretPath, $secretJson, [Text.UTF8Encoding]::new($false))
try {
  & aws secretsmanager put-secret-value --secret-id $secretArn --secret-string "file://$secretPath" --profile $Profile --region $Region --no-cli-pager | Out-Null
} finally {
  Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue
}
if ($LASTEXITCODE -ne 0) { throw "Application secret update failed" }

& aws ecs update-service --cluster (Output-Value 'ClusterName') --service (Output-Value 'ServiceName') --desired-count 1 --force-new-deployment --profile $Profile --region $Region --no-cli-pager | Out-Null
if ($LASTEXITCODE -ne 0) { throw "ECS service start failed" }
& aws ecs wait services-stable --cluster (Output-Value 'ClusterName') --services (Output-Value 'ServiceName') --profile $Profile --region $Region
if ($LASTEXITCODE -ne 0) { throw "ECS service did not become stable" }

Write-Host "Staging resume completed."
Write-Host "Public URL: $(Output-Value 'LoadBalancerUrl')"
